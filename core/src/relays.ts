import type { SupabaseClient } from "@supabase/supabase-js";
import { newRistSecret, newStreamIds, type StreamIds } from "./ids.ts";
import { hashKey, keyHashes, type Sealer, type SecretKeys } from "./keys.ts";
import { allowedRelayIds, limitsOf, planOf, roomFor, type Account } from "./plans.ts";
import type { Sls } from "./sls.ts";

// Relais : table Supabase `relays` (écrite par le Core seulement) + paires déclarées dans le SLS.
// Chaque compte crée ses relais (SRTLA ou RTMP). Un relais RTMP a aussi sa paire SLS : MediaMTX reçoit le RTMP
// et le Core le republie en SRT sur publish_id (voir rtmp.ts). OBS lit donc toujours en SRT, quel que soit le protocole.
//
// Sécurité des clés (migration 0010) :
// - deux clés distinctes par relais, 128 bits aléatoires chacune (ids.ts) : publish_id (Moblin, DJI, encodeur) et
//   play_id (OBS), aucune ne se déduit de l'autre ;
// - en base : empreintes SHA-256 (colonnes UNIQUE) + clés chiffrées en AES-256-GCM (keys_enc), jamais en clair ;
// - le SLS ne connaît que les paires des relais AUTORISÉS (compte actif, formule avec relais, non archivé, dans le quota) :
//   il refuse lui-même toute autre clé. Le Core réaligne le SLS toutes les 30 s et à chaque connexion d'un publieur.

export type Mode = "direct" | "regie";
export type Protocol = "srtla" | "rtmp" | "rist";
export type SwitchTrigger = "cut" | "cut_lowbitrate" | "sensitive";
export const SWITCH_TRIGGERS: SwitchTrigger[] = ["cut", "cut_lowbitrate", "sensitive"];
export type Relay = StreamIds & {
  id: string;
  user_id: string;
  name: string;
  protocol: Protocol;
  server: string;
  cam_key: string | null;
  /** Relais RIST : port UDP du Core (en clair en base) et secret AES (chiffré avec les clés). */
  rist_port?: number | null;
  rist_secret?: string | null;
  mode: Mode;
  /** Enregistrer le flux sur le serveur (quota par compte, voir recordings.ts). */
  record?: boolean;
  /** Format des fichiers enregistrés : MOV par défaut, MP4 au choix. */
  record_format?: "mov" | "mp4";
  /** Déclenchement de la bascule automatique (migration 0043). */
  switch_trigger?: SwitchTrigger;
  status: "live" | "offline";
  archived: boolean;
  created_at: string;
  rotated_at: string | null;
  last_live_at: string | null;
};

/** Ligne de la table (clés chiffrées). Les colonnes en clair n'existent que sur une base pas encore migrée. */
type Row = Omit<Relay, keyof StreamIds | "cam_key" | "rist_secret"> & { keys_enc: string | null } & Partial<SecretKeys>;

export class QuotaError extends Error {}
/** Plus aucun port RIST libre dans la plage du serveur. */
export class PortsError extends Error {}
/** Compte suspendu ou formule sans relais. */
export class ForbiddenError extends Error {}

const UNIQUE_VIOLATION = "23505";
const PUBLIC_COLUMNS = "id, user_id, name, protocol, server, mode, record, record_format, switch_trigger, status, archived, created_at, rotated_at, last_live_at, rist_port, keys_enc";

/** Paire du relais créée par SYXTEE et sans relais autorisé correspondant. */
export function orphanPair(p: { player: string; description?: string }, known: Set<string>) {
  return /^syxtee(-regie)?:/.test(p.description ?? "") && !known.has(p.player);
}

