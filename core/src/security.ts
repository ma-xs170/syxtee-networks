import { isIP } from "node:net";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Relay } from "./relays.ts";
import type { SlsEvent } from "./sls-log.ts";

// Sécurité du relais, côté Core (décisions) ; le Guard (guard.ts) applique les coupures et bannissements.
// - Refus (clé inconnue, clé de lecture sur l'entrée de publication…) : journalisés ; 10 refus en 1 min pour une IP
//   → IP bannie 15 min (SRT/SRTLA par le Guard, RTMP et Cam par le Core).
// - 2e appareil sur une clé déjà en direct : refusé par le SLS (ou MediaMTX), le propriétaire est alerté
//   (« Tentative de connexion sur ton relais depuis <IP / pays> »), une alerte par relais toutes les 10 min au plus.
// - Publieur accepté par le SLS : le Core revérifie en base (compte, formule, quota de relais, flux simultanés).
// - Clé retirée (régénération, archivage…) : toutes les sessions de cette clé sont coupées.
// Les IP internes (srtla_rec en 127.0.0.1, le Core via la passerelle Docker) ne sont jamais comptées ni bannies :
// via SRTLA, le SLS ne voit pas l'IP du téléphone.

export type Protocol = "srt" | "srtla" | "rtmp" | "cam";
export type EventKind = "refused" | "duplicate" | "denied" | "banned" | "unbanned" | "kicked";
export type SecurityEvent = {
  at: string;
  kind: EventKind;
  protocol: Protocol | null;
  ip: string | null;
  country: string | null;
  relay_id: string | null;
  user_id: string | null;
  detail: Record<string, unknown>;
};
export type Ban = { ip: string; until: string; reason: string; auto: boolean; created_at?: string };

export type SecurityDb = {
  insert(rows: SecurityEvent[]): Promise<void>;
  loadBans(): Promise<Ban[]>;
  saveBan(b: Ban): Promise<void>;
  deleteBan(ip: string): Promise<void>;
  recent(limit: number): Promise<SecurityEvent[]>;
  alerts(userId: string, since: string): Promise<SecurityEvent[]>;
  /** Compte supprimé : ses alertes sont effacées. */
  forget(userId: string): Promise<void>;
};

export type Guard = {
  kick(targets: { ip: string; port: number }[], seconds?: number): Promise<void>;
  ban(ip: string, seconds: number): Promise<void>;
  unban(ip: string): Promise<void>;
};

