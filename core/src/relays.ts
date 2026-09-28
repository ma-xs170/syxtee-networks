import type { SupabaseClient } from "@supabase/supabase-js";
import { newStreamIds, type StreamIds } from "./ids.ts";
import type { Sls } from "./sls.ts";

// Relais : table Supabase `relays` (écrite par le Core seulement) + paires déclarées dans le SLS.
// Chaque compte crée ses relais (SRTLA ou RTMP). Un relais RTMP a aussi sa paire SLS : MediaMTX reçoit le RTMP
// et le Core le republie en SRT sur publish_id (voir rtmp.ts). OBS lit donc toujours en SRT, quel que soit le protocole.
// Un relais archivé est retiré du SLS : ses URLs cessent de marcher jusqu'à sa réactivation.

export type Mode = "direct" | "regie";
export type Protocol = "srtla" | "rtmp";
export type Relay = StreamIds & {
  id: string;
  user_id: string;
  name: string;
  protocol: Protocol;
  server: string;
  cam_key: string | null;
  mode: Mode;
  status: "live" | "offline";
  archived: boolean;
  created_at: string;
  rotated_at: string | null;
  last_live_at: string | null;
};

export class QuotaError extends Error {}

/** Paire du relais créée par SYXTEE et sans relais actif correspondant en base. */
export function orphanPair(p: { player: string; description?: string }, known: Set<string>) {
  return /^syxtee(-regie)?:/.test(p.description ?? "") && !known.has(p.player);
}

export function createRelayStore(db: SupabaseClient, sls: Sls, server: string) {
  const table = () => db.from("relays");

  async function get(id: string): Promise<Relay | null> {
    const { data, error } = await table().select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`relays : ${error.message}`);
    return (data as Relay | null) ?? null;
  }

  async function update(id: string, patch: Partial<Relay>): Promise<Relay> {
    const { data, error } = await table().update(patch).eq("id", id).select("*").single();
    if (error) throw new Error(`relays update : ${error.message}`);
    return data as Relay;
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
  }

  return {
    get,

    /** Relais d'un compte, archivés compris, du plus ancien au plus récent. */
    async list(userId: string): Promise<Relay[]> {
      const { data, error } = await table().select("*").eq("user_id", userId).order("created_at");
      if (error) throw new Error(`relays : ${error.message}`);
      return (data ?? []) as Relay[];
    },

    /** Nouveau relais : SLS d'abord, puis base (annulation si la base échoue). `limit` = relais actifs max. */
    async create(userId: string, o: { name: string; protocol: Protocol; limit: number }): Promise<Relay> {
      const { count, error: countError } = await table().select("id", { count: "exact", head: true }).eq("user_id", userId).eq("archived", false);
      if (countError) throw new Error(`relays : ${countError.message}`);
      if ((count ?? 0) >= o.limit) throw new QuotaError("quota");
      const id = crypto.randomUUID();
      const ids = newStreamIds();
      await register({ id, user_id: userId }, ids);
      const { data, error } = await table().insert({ id, user_id: userId, name: o.name, protocol: o.protocol, server, ...ids }).select("*").single();
      if (error) {
        await unregister(ids).catch(() => {});
        throw new Error(`relays insert : ${error.message}`);
      }
      return data as Relay;
    },

    /** Nouvelle paire ; l'ancienne est retirée du SLS (l'encodeur et OBS devront recoller les URLs). */
    async rotate(r: Relay): Promise<Relay> {
      const ids = newStreamIds();
      if (!r.archived) await register(r, ids);
      let fresh: Relay;
      try {
        fresh = await update(r.id, { ...ids, rotated_at: new Date().toISOString() });
      } catch (e) {
        if (!r.archived) await unregister(ids).catch(() => {});
        throw e;
      }
      if (!r.archived) await unregister(r);
      return fresh;
    },

    rename: (r: Relay, name: string) => update(r.id, { name }),
    setMode: (r: Relay, mode: Mode) => update(r.id, { mode }),

    /** Archiver retire la paire du SLS ; réactiver la redéclare (dans la limite de la formule). */
    async setArchived(r: Relay, archived: boolean, limit: number): Promise<Relay> {
      if (r.archived === archived) return r;
      if (archived) {
        await unregister(r);
        return update(r.id, { archived: true, status: "offline" });
      }
      const { count } = await table().select("id", { count: "exact", head: true }).eq("user_id", r.user_id).eq("archived", false);
      if ((count ?? 0) >= limit) throw new QuotaError("quota");
      await register(r, r);
      try {
        return await update(r.id, { archived: false });
      } catch (e) {
        await unregister(r).catch(() => {});
        throw e;
      }
    },

    /** Supprime un relais : retiré du relais (ses URLs cessent de marcher), puis effacé de la base. */
    async remove(r: Relay) {
      if (!r.archived) await unregister(r);
      const { error } = await table().delete().eq("id", r.id);
      if (error) throw new Error(`relays delete : ${error.message}`);
    },

    /** Compte supprimé : tous ses relais. Renvoie leur nombre. */
    async removeAll(userId: string): Promise<number> {
      const rows = await this.list(userId);
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
     * Filet de sécurité : retire du SLS les paires SYXTEE (description « syxtee… ») qui ne correspondent plus
     * à aucun relais actif (compte supprimé, relais archivé, échec réseau…). Les paires créées à la main
     * dans l'interface du relais (autre description) ne sont jamais touchées.
     */
    async cleanupOrphans(): Promise<string[]> {
      const { data, error } = await table().select("play_id, out_play_id").eq("server", server).eq("archived", false);
      if (error) throw new Error(`relays : ${error.message}`); // base illisible : on ne retire rien
      const rows = (data ?? []) as { play_id: string; out_play_id: string }[];
      const known = new Set(rows.flatMap((r) => [r.play_id, r.out_play_id]));
      const orphans = (await sls.listStreamIds()).filter((p) => orphanPair(p, known)).map((p) => p.player);
      for (const player of orphans) await sls.deleteStreamId(player);
      return orphans;
    },

    /** Relais actifs de ce serveur (santé, aperçus, régie, Cam, RTMP). */
    async all(): Promise<Relay[]> {
      const { data, error } = await table().select("*").eq("server", server).eq("archived", false);
      if (error) throw new Error(`relays : ${error.message}`);
      return (data ?? []) as Relay[];
    },

    /** Pseudo affiché sur la mire. */
    async username(userId: string): Promise<string> {
      const { data } = await db.from("profiles").select("username").eq("id", userId).maybeSingle();
      return (data?.username as string | undefined) ?? "streamer";
    },
  };
}

export type RelayStore = ReturnType<typeof createRelayStore>;