export function createRelayStore(
  db: SupabaseClient,
  sls: Sls,
  server: string,
  o: {
    sealer: Sealer;
    /** Clés de publication retirées du SLS (rotation, archivage, suppression, compte refusé) : couper les sessions en cours. */
    onRevoked?: (publishKeys: string[]) => void;
    log?: (m: string) => void;
    /** Plage des ports UDP RIST attribués aux relais (un port par relais). */
    ristPorts?: { min: number; max: number };
    /** Générateur de clés (remplaçable dans les tests). */
    newIds?: () => StreamIds;
  },
) {
  const table = () => db.from("relays");
  const log = o.log ?? (() => {});

  function decode(row: Row): Relay {
    if (!row.keys_enc && !row.publish_id) throw new Error(`relais ${row.id} : clés absentes (migration 0010 non terminée)`);
    const k: SecretKeys = row.keys_enc
      ? o.sealer.open(row.keys_enc)
      : { publish_id: row.publish_id!, play_id: row.play_id!, out_publish_id: row.out_publish_id!, out_play_id: row.out_play_id!, cam_key: row.cam_key ?? null };
    const { keys_enc: _enc, ...rest } = row;
    return { ...rest, publish_id: k.publish_id, play_id: k.play_id, out_publish_id: k.out_publish_id, out_play_id: k.out_play_id, cam_key: k.cam_key ?? null, rist_secret: k.rist_secret ?? null } as Relay;
  }
  const encode = (k: SecretKeys) => ({ ...keyHashes(k), keys_enc: o.sealer.seal(k) });
  const secrets = (r: StreamIds & { cam_key?: string | null; rist_secret?: string | null }): SecretKeys => ({
    publish_id: r.publish_id,
    play_id: r.play_id,
    out_publish_id: r.out_publish_id,
    out_play_id: r.out_play_id,
    cam_key: r.cam_key ?? null,
    rist_secret: r.rist_secret ?? null,
  });

  async function get(id: string): Promise<Relay | null> {
    const { data, error } = await table().select(PUBLIC_COLUMNS).eq("id", id).maybeSingle();
    if (error) throw new Error(`relays : ${error.message}`);
    return data ? decode(data as unknown as Row) : null;
  }

  async function update(id: string, patch: Record<string, unknown>): Promise<Relay> {
    const { data, error } = await table().update(patch).eq("id", id).select(PUBLIC_COLUMNS).single();
    if (error) throw Object.assign(new Error(`relays update : ${error.message}`), { code: error.code });
    return decode(data as unknown as Row);
  }

  async function account(userId: string): Promise<Account | null> {
    const { data, error } = await db.from("profiles").select("plan, plan_until, suspended_at").eq("id", userId).maybeSingle();
    if (error) throw new Error(`profiles : ${error.message}`);
    return data ? toAccount(data) : null;
  }

  async function register(r: Pick<Relay, "id" | "user_id">, ids: StreamIds) {
    await sls.addStreamId(ids.publish_id, ids.play_id, `syxtee:${r.user_id}:${r.id}`);
    try {
      await sls.addStreamId(ids.out_publish_id, ids.out_play_id, `syxtee-regie:${r.user_id}:${r.id}`);
    } catch (e) {
      await sls.deleteStreamId(ids.play_id).catch(() => {});
      throw e;
    }
  }

  async function unregister(ids: StreamIds) {
    await sls.deleteStreamId(ids.play_id);
    await sls.deleteStreamId(ids.out_play_id);
    o.onRevoked?.([ids.publish_id, ids.out_publish_id]);
  }

  async function list(userId: string): Promise<Relay[]> {
    const { data, error } = await table().select(PUBLIC_COLUMNS).eq("user_id", userId).order("created_at");
    if (error) throw new Error(`relays : ${error.message}`);
    return ((data ?? []) as unknown as Row[]).map(decode);
  }

  /** Relais actifs (non archivés) de ce serveur. */
  async function active(): Promise<Relay[]> {
    const { data, error } = await table().select(PUBLIC_COLUMNS).eq("server", server).eq("archived", false);
    if (error) throw new Error(`relays : ${error.message}`);
    return ((data ?? []) as unknown as Row[]).map(decode);
  }

  /** Relais actifs ET autorisés à diffuser (compte, formule, quota). */
  async function allowed(): Promise<Relay[]> {
    const rows = await active();
    const users = [...new Set(rows.map((r) => r.user_id))];
    const accounts = new Map<string, Account>();
    for (let i = 0; i < users.length; i += 200) {
      const { data, error } = await db.from("profiles").select("id, plan, plan_until, suspended_at").in("id", users.slice(i, i + 200));
      if (error) throw new Error(`profiles : ${error.message}`);
      for (const p of data ?? []) accounts.set(p.id as string, toAccount(p));
    }
    const ok = new Set<string>();
    for (const u of users) for (const id of allowedRelayIds(accounts.get(u) ?? null, rows.filter((r) => r.user_id === u))) ok.add(id);
    return rows.filter((r) => ok.has(r.id));
  }

  /** Relais actifs d'un compte : au total, et du protocole donné. */
  async function activeCounts(userId: string, protocol: Protocol) {
    const { data, error } = await table().select("protocol").eq("user_id", userId).eq("archived", false);
    if (error) throw new Error(`relays : ${error.message}`);
    const rows = (data ?? []) as { protocol: string }[];
    return { total: rows.length, sameProtocol: rows.filter((x) => x.protocol === protocol).length };
  }

  /** Nouvelles clés, avec une nouvelle génération si une empreinte existe déjà (contrainte UNIQUE). */
  async function withFreshKeys<T>(fn: (ids: StreamIds) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn((o.newIds ?? newStreamIds)());
      } catch (e) {
        if ((e as { code?: string }).code !== UNIQUE_VIOLATION || attempt >= 4) throw e;
        log("collision de clé (UNIQUE) : nouvelle génération");
      }
    }
  }

  /** Port UDP RIST libre, tiré au hasard dans la plage (le port n'est pas un secret, mais il n'est pas devinable pour autant). */
  async function freeRistPort(): Promise<number> {
    const range = o.ristPorts;
    if (!range) throw new PortsError("ports");
    const { data, error } = await table().select("rist_port").eq("server", server).not("rist_port", "is", null);
    if (error) throw new Error(`relays : ${error.message}`);
    const used = new Set((data ?? []).map((x) => (x as { rist_port: number }).rist_port));
    const total = range.max - range.min + 1;
    if (used.size >= total) throw new PortsError("ports");
    for (let i = 0; i < 50; i++) {
      const p = range.min + Math.floor(Math.random() * total);
      if (!used.has(p)) return p;
    }
    for (let p = range.min; p <= range.max; p++) if (!used.has(p)) return p;
    throw new PortsError("ports");
  }

  return {
    get,
    list,
    account,
    allowed,

    /** Nouveau relais : SLS d'abord, puis base (annulation si la base échoue). `limit` = relais actifs max. */
    async create(userId: string, p: { name: string; protocol: Protocol; limit: number }): Promise<Relay> {
      const acc = await account(userId);
      if (!acc || acc.suspended) throw new ForbiddenError("account");
      const limits = limitsOf(planOf(acc));
      const limit = Math.min(p.limit, limits.maxRelays);
      if (limit <= 0) throw new ForbiddenError("plan");
      if (!roomFor({ ...limits, maxRelays: limit }, await activeCounts(userId, p.protocol))) throw new QuotaError("quota");
      const id = crypto.randomUUID();
      return withFreshKeys(async (ids) => {
        const rist = p.protocol === "rist" ? { port: await freeRistPort(), secret: newRistSecret() } : null;
        await register({ id, user_id: userId }, ids);
        const { data, error } = await table()
          .insert({ id, user_id: userId, name: p.name, protocol: p.protocol, server, rist_port: rist?.port ?? null, ...encode({ ...secrets(ids), rist_secret: rist?.secret ?? null }) })
          .select(PUBLIC_COLUMNS)
          .single();
        if (error) {
          await sls.deleteStreamId(ids.play_id).catch(() => {});
          await sls.deleteStreamId(ids.out_play_id).catch(() => {});
          throw Object.assign(new Error(`relays insert : ${error.message}`), { code: error.code });
        }
        return decode(data as unknown as Row);
      });
    },

    /** Nouvelle paire ; l'ancienne est retirée du SLS et ses sessions en cours sont coupées. */
    async rotate(r: Relay): Promise<Relay> {
      const fresh = await withFreshKeys(async (ids) => {
        if (!r.archived) await register(r, ids);
        try {
          return await update(r.id, { ...encode({ ...secrets(ids), cam_key: r.cam_key, rist_secret: r.protocol === "rist" ? newRistSecret() : null }), rotated_at: new Date().toISOString() });
        } catch (e) {
          if (!r.archived) {
            await sls.deleteStreamId(ids.play_id).catch(() => {});
            await sls.deleteStreamId(ids.out_play_id).catch(() => {});
          }
          throw e;
        }
      });
      if (!r.archived) await unregister(r);
      return fresh;
    },

    /** Clé caméra (SYXTEE Cam) : rechiffre les clés du relais. `onlyIfMissing` : ne remplace pas une clé existante. */
    async setCamKey(r: Relay, camKey: string, onlyIfMissing: boolean): Promise<Relay> {
      const q = table().update(encode({ ...secrets(r), cam_key: camKey })).eq("id", r.id);
      const { data, error } = await (onlyIfMissing ? q.is("cam_hash", null) : q).select(PUBLIC_COLUMNS).maybeSingle();
      if (error) throw new Error(`cam_key : ${error.message}`);
      return data ? decode(data as unknown as Row) : (await get(r.id))!;
    },

    /**
     * Change le relais de serveur sans le recréer : même id, mêmes clés, mêmes URLs (seul le serveur qui répond change).
     * Ce Core retire la paire du SLS s'il quitte ce serveur, la déclare s'il l'accueille ; l'autre Core se réaligne
     * tout seul (reconcile). Le port RIST est propre à chaque serveur : repris ici, ou attribué par le Core d'arrivée.
     */
    async move(r: Relay, target: string): Promise<Relay> {
      if (r.server === target) return r;
      const leaves = r.server === server && !r.archived;
      const arrives = target === server && !r.archived;
      const rist = r.protocol === "rist" ? { rist_port: target === server ? await freeRistPort() : null } : {};
      if (arrives) await register(r, r);
      let moved: Relay;
      try {
        moved = await update(r.id, { server: target, ...rist, ...(leaves ? { status: "offline" } : {}) });
      } catch (e) {
        if (arrives) await unregister(r).catch(() => {});
        throw e;
      }
      if (leaves) await unregister(r).catch((e) => log(`déplacement ${r.id.slice(0, 8)} : retrait du SLS à refaire (${(e as Error).message})`));
      return moved;
    },

    rename: (r: Relay, name: string) => update(r.id, { name }),
    setMode: (r: Relay, mode: Mode) => update(r.id, { mode }),
    setRecord: (r: Relay, record: boolean) => update(r.id, { record }),
    setRecordFormat: (r: Relay, record_format: "mov" | "mp4") => update(r.id, { record_format }),
    setSwitchTrigger: (r: Relay, switch_trigger: SwitchTrigger) => update(r.id, { switch_trigger }),

    /** Archiver retire la paire du SLS (sessions coupées) ; réactiver la redéclare (dans la limite de la formule). */
    async setArchived(r: Relay, archived: boolean, limit: number): Promise<Relay> {
      if (r.archived === archived) return r;
      if (archived) {
        await unregister(r);
        return update(r.id, { archived: true, status: "offline" });
      }
      const acc = await account(r.user_id);
      if (!acc || acc.suspended) throw new ForbiddenError("account");
      const limits = limitsOf(planOf(acc));
      if (!roomFor({ ...limits, maxRelays: Math.min(limit, limits.maxRelays) }, await activeCounts(r.user_id, r.protocol))) throw new QuotaError("quota");
      await register(r, r);
      try {
        return await update(r.id, { archived: false });
      } catch (e) {
        await unregister(r).catch(() => {});
        throw e;
      }
    },

    /** Supprime un relais : retiré du relais (ses URLs cessent de marcher, sessions coupées), puis effacé de la base. */
    async remove(r: Relay) {
      if (!r.archived) await unregister(r);
      const { error } = await table().delete().eq("id", r.id);
      if (error) throw new Error(`relays delete : ${error.message}`);
    },

    /** Compte supprimé : tous ses relais. Renvoie leur nombre. */
    async removeAll(userId: string): Promise<number> {
      const rows = await list(userId);
      for (const r of rows) await this.remove(r);
      return rows.length;
    },

    /** Statut en direct (liste du dashboard) ; last_live_at posé à chaque passage en ligne. */
    async setStatus(id: string, live: boolean) {
      const patch = live ? { status: "live", last_live_at: new Date().toISOString() } : { status: "offline" };
      const { error } = await table().update(patch).eq("id", id);
      if (error) throw new Error(`relays statut : ${error.message}`);
    },

    /** Démarrage du Core : personne n'est encore en ligne sur ce serveur. */
    async resetStatus() {
      await table().update({ status: "offline" }).eq("server", server).eq("status", "live");
    },

    /**
     * Aligne le SLS sur la base : paires des relais autorisés déclarées, toute autre paire SYXTEE retirée
     * (compte supprimé ou suspendu, formule gratuite, quota dépassé, relais archivé, échec réseau…) et ses sessions coupées.
     * Les paires créées à la main dans l'interface du relais (autre description) ne sont jamais touchées.
     * Renvoie les relais autorisés (santé, aperçus, régie, Cam, RTMP).
     */
    async reconcile(): Promise<{ relays: Relay[]; added: number; removed: number }> {
      const ok = await allowed(); // base illisible : exception, on ne retire rien
      // Relais RIST arrivé d'un autre serveur : il n'a pas encore de port sur celui-ci.
      for (let i = 0; i < ok.length; i++) {
        const r = ok[i]!;
        if (r.protocol === "rist" && !r.rist_port && o.ristPorts) ok[i] = await update(r.id, { rist_port: await freeRistPort() }).catch(() => r);
      }
      const want = new Map<string, { r: Relay; publisher: string; regie: boolean }>();
      for (const r of ok) {
        want.set(r.play_id, { r, publisher: r.publish_id, regie: false });
        want.set(r.out_play_id, { r, publisher: r.out_publish_id, regie: true });
      }
      const pairs = await sls.listStreamIds();
      const have = new Map(pairs.map((p) => [p.player, p]));
      let removed = 0;
      let added = 0;
      for (const p of pairs) {
        const w = want.get(p.player);
        if (orphanPair(p, new Set(want.keys())) || (w && w.publisher !== p.publisher)) {
          await sls.deleteStreamId(p.player);
          o.onRevoked?.([p.publisher]);
          have.delete(p.player);
          removed++;
        }
      }
      for (const [player, w] of want) {
        if (have.has(player)) continue;
        await sls.addStreamId(w.publisher, player, `${w.regie ? "syxtee-regie" : "syxtee"}:${w.r.user_id}:${w.r.id}`);
        added++;
      }
      return { relays: ok, added, removed };
    },

    /** Base pas encore migrée (0010) : chiffre les clés restées en clair et pose leurs empreintes. */
    async encryptLegacy(): Promise<number> {
      const { data, error } = await table().select("*").is("keys_enc", null);
      if (error) throw new Error(`relays : ${error.message}`);
      let n = 0;
      for (const row of (data ?? []) as Row[]) {
        if (!row.publish_id) continue;
        const k = secrets({ ...(row as unknown as StreamIds), cam_key: row.cam_key ?? null });
        await update(row.id, { ...encode(k), publish_id: null, play_id: null, out_publish_id: null, out_play_id: null, cam_key: null });
        n++;
      }
      return n;
    },

    /** Relais autorisé qui porte cette clé de publication (recherche par empreinte). */
    async byPublishKey(key: string): Promise<Relay | null> {
      const { data } = await table().select(PUBLIC_COLUMNS).eq("publish_hash", hashKey(key)).maybeSingle();
      return data ? decode(data as unknown as Row) : null;
    },

    /** Relais qui porte cette clé caméra (recherche par empreinte). */
    async byCamKey(key: string): Promise<Relay | null> {
      const { data } = await table().select(PUBLIC_COLUMNS).eq("cam_hash", hashKey(key)).eq("archived", false).maybeSingle();
      return data ? decode(data as unknown as Row) : null;
    },

    /** Nom affiché sur la mire (SOURCE) : chaîne Twitch, sinon « Prénom N. ». */
    async username(userId: string): Promise<string> {
      const { data } = await db.from("profiles").select("username, first_name, last_name, twitch_display_name").eq("id", userId).maybeSingle();
      return publicName(data as NameRow | null) ?? "streamer";
    },
  };
}

export type RelayStore = ReturnType<typeof createRelayStore>;

type NameRow = { username?: string | null; first_name?: string | null; last_name?: string | null; twitch_display_name?: string | null };

/** Nom public d'un compte : chaîne Twitch si liée, sinon « Prénom N. », sinon l'ancien pseudo. */
export function publicName(p: NameRow | null | undefined): string | null {
  const twitch = p?.twitch_display_name?.trim();
  if (twitch) return twitch;
  const first = p?.first_name?.trim();
  const last = p?.last_name?.trim();
  if (first) return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
  return p?.username ?? null;
}

/** Ligne profiles → compte (formule, échéance, suspension). */
function toAccount(p: Record<string, unknown>): Account {
  return { plan: (p.plan as string | null) ?? null, suspended: !!p.suspended_at, until: (p.plan_until as string | null) ?? null };
}