/** Adresses internes : jamais comptées ni bannies (srtla_rec, Core, réseau Docker, le serveur lui-même). */
export function isInternal(ip: string, extra: string[] = []) {
  if (extra.includes(ip)) return true;
  if (ip === "::1" || /^127\./.test(ip)) return true;
  if (/^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  return /^f[cd]/i.test(ip) || /^fe80:/i.test(ip);
}

/** Aperçu d'une clé pour le journal : jamais la clé entière (une faute de frappe peut être une vraie clé). */
export const keyHint = (k: string) => (k ? `${k.slice(0, Math.min(k.indexOf("_") + 5, 12))}…` : "(vide)");

type Conn = { ip: string; port: number; role: "publisher" | "player"; ptr?: string; at: number };

export function createSecurity(o: {
  db: SecurityDb;
  guard: Guard | null;
  country?: (ip: string) => string | null;
  /** Revérifie en base qu'un publieur accepté par le SLS a le droit de diffuser (null = oui, sinon la raison). */
  checkPublisher: (relay: Relay) => Promise<string | null>;
  /** Un relais n'a plus le droit de diffuser : réaligner le SLS (retire la paire). */
  onDenied?: (relay: Relay, reason: string) => void;
  log: (m: string) => void;
  allowIps?: string[];
  maxFails?: number;
  windowMs?: number;
  banMinutes?: number;
  alertEveryMs?: number;
  now?: () => number;
}) {
  const now = o.now ?? Date.now;
  const maxFails = o.maxFails ?? 10;
  const windowMs = o.windowMs ?? 60_000;
  const banMinutes = o.banMinutes ?? 15;
  const alertEveryMs = o.alertEveryMs ?? 10 * 60_000;
  const internal = (ip: string) => isInternal(ip, o.allowIps);

  let byPublish = new Map<string, Relay>(); // clé de publication (directe ou régie) → relais autorisé
  let byPlay = new Map<string, Relay>(); // clé de lecture → relais
  const conns = new Map<string, Conn[]>(); // clé de publication → connexions en cours (publieur, lecteurs)
  const fails = new Map<string, number[]>(); // IP → horodatages des refus récents
  const bans = new Map<string, Ban>();
  const lastAlert = new Map<string, number>(); // relais → dernière alerte
  const dupes = new Map<string, number[]>(); // clé → tentatives de 2e appareil récentes
  let pending: SecurityEvent[] = [];
  let failures = 0;

  function record(e: Omit<SecurityEvent, "at" | "country"> & { country?: string | null }) {
    const ev: SecurityEvent = { at: new Date(now()).toISOString(), ...e, country: e.country ?? (e.ip ? (o.country?.(e.ip) ?? null) : null) };
    pending.push(ev);
    if (pending.length > 5000) pending = pending.slice(-5000);
    return ev;
  }

  const isBanned = (ip: string | null | undefined) => {
    if (!ip) return false;
    const b = bans.get(ip.replace(/^::ffff:/, ""));
    return !!b && Date.parse(b.until) > now();
  };

  async function ban(ip: string, minutes: number, reason: string, auto: boolean) {
    if (!isIP(ip)) throw new Error("IP invalide");
    if (internal(ip)) throw new Error("IP interne : jamais bannie");
    const b: Ban = { ip, until: new Date(now() + minutes * 60_000).toISOString(), reason, auto };
    bans.set(ip, b);
    record({ kind: "banned", protocol: null, ip, relay_id: null, user_id: null, detail: { minutes, reason, auto } });
    o.log(`IP ${ip} bannie ${minutes} min (${reason})`);
    await o.db.saveBan(b).catch((e) => o.log(`ip_bans : ${(e as Error).message}`));
    await o.guard?.ban(ip, minutes * 60).catch((e) => o.log(`guard : ${(e as Error).message}`));
    return b;
  }

  /** Refus d'une connexion : journal + compteur de force brute. */
  function refused(p: { protocol: Protocol; ip: string; key: string; role?: string | null; reason?: string }) {
    const relay = byPublish.get(p.key) ?? byPlay.get(p.key) ?? null;
    record({
      kind: "refused",
      protocol: p.protocol,
      ip: p.ip,
      relay_id: relay?.id ?? null,
      user_id: null, // un refus n'est pas montré au propriétaire (sauf 2e appareil)
      detail: { key: keyHint(p.key), role: p.role ?? null, reason: p.reason ?? "unknown_key" },
    });
    if (internal(p.ip)) return;
    const t = now();
    const list = (fails.get(p.ip) ?? []).filter((x) => x > t - windowMs);
    list.push(t);
    fails.set(p.ip, list);
    if (list.length >= maxFails && !isBanned(p.ip)) {
      fails.delete(p.ip);
      void ban(p.ip, banMinutes, `${list.length} refus en ${Math.round(windowMs / 1000)} s`, true).catch(() => {});
    }
  }

  /**
   * 2e appareil sur une clé déjà en direct : refusé en amont, le propriétaire est alerté.
   * Même IP que le publieur en cours (reconnexion de Moblin pendant que l'ancienne session expire, ou SRTLA où tout
   * arrive de 127.0.0.1) : alerte seulement si les tentatives insistent (6 en 2 min), pour éviter les fausses alertes.
   */
  function duplicate(p: { protocol: Protocol; ip: string; key: string; currentIp?: string | null }) {
    const relay = byPublish.get(p.key) ?? null;
    const t = now();
    const current = p.currentIp ?? (conns.get(p.key) ?? []).find((c) => c.role === "publisher")?.ip ?? null;
    const dups = (dupes.get(p.key) ?? []).filter((x) => x > t - 120_000);
    dups.push(t);
    dupes.set(p.key, dups);
    const suspicious = current === null || current !== p.ip || dups.length >= 6;
    const alert = !!relay && suspicious && t - (lastAlert.get(relay.id) ?? 0) >= alertEveryMs;
    if (alert && relay) lastAlert.set(relay.id, t);
    record({
      kind: "duplicate",
      protocol: p.protocol,
      ip: internal(p.ip) ? null : p.ip,
      relay_id: relay?.id ?? null,
      user_id: alert ? relay!.user_id : null, // visible par le propriétaire (alerte), au plus toutes les 10 min
      detail: { key: keyHint(p.key), via_srtla: p.protocol === "srtla", alert },
    });
    o.log(`2e appareil refusé sur le relais ${relay?.id.slice(0, 8) ?? "?"} (${p.protocol}${internal(p.ip) ? "" : `, ${p.ip}`})${alert ? " : propriétaire alerté" : ""}`);
  }

  function addConn(key: string, c: Conn) {
    const list = (conns.get(key) ?? []).filter((x) => !(x.ip === c.ip && x.port === c.port));
    list.push(c);
    conns.set(key, list.slice(-50));
  }

  async function kickKeys(keys: string[]) {
    const targets = keys.flatMap((k) => conns.get(k) ?? []).map(({ ip, port }) => ({ ip, port }));
    for (const k of keys) conns.delete(k);
    if (!targets.length) return 0;
    await o.guard?.kick(targets, 60).catch((e) => o.log(`guard : ${(e as Error).message}`));
    record({ kind: "kicked", protocol: null, ip: null, relay_id: null, user_id: null, detail: { sessions: targets.length } });
    return targets.length;
  }

  async function onPublisher(e: Extract<SlsEvent, { kind: "publisher" }>) {
    const protocol: Protocol = /^127\.|^::1$/.test(e.ip) ? "srtla" : "srt";
    addConn(e.key, { ip: e.ip, port: e.port, role: "publisher", at: now() });
    const relay = byPublish.get(e.key);
    if (!relay || relay.out_publish_id === e.key) return; // sortie de la régie (Core) ou paire créée à la main
    let reason: string | null;
    try {
      reason = await o.checkPublisher(relay);
    } catch (err) {
      o.log(`vérification du publieur impossible : ${(err as Error).message}`);
      return; // base injoignable : le SLS a déjà vérifié la clé
    }
    if (!reason) return;
    record({ kind: "denied", protocol, ip: internal(e.ip) ? null : e.ip, relay_id: relay.id, user_id: null, detail: { reason } });
    o.log(`publieur refusé sur ${relay.id.slice(0, 8)} : ${reason}`);
    await o.guard?.kick([{ ip: e.ip, port: e.port }], 60).catch((err) => o.log(`guard : ${(err as Error).message}`));
    if (reason !== "streams") o.onDenied?.(relay, reason);
  }

  return {
    record,
    refused,
    duplicate,
    isBanned,
    ban,
    kickKeys,

    /** Relais autorisés (pour reconnaître une clé dans le journal). */
    setRelays(rows: Relay[]) {
      byPublish = new Map(rows.flatMap((r) => [[r.publish_id, r] as const, [r.out_publish_id, r] as const]));
      byPlay = new Map(rows.flatMap((r) => [[r.play_id, r] as const, [r.out_play_id, r] as const]));
    },

    /** Événements du journal du SLS envoyés par le Guard. */
    async handleSls(events: SlsEvent[]) {
      for (const e of events) {
        if (e.kind === "refused") refused({ protocol: /^127\.|^::1$/.test(e.ip) ? "srtla" : "srt", ip: e.ip, key: e.key, role: e.role });
        else if (e.kind === "duplicate") duplicate({ protocol: /^127\.|^::1$/.test(e.ip) ? "srtla" : "srt", ip: e.ip, key: e.key });
        else if (e.kind === "publisher") await onPublisher(e);
        else if (e.kind === "publisher_ptr") {
          const last = (conns.get(e.key) ?? []).filter((c) => c.role === "publisher" && !c.ptr).at(-1);
          if (last) last.ptr = e.ptr;
        } else if (e.kind === "player") addConn(e.key, { ip: e.ip, port: e.port, role: "player", ptr: e.ptr, at: now() });
        else if (e.kind === "closed")
          for (const [k, list] of conns) {
            const rest = list.filter((c) => c.ptr !== e.ptr);
            if (rest.length !== list.length) rest.length ? conns.set(k, rest) : conns.delete(k);
          }
      }
    },

    connections: (key: string) => [...(conns.get(key) ?? [])],

    async unban(ip: string) {
      bans.delete(ip);
      record({ kind: "unbanned", protocol: null, ip, relay_id: null, user_id: null, detail: {} });
      await o.db.deleteBan(ip);
      await o.guard?.unban(ip).catch((e) => o.log(`guard : ${(e as Error).message}`));
    },

    /** Bannissements en cours (Guard, page admin). */
    bans: () => [...bans.values()].filter((b) => Date.parse(b.until) > now()),

    async loadBans() {
      for (const b of await o.db.loadBans()) if (Date.parse(b.until) > now()) bans.set(b.ip, b);
    },

    /** Écrit le journal en base (toutes les 5 s). */
    async flush() {
      if (!pending.length) return;
      const rows = pending;
      pending = [];
      try {
        await o.db.insert(rows);
        failures = 0;
      } catch (e) {
        // Base injoignable : on réessaie ; refus persistant (3 fois) : le lot est abandonné, pas de boucle infinie.
        if (++failures < 3) pending = [...rows, ...pending].slice(-5000);
        else failures = 0;
        o.log(`security_events : ${(e as Error).message}`);
      }
    },

    recent: (limit = 200) => o.db.recent(limit),
    /** Alertes « 2e appareil » d'un compte (7 derniers jours). */
    alerts: (userId: string) => o.db.alerts(userId, new Date(now() - 7 * 86_400_000).toISOString()),
    forget: (userId: string) => o.db.forget(userId),
  };
}

export type Security = ReturnType<typeof createSecurity>;

export function supabaseSecurityDb(db: SupabaseClient): SecurityDb {
  const cols = "at, kind, protocol, ip, country, relay_id, user_id, detail";
  return {
    async insert(rows) {
      const { error } = await db.from("security_events").insert(rows);
      if (error) throw new Error(error.message);
    },
    async loadBans() {
      const { data, error } = await db.from("ip_bans").select("ip, until, reason, auto, created_at").gt("until", new Date().toISOString());
      if (error) throw new Error(error.message);
      return (data ?? []) as Ban[];
    },
    async saveBan(b) {
      const { error } = await db.from("ip_bans").upsert(b);
      if (error) throw new Error(error.message);
    },
    async deleteBan(ip) {
      const { error } = await db.from("ip_bans").delete().eq("ip", ip);
      if (error) throw new Error(error.message);
    },
    async recent(limit) {
      const { data, error } = await db.from("security_events").select(cols).order("at", { ascending: false }).limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as SecurityEvent[];
    },
    async forget(userId) {
      const { error } = await db.from("security_events").update({ user_id: null, ip: null, country: null }).eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    async alerts(userId, since) {
      const { data, error } = await db
        .from("security_events")
        .select(cols)
        .eq("user_id", userId)
        .eq("kind", "duplicate")
        .gte("at", since)
        .order("at", { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return (data ?? []) as SecurityEvent[];
    },
  };
}

/** Client de l'API locale du Guard. */
export function createGuardClient(url: string, token: string, fetchImpl: typeof fetch = fetch): Guard {
  const call = async (path: string, body: unknown) => {
    const res = await fetchImpl(`${url}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`guard ${path} → ${res.status}`);
  };
  return {
    kick: (targets, seconds = 60) => call("/kick", { targets, seconds }),
    ban: (ip, seconds) => call("/ban", { ip, seconds }),
    unban: (ip) => call("/unban", { ip }),
  };
}
