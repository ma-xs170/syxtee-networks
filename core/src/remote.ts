import { createHash, randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";

// SYXTEE Link : télécommande d'OBS. Une petite app (l'agent) tourne sur le PC où est OBS, parle à OBS en local (obs-websocket)
// et ouvre une connexion sortante vers le Core. Le navigateur (SYXTEE Studio) se connecte au Core et envoie ses ordres : le Core les
// transmet à l'agent et renvoie les réponses. Le flux vidéo ne passe JAMAIS par le serveur : OBS diffuse directement depuis le PC.
// Seuls des messages de contrôle (et des miniatures d'aperçu) transitent.
//
//   navigateur ──WS /v1/link/remote──► Core ◄──WS /v1/link/agent── agent (PC) ──obs-websocket──► OBS
//
// - Appairage : le navigateur demande un code (8 caractères, 5 min, usage unique) ; l'agent le présente (POST /v1/link/claim) et reçoit un jeton
//   d'appareil (slk_…, 192 bits, seule l'empreinte SHA-256 est en base). Un appareil se révoque depuis le navigateur.
// - Le Core ne laisse passer que des méthodes de la liste blanche ALLOWED (OBS et link.*), jamais de commande arbitraire.

export const ALLOWED = new Set([
  // OBS : lecture
  "GetVersion", "GetStats", "GetSceneList", "GetCurrentProgramScene", "GetCurrentPreviewScene", "GetSceneItemList", "GetInputList",
  "GetInputMute", "GetInputVolume", "GetStreamStatus", "GetRecordStatus", "GetStudioModeEnabled", "GetMediaInputStatus", "GetSourceScreenshot",
  "GetSceneTransitionList", "GetCurrentSceneTransition", "GetVideoSettings", "GetProfileList", "GetSceneCollectionList", "GetInputAudioMonitorType", "GetOutputStats",
  // OBS : actions
  "SetCurrentProgramScene", "SetCurrentPreviewScene", "SetStudioModeEnabled", "TriggerStudioModeTransition", "SetSceneItemEnabled",
  "SetInputMute", "SetInputVolume", "SetInputAudioMonitorType", "SetCurrentProfile", "SetCurrentSceneCollection", "SetCurrentSceneTransition", "StartStream", "StopStream", "ToggleStream", "StartRecord", "StopRecord", "ToggleRecord", "PauseRecord", "ResumeRecord",
  // SYXTEE Link : bascule automatique sur une scène de secours, état de l'agent
  "link.getBackup", "link.setBackup", "link.getPreview", "link.setPreview", "link.getInfo", "link.preview", "link.collections", "link.backupNow", "link.restore",
]);

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_TTL_MS = 5 * 60_000;
const SESSION_MAX_MS = 12 * 3_600_000;
const HELLO_TIMEOUT_MS = 5_000;
const REQ_TIMEOUT_MS = 10_000;
const MAX_PAYLOAD = 512 * 1024;
/** Jeton d'accès : 1 h. Jeton de renouvellement : 90 jours, tourné à chaque usage. */
const ACCESS_TTL_MS = 3_600_000;
const REFRESH_TTL_MS = 90 * 86_400_000;
/** Actions d'OBS (hors lectures) : 60 par 10 s et par appareil. */
const ACTION_LIMIT = 60;
/** Volume (fader glissé) : 400 par 10 s et par appareil. */
const VOLUME_LIMIT = 400;
const KEEP_BACKUP_VERSIONS = 4;
const MAX_ACTIVE_INVITES = 20;

/** Droits d'une invitation (migration 0045). Le serveur applique ces règles : l'interface n'est qu'un confort. */
export type InviteLevel = "view" | "scenes" | "full";
export const INVITE_LEVELS: InviteLevel[] = ["view", "scenes", "full"];
const GUEST_SCENES = new Set([
  "SetCurrentProgramScene", "SetCurrentPreviewScene", "SetStudioModeEnabled", "TriggerStudioModeTransition", "SetSceneItemEnabled",
  "SetInputMute", "SetInputVolume", "SetInputAudioMonitorType", "SetCurrentSceneTransition",
]);
const GUEST_FULL = new Set(["StartStream", "StopStream", "ToggleStream", "StartRecord", "StopRecord", "ToggleRecord", "PauseRecord", "ResumeRecord", "SetCurrentProfile", "SetCurrentSceneCollection"]);
/** Lectures permises à un invité : tout `Get…` d'OBS, plus l'état de l'aperçu et des rôles. Jamais les sauvegardes. */
const GUEST_LINK_READS = new Set(["link.getPreview", "link.getInfo", "link.getBackup", "link.preview"]);
export function guestAllows(level: InviteLevel, method: string): boolean {
  if (method.startsWith("link.")) return GUEST_LINK_READS.has(method);
  if (method.startsWith("Get")) return true;
  if (level === "view") return false;
  if (GUEST_SCENES.has(method)) return true;
  return level === "full" && GUEST_FULL.has(method);
}

/** Permissions montrées à l'utilisateur à l'appairage, enregistrées avec l'appareil. */
export const LINK_SCOPES = ["profile", "email", "offline", "obs.control", "backups"] as const;
/** Lectures : jamais écrites au journal d'audit (elles tournent en boucle). */
const isRead = (m: string) => /^(Get|link\.(get|preview|collections))/.test(m);
/** Seuls ces paramètres (noms de scène, de source…) sont gardés dans le journal. Jamais de clé, de mot de passe ou de réglage. */
const AUDIT_PARAMS = ["sceneName", "inputName", "sourceName", "transitionName", "sceneItemEnabled", "inputMuted"];

export const newPairCode = () => Array.from(randomBytes(8), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
export const newDeviceToken = () => `slk_${randomBytes(24).toString("hex")}`;
export const newRefreshToken = () => `slr_${randomBytes(24).toString("hex")}`;
export const isDeviceToken = (s: unknown): s is string => typeof s === "string" && /^slk_[0-9a-f]{48}$/.test(s);
export const isRefreshToken = (s: unknown): s is string => typeof s === "string" && /^slr_[0-9a-f]{48}$/.test(s);
export const newInviteToken = () => `sli_${randomBytes(24).toString("hex")}`;
export const isInviteToken = (s: unknown): s is string => typeof s === "string" && /^sli_[0-9a-f]{48}$/.test(s);
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Sous-ensemble du client Supabase utilisé ici (table link_devices, migration 0023). */
export type DeviceDb = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type Device = {
  id: string; user_id: string; name: string; platform: string; created_at: string; last_seen: string | null;
  os?: string; host?: string; plugin_version?: string; online_since?: string | null; scopes?: string[]; org_id?: string | null;
  token_expires_at?: string | null; revoked_at?: string | null;
};
const DEVICE_COLS = "id, user_id, name, platform, created_at, last_seen, os, host, plugin_version, online_since, scopes, org_id, token_expires_at, revoked_at";
/** Colonnes renvoyées au navigateur : aucune empreinte, aucune date de jeton. */
const PUBLIC_COLS = "id, name, platform, os, host, plugin_version, online_since, last_seen, created_at, scopes, org_id";

type Pending = { remote: Conn; rid: string; agent: Agent; method: string; detail: string | null; timer: ReturnType<typeof setTimeout> };
/** `device` : poste que ce navigateur pilote (par défaut, le dernier connecté). */
/** `guest` : invité sans compte (lien d'invitation) : il pilote le compte `userId` avec les droits de son invitation. */
type Conn = { ws: WebSocket; id: string; userId: string; device?: string; guest?: { id: string; level: InviteLevel; label: string; locked: boolean } };
type Agent = Conn & { deviceId: string; name: string; platform: string; version: string; os: string; host: string; since: number; expires: number | null; expiry?: ReturnType<typeof setTimeout> };

export function createRemote(o: {
  db: DeviceDb;
  /** Compte autorisé à utiliser SYXTEE (accès sur invitation). */
  canUse: (userId: string) => boolean;
  verifyUser: (authorization: string | undefined) => Promise<string | null>;
  /** Nom, email, avatar du compte (affichés dans la fenêtre SYXTEE Studio d'OBS). */
  account?: (userId: string) => Promise<{ email: string; name: string; avatar_url: string | null; plan: string | null } | null>;
  log: (m: string) => void;
  now?: () => number;
}) {
  const now = o.now ?? Date.now;
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });
  const codes = new Map<string, { userId: string; expires: number }>();
  const failures = new Map<string, { n: number; since: number }>();
  const agents = new Map<string, Map<string, Agent>>(); // compte → appareil → agent connecté
  const buckets = new Map<string, { n: number; since: number }>(); // appareil → actions récentes
  const remotes = new Map<string, Set<Conn>>(); // compte → navigateurs connectés
  const guests = new Map<string, Set<Conn>>(); // invitation → navigateurs invités connectés
  const pending = new Map<string, Pending>(); // id routé → demande en attente
  let seq = 0;
  // Connexion depuis le plugin : l'agent demande un code, ouvre le site, l'utilisateur (connecté) l'approuve, l'agent récupère son jeton.
  type Auth = { userCode: string; expires: number; name: string; platform: string; os: string; version: string; userId: string | null; denied: boolean };
  const auths = new Map<string, Auth>(); // clé : code secret de l'agent (device_code)
  const starts = new Map<string, { n: number; since: number }>();
  const AUTH_TTL_MS = 10 * 60_000;
  const gcAuths = () => {
    for (const [k, v] of auths) if (v.expires < now()) auths.delete(k);
  };

  const send = (ws: WebSocket, msg: unknown) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg));
  /** Agent piloté : celui choisi par le navigateur s'il est en ligne, sinon le dernier connecté du compte. */
  const pick = (userId: string, device?: string): Agent | undefined => {
    const m = agents.get(userId);
    if (!m) return undefined;
    if (device) return m.get(device);
    let best: Agent | undefined;
    for (const a of m.values()) if (!best || a.since >= best.since) best = a;
    return best;
  };
  const agentInfo = (a: Agent | undefined) => (a ? { online: true, id: a.deviceId, name: a.name, platform: a.platform, version: a.version, since: a.since } : { online: false });
  const viewersOf = (a: Agent) => [...(remotes.get(a.userId) ?? [])].filter((c) => pick(a.userId, c.device) === a).length;
  /** Message à chaque navigateur du compte qui pilote cet agent. */
  const toViewers = (a: Agent, msg: unknown) => remotes.get(a.userId)?.forEach((c) => pick(a.userId, c.device) === a && send(c.ws, msg));
  /** Présence : chaque navigateur reçoit l'état de son poste, plus la liste des postes en ligne. */
  function pushPresence(userId: string) {
    const online = [...(agents.get(userId)?.values() ?? [])].map((a) => ({ id: a.deviceId, name: a.name, platform: a.platform, version: a.version, since: a.since }));
    remotes.get(userId)?.forEach((c) => {
      send(c.ws, { type: "agent", ...agentInfo(pick(userId, c.device)) });
      send(c.ws, { type: "instances", online });
    });
  }

  /** Journal d'audit : écriture sans attendre, un échec d'écriture ne bloque jamais une commande. */
  function audit(userId: string, deviceId: string | null, method: string, ok: boolean, error?: string, detail?: string | null) {
    void Promise.resolve(o.db.from("link_audit").insert({ user_id: userId, device_id: deviceId, method: method.slice(0, 60), ok, error: error ?? null, detail: detail ?? null })).catch(() => {});
  }
  function detailOf(method: string, params: unknown): string | null {
    if (method.startsWith("link.") || !params || typeof params !== "object") return null;
    const p = params as Record<string, unknown>;
    const parts = AUDIT_PARAMS.filter((k) => typeof p[k] === "string" || typeof p[k] === "boolean").map((k) => `${k}=${String(p[k]).replace(/[\u0000-\u001f]/g, "")}`);
    return parts.length ? parts.join(" ").slice(0, 120) : null;
  }
  /** Action finie (réponse, délai, agent parti) : écrite au journal, sauf les lectures. */
  function finish(p: Pending, ok: boolean, error?: string) {
    if (!isRead(p.method)) {
      const g = p.remote.guest;
      audit(p.remote.userId, p.agent.deviceId, p.method, ok, error, g ? `invité « ${g.label} »${p.detail ? ` ${p.detail}` : ""}`.slice(0, 120) : p.detail);
    }
  }

  /** 10 échecs d'appairage par minute et par IP au plus. */
  function throttled(ip: string) {
    const f = failures.get(ip);
    if (f && now() - f.since > 60_000) failures.delete(ip);
    return (failures.get(ip)?.n ?? 0) >= 10;
  }
  function fail(ip: string) {
    const f = failures.get(ip);
    if (!f || now() - f.since > 60_000) failures.set(ip, { n: 1, since: now() });
    else f.n++;
  }

  function dropPending(conn: Conn) {
    for (const [id, p] of pending) {
      if (p.remote === conn) {
        clearTimeout(p.timer);
        pending.delete(id);
      }
    }
  }

  function handleAgent(ws: WebSocket, authed: Agent) {
    ws.on("message", (raw) => {
      let m: { type?: string; id?: string; name?: string; data?: unknown; ok?: boolean; result?: unknown; error?: string };
      try {
        m = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (m.type === "res" && typeof m.id === "string") {
        const p = pending.get(m.id);
        if (!p || p.agent !== authed) return;
        clearTimeout(p.timer);
        pending.delete(m.id);
        const ok = m.ok !== false;
        finish(p, ok, ok ? undefined : "failed");
        send(p.remote.ws, { type: "res", id: p.rid, ok, result: m.result, error: m.error });
      } else if (m.type === "event" && typeof m.name === "string") toViewers(authed, { type: "event", name: m.name, data: m.data });
      else if (m.type === "reauth" && isDeviceToken((m as { token?: unknown }).token)) {
        // Jeton d'accès renouvelé par l'agent : la session continue sans coupure.
        void findDevice((m as { token: string }).token).then((dev) => {
          if (!dev || dev.id !== authed.deviceId || !o.canUse(dev.user_id)) return ws.close(4003, "unauthorized");
          armExpiry(authed, dev.token_expires_at ? Date.parse(dev.token_expires_at) : null);
        });
      }
    });
    ws.on("close", () => {
      clearTimeout(authed.expiry);
      const m = agents.get(authed.userId);
      if (m?.get(authed.deviceId) === authed) {
        m.delete(authed.deviceId);
        if (m.size === 0) agents.delete(authed.userId);
        pushPresence(authed.userId);
        void Promise.resolve(o.db.from("link_devices").update({ online_since: null, last_seen: new Date(now()).toISOString() }).eq("id", authed.deviceId)).catch(() => {});
        o.log(`link ${authed.userId.slice(0, 8)} : agent déconnecté`);
      }
      // Les demandes en attente de cet agent échouent tout de suite (au lieu d'attendre le délai).
      for (const [id, p] of pending) {
        if (p.agent !== authed) continue;
        clearTimeout(p.timer);
        pending.delete(id);
        finish(p, false, "agent_offline");
        send(p.remote.ws, { type: "res", id: p.rid, ok: false, error: "agent_offline" });
      }
    });
  }

  function handleRemote(ws: WebSocket, conn: Conn) {
    let bucket = { n: 0, since: now() };
    ws.on("message", (raw) => {
      let m: { type?: string; id?: unknown; method?: unknown; params?: unknown; device?: unknown };
      try {
        m = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (m.type === "select") {
        // Changer de poste piloté.
        if (!conn.guest?.locked) conn.device = typeof m.device === "string" ? m.device : undefined;
        send(ws, { type: "agent", ...agentInfo(pick(conn.userId, conn.device)) });
        const a = [...(agents.get(conn.userId)?.values() ?? [])];
        a.forEach((x) => send(x.ws, { type: "viewers", n: viewersOf(x) }));
        return;
      }
      if (m.type !== "req" || typeof m.id !== "string" || typeof m.method !== "string") return;
      if (now() - bucket.since > 10_000) bucket = { n: 0, since: now() };
      if (++bucket.n > 200) return send(ws, { type: "res", id: m.id, ok: false, error: "rate_limited" });
      if (!ALLOWED.has(m.method)) {
        audit(conn.userId, null, m.method, false, "not_allowed");
        return send(ws, { type: "res", id: m.id, ok: false, error: "method_not_allowed" });
      }
      if (conn.guest && !guestAllows(conn.guest.level, m.method)) {
        audit(conn.userId, null, m.method, false, "forbidden", `invité « ${conn.guest.label} »`);
        return send(ws, { type: "res", id: m.id, ok: false, error: "forbidden" });
      }
      const agent = pick(conn.userId, conn.device);
      if (!agent) return send(ws, { type: "res", id: m.id, ok: false, error: "agent_offline" });
      // Plafond d'actions par appareil, tous navigateurs confondus.
      if (!isRead(m.method)) {
        // Un fader qu'on glisse envoie des dizaines d'ordres : compteur à part, bien plus large, pour ne pas bloquer les autres actions.
        const key = m.method === "SetInputVolume" ? `${agent.deviceId}:volume` : agent.deviceId;
        const limit = m.method === "SetInputVolume" ? VOLUME_LIMIT : ACTION_LIMIT;
        let b = buckets.get(key);
        if (!b || now() - b.since > 10_000) buckets.set(key, (b = { n: 0, since: now() }));
        if (++b.n > limit) {
          if (b.n === limit + 1) audit(conn.userId, agent.deviceId, m.method, false, "rate_limited");
          return send(ws, { type: "res", id: m.id, ok: false, error: "rate_limited" });
        }
      }
      const routed = `${conn.id}:${++seq}`;
      const rid = m.id;
      const entry: Pending = {
        remote: conn,
        rid,
        agent,
        method: m.method,
        detail: detailOf(m.method, m.params),
        timer: setTimeout(() => {
          pending.delete(routed);
          finish(entry, false, "timeout");
          send(ws, { type: "res", id: rid, ok: false, error: "timeout" });
        }, REQ_TIMEOUT_MS),
      };
      pending.set(routed, entry);
      send(agent.ws, { type: "req", id: routed, method: m.method, params: m.params });
    });
    ws.on("close", () => {
      dropPending(conn);
      const set = remotes.get(conn.userId);
      set?.delete(conn);
      if (set && set.size === 0) remotes.delete(conn.userId);
      if (conn.guest) {
        const g = guests.get(conn.guest.id);
        g?.delete(conn);
        if (g && g.size === 0) guests.delete(conn.guest.id);
      }
      for (const a of agents.get(conn.userId)?.values() ?? []) send(a.ws, { type: "viewers", n: viewersOf(a) });
    });
  }

  /** Premier message obligatoire : authentification (5 s), puis le canal devient celui de l'agent ou du navigateur. */
  function accept(ws: WebSocket, kind: "agent" | "remote", ip: string) {
    const timer = setTimeout(() => ws.close(4001, "hello_timeout"), HELLO_TIMEOUT_MS);
    ws.once("message", async (raw) => {
      clearTimeout(timer);
      let m: { type?: string; token?: unknown; access?: unknown; invite?: unknown; name?: unknown; platform?: unknown; version?: unknown; os?: unknown; host?: unknown; device?: unknown };
      try {
        m = JSON.parse(String(raw));
      } catch {
        return ws.close(4002, "bad_hello");
      }
      if (m.type !== "hello") return ws.close(4002, "bad_hello");
      const id = `c${++seq}`;
      if (kind === "agent") {
        const dev = isDeviceToken(m.token) ? await findDevice(m.token) : null;
        if (!dev || !o.canUse(dev.user_id)) {
          fail(ip);
          return ws.close(4003, "unauthorized");
        }
        const text = (v: unknown, n: number, d = "") => String(v ?? d).replace(/[\u0000-\u001f]/g, "").trim().slice(0, n);
        const userAgents = agents.get(dev.user_id) ?? new Map<string, Agent>();
        const prev = userAgents.get(dev.id);
        const agent: Agent = {
          ws, id, userId: dev.user_id, deviceId: dev.id,
          name: dev.name, platform: text(m.platform, 20, dev.platform), version: text(m.version, 20),
          os: text(m.os, 40), host: text(m.host, 60), since: now(), expires: null,
        };
        userAgents.set(dev.id, agent);
        agents.set(dev.user_id, userAgents);
        prev?.ws.close(4000, "replaced");
        armExpiry(agent, dev.token_expires_at ? Date.parse(dev.token_expires_at) : null);
        void Promise.resolve(
          o.db.from("link_devices").update({ last_seen: new Date(now()).toISOString(), online_since: new Date(agent.since).toISOString(), plugin_version: agent.version, os: agent.os, host: agent.host, platform: agent.platform }).eq("id", dev.id),
        ).catch(() => {});
        lastTouch.set(dev.id, now());
        send(ws, { type: "ready", viewers: viewersOf(agent) });
        pushPresence(dev.user_id);
        o.log(`link ${dev.user_id.slice(0, 8)} : agent « ${agent.name} » connecté`);
        handleAgent(ws, agent);
      } else {
        let guest: Conn["guest"];
        let userId: string | null = null;
        let device = typeof m.device === "string" ? m.device : undefined;
        if (isInviteToken(m.invite)) {
          // Invité sans compte : le lien porte le secret ; le compte piloté est celui qui a invité.
          if (throttled(ip)) return ws.close(4008, "too_many");
          const inv = await findInvite(m.invite);
          if (!inv || !o.canUse(inv.owner_id)) {
            fail(ip);
            return ws.close(4003, "unauthorized");
          }
          userId = inv.owner_id;
          guest = { id: inv.id, level: inv.level, label: inv.label, locked: !!inv.device_id };
          if (inv.device_id) device = inv.device_id;
          touchInvite(inv.id);
        } else userId = typeof m.access === "string" ? await o.verifyUser(`Bearer ${m.access}`) : null;
        if (!userId || !o.canUse(userId)) return ws.close(4003, "unauthorized");
        const conn: Conn = { ws, id, userId, device, guest };
        if (guest) {
          const g = guests.get(guest.id) ?? new Set<Conn>();
          g.add(conn);
          guests.set(guest.id, g);
        }
        const set = remotes.get(userId) ?? new Set<Conn>();
        set.add(conn);
        remotes.set(userId, set);
        send(ws, { type: "ready", agent: agentInfo(pick(userId, conn.device)), ...(guest ? { guest: { level: guest.level, label: guest.label } } : {}) });
        send(ws, { type: "instances", online: [...(agents.get(userId)?.values() ?? [])].map((a) => ({ id: a.deviceId, name: a.name, platform: a.platform, version: a.version, since: a.since })) });
        for (const a of agents.get(userId)?.values() ?? []) send(a.ws, { type: "viewers", n: viewersOf(a) });
        setTimeout(() => ws.close(4004, "session_expired"), SESSION_MAX_MS).unref();
        handleRemote(ws, conn);
      }
    });
  }

  // ───── Appareils (Supabase) ─────
  /** Appareil du jeton d'accès : introuvable, révoqué ou périmé = null. */
  async function findDevice(token: string): Promise<Device | null> {
    const { data } = await o.db.from("link_devices").select(DEVICE_COLS).eq("token_hash", hashToken(token)).maybeSingle();
    const d = data as Device | null;
    if (!d || d.revoked_at) return null;
    if (d.token_expires_at && Date.parse(d.token_expires_at) <= now()) return null;
    return d;
  }
  type InviteRow = { id: string; owner_id: string; device_id: string | null; label: string; email: string | null; level: InviteLevel; expires_at: string | null; revoked_at: string | null; last_used_at: string | null; created_at: string };
  const INVITE_COLS = "id, owner_id, device_id, label, email, level, expires_at, revoked_at, last_used_at, created_at";
  /** Invitation du lien : introuvable, révoquée ou expirée = null. */
  async function findInvite(token: string): Promise<InviteRow | null> {
    const { data } = await o.db.from("link_invites").select(INVITE_COLS).eq("token_hash", hashToken(token)).maybeSingle();
    const r = data as InviteRow | null;
    if (!r || r.revoked_at) return null;
    if (r.expires_at && Date.parse(r.expires_at) <= now()) return null;
    return r;
  }
  const lastInviteTouch = new Map<string, number>();
  function touchInvite(id: string) {
    if (now() - (lastInviteTouch.get(id) ?? 0) < 60_000) return;
    lastInviteTouch.set(id, now());
    void Promise.resolve(o.db.from("link_invites").update({ last_used_at: new Date(now()).toISOString() }).eq("id", id)).catch(() => {});
  }
  /** La session de l'agent se ferme à l'expiration du jeton d'accès, sauf renouvellement (`reauth`). Null : ancien jeton sans échéance. */
  function armExpiry(a: Agent, at: number | null) {
    clearTimeout(a.expiry);
    a.expires = at;
    if (at === null) return;
    a.expiry = setTimeout(() => a.ws.close(4006, "token_expired"), Math.max(0, at - now()));
    a.expiry.unref();
  }
  const lastTouch = new Map<string, number>();

  type Issued = { token: string; refresh: string; expires_in: number };
  const issueFields = () => {
    const token = newDeviceToken();
    const refresh = newRefreshToken();
    return {
      out: { token, refresh, expires_in: ACCESS_TTL_MS / 1000 } satisfies Issued,
      row: { token_hash: hashToken(token), token_expires_at: new Date(now() + ACCESS_TTL_MS).toISOString(), refresh_hash: hashToken(refresh), refresh_expires_at: new Date(now() + REFRESH_TTL_MS).toISOString() },
    };
  };
  const text = (v: unknown, n: number, d = "") => String(v ?? d).replace(/[\u0000-\u001f]/g, "").trim().slice(0, n);

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      const w = ws as WebSocket & { alive?: boolean };
      if (w.alive === false) {
        w.terminate();
        continue;
      }
      w.alive = false;
      w.ping();
    }
  }, 20_000);
  heartbeat.unref();

  return {
    /** À brancher sur l'événement `upgrade` du serveur HTTP. Renvoie false si le chemin n'est pas le nôtre. */
    upgrade(req: IncomingMessage, socket: Duplex, head: Buffer): boolean {
      const path = (req.url ?? "").split("?")[0];
      const kind = path === "/v1/link/agent" ? "agent" : path === "/v1/link/remote" ? "remote" : null;
      if (!kind) return false;
      const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "").split(",")[0].trim();
      if (kind === "agent" && throttled(ip)) {
        socket.write("HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return true;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        (ws as WebSocket & { alive?: boolean }).alive = true;
        ws.on("pong", () => ((ws as WebSocket & { alive?: boolean }).alive = true));
        accept(ws, kind, ip);
      });
      return true;
    },

    /** L'agent démarre une connexion : renvoie le code à montrer (user_code) et son code secret (device_code). 10 démarrages par minute et par IP. */
    deviceStart(ip: string, name: unknown, platform: unknown, os?: unknown, version?: unknown): { device_code: string; user_code: string; expires_in: number; interval: number } | { error: "too_many" } {
      const s = starts.get(ip);
      if (!s || now() - s.since > 60_000) starts.set(ip, { n: 1, since: now() });
      else if (++s.n > 10) return { error: "too_many" };
      gcAuths();
      const device_code = randomBytes(32).toString("hex");
      const user_code = newPairCode();
      auths.set(device_code, { userCode: user_code, expires: now() + AUTH_TTL_MS, name: text(name, 40, "OBS") || "OBS", platform: text(platform, 20), os: text(os, 40), version: text(version, 20), userId: null, denied: false });
      return { device_code, user_code, expires_in: AUTH_TTL_MS / 1000, interval: 2 };
    },

    /** Le navigateur (utilisateur connecté et invité) approuve le code affiché par l'agent. Renvoie le poste, ou null. */
    deviceApprove(userId: string, userCode: unknown): { name: string; platform: string; os: string; version: string; scopes: readonly string[] } | null {
      if (!o.canUse(userId)) return null;
      const code = typeof userCode === "string" ? userCode.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
      gcAuths();
      for (const a of auths.values()) {
        if (a.userCode === code && a.userId === null && !a.denied) {
          a.userId = userId;
          return { name: a.name, platform: a.platform, os: a.os, version: a.version, scopes: LINK_SCOPES };
        }
      }
      return null;
    },

    /** Le navigateur refuse le code : l'agent l'apprend à sa prochaine interrogation. */
    deviceDeny(userId: string, userCode: unknown): boolean {
      if (!o.canUse(userId)) return false;
      const code = typeof userCode === "string" ? userCode.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
      for (const a of auths.values()) {
        if (a.userCode === code && a.userId === null && !a.denied) {
          a.denied = true;
          return true;
        }
      }
      return false;
    },

    /** Infos affichées sur la page d'approbation (poste, permissions) sans rien approuver. */
    deviceLookup(userCode: unknown): { name: string; platform: string; os: string; version: string; scopes: readonly string[] } | null {
      const code = typeof userCode === "string" ? userCode.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
      gcAuths();
      for (const a of auths.values()) if (a.userCode === code && a.userId === null && !a.denied) return { name: a.name, platform: a.platform, os: a.os, version: a.version, scopes: LINK_SCOPES };
      return null;
    },

    /** L'agent interroge : en attente, expiré, refusé, ou jetons d'appareil (donnés une seule fois). */
    async devicePoll(deviceCode: unknown): Promise<{ status: "pending" | "expired" | "error" | "denied" } | ({ status: "approved"; device_id: string } & Issued)> {
      const key = typeof deviceCode === "string" ? deviceCode : "";
      const a = auths.get(key);
      if (!a || a.expires < now()) {
        auths.delete(key);
        return { status: "expired" };
      }
      if (a.denied) {
        auths.delete(key);
        return { status: "denied" };
      }
      if (a.userId === null) return { status: "pending" };
      auths.delete(key);
      if (!o.canUse(a.userId)) return { status: "expired" };
      const t = issueFields();
      const { data, error } = await o.db
        .from("link_devices")
        .insert({ user_id: a.userId, name: a.name, platform: a.platform, os: a.os, plugin_version: a.version, scopes: [...LINK_SCOPES], ...t.row })
        .select("id")
        .single();
      if (error || !data) return { status: "error" };
      return { status: "approved", device_id: (data as { id: string }).id, ...t.out };
    },

    /** Nouveau code d'appairage pour le compte (un seul code actif par compte). */
    newCode(userId: string) {
      for (const [c, v] of codes) if (v.userId === userId || v.expires < now()) codes.delete(c);
      const code = newPairCode();
      codes.set(code, { userId, expires: now() + CODE_TTL_MS });
      return { code, expires_in: CODE_TTL_MS / 1000 };
    },

    /** L'agent présente le code : renvoie un jeton d'appareil (affiché une seule fois) ou une erreur. */
    async claim(ip: string, code: unknown, name: unknown, platform: unknown): Promise<{ error: string } | ({ device_id: string } & Issued)> {
      if (throttled(ip)) return { error: "too_many" };
      const key = typeof code === "string" ? code.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
      const c = codes.get(key);
      if (!c || c.expires < now() || !o.canUse(c.userId)) {
        fail(ip);
        return { error: "invalid_code" };
      }
      codes.delete(key); // usage unique
      const t = issueFields();
      const { data, error } = await o.db
        .from("link_devices")
        .insert({ user_id: c.userId, name: text(name, 40, "OBS") || "OBS", platform: text(platform, 20), scopes: [...LINK_SCOPES], ...t.row })
        .select("id")
        .single();
      if (error || !data) return { error: "server" };
      return { device_id: (data as { id: string }).id, ...t.out };
    },

    /** Renouvelle les jetons. L'ancien jeton de renouvellement meurt à l'usage ; un jeton révoqué, périmé ou rejoué est refusé. */
    async refresh(ip: string, refreshToken: unknown): Promise<{ error: "too_many" | "invalid_token" | "server" } | ({ device_id: string } & Issued)> {
      if (throttled(ip)) return { error: "too_many" };
      if (!isRefreshToken(refreshToken)) {
        fail(ip);
        return { error: "invalid_token" };
      }
      const { data } = await o.db.from("link_devices").select("id, user_id, revoked_at, refresh_expires_at").eq("refresh_hash", hashToken(refreshToken)).maybeSingle();
      const d = data as { id: string; user_id: string; revoked_at: string | null; refresh_expires_at: string | null } | null;
      if (!d || d.revoked_at || !d.refresh_expires_at || Date.parse(d.refresh_expires_at) <= now() || !o.canUse(d.user_id)) {
        fail(ip);
        return { error: "invalid_token" };
      }
      const t = issueFields();
      const { data: upd, error } = await o.db.from("link_devices").update(t.row).eq("id", d.id).eq("refresh_hash", hashToken(refreshToken)).is("revoked_at", null).select("id");
      if (error || !Array.isArray(upd) || upd.length === 0) return { error: "server" }; // course perdue : un autre renouvellement a déjà tourné le jeton
      return { device_id: d.id, ...t.out };
    },

    /** Postes du compte (registre) : en ligne ou non, depuis quand, version du plugin. Jamais d'empreinte de jeton. */
    async devices(userId: string): Promise<(Omit<Device, "user_id"> & { online: boolean })[]> {
      const { data } = await o.db.from("link_devices").select(PUBLIC_COLS).eq("user_id", userId).is("revoked_at", null);
      const live = agents.get(userId);
      return ((data as Omit<Device, "user_id">[] | null) ?? []).map((d) => {
        const a = live?.get(d.id);
        // Champs listés un à un : jamais d'empreinte de jeton, même si la requête en ramenait.
        return {
          id: d.id, name: d.name, platform: d.platform, os: d.os ?? "", host: d.host ?? "", plugin_version: d.plugin_version ?? "", scopes: d.scopes ?? [], org_id: d.org_id ?? null,
          created_at: d.created_at, last_seen: d.last_seen, online: !!a, online_since: a ? new Date(a.since).toISOString() : (null as string | null),
        };
      });
    },

    /** Renomme un poste. */
    async rename(userId: string, deviceId: string, name: unknown): Promise<boolean> {
      const n = text(name, 40);
      if (!n) return false;
      const { data } = await o.db.from("link_devices").update({ name: n }).eq("id", deviceId).eq("user_id", userId).is("revoked_at", null).select("id");
      const a = agents.get(userId)?.get(deviceId);
      if (a) a.name = n;
      if (Array.isArray(data) && data.length > 0) {
        pushPresence(userId);
        return true;
      }
      return false;
    },

    /** Révoque un poste : jetons invalides tout de suite, connexion de l'agent coupée sur le champ. */
    async revoke(userId: string, deviceId: string): Promise<boolean> {
      const { data } = await o.db
        .from("link_devices")
        .update({ revoked_at: new Date(now()).toISOString(), refresh_hash: null, online_since: null })
        .eq("id", deviceId)
        .eq("user_id", userId)
        .is("revoked_at", null)
        .select("id");
      agents.get(userId)?.get(deviceId)?.ws.close(4005, "revoked");
      const ok = Array.isArray(data) && data.length > 0;
      if (ok) audit(userId, deviceId, "device.revoke", true);
      return ok;
    },

    // ── Invitations (invités sans compte) ──
    /** Crée une invitation. Le secret n'est renvoyé qu'ici : seule son empreinte est gardée. */
    async createInvite(userId: string, i: { label: unknown; email?: unknown; level: unknown; deviceId?: unknown; expiresHours?: unknown }): Promise<{ error: string } | { id: string; token: string; expires_at: string | null }> {
      const label = text(i.label, 40);
      const level = INVITE_LEVELS.find((l) => l === i.level);
      const email = i.email ? text(i.email, 254).toLowerCase() : null;
      if (!label || !level) return { error: "invalid" };
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "invalid" };
      const hours = typeof i.expiresHours === "number" && i.expiresHours > 0 ? Math.min(i.expiresHours, 24 * 365) : null;
      const deviceId = typeof i.deviceId === "string" && i.deviceId ? i.deviceId : null;
      if (deviceId) {
        const { data: dev } = await o.db.from("link_devices").select("id").eq("id", deviceId).eq("user_id", userId).is("revoked_at", null).maybeSingle();
        if (!dev) return { error: "no_device" };
      }
      const { data: active } = await o.db.from("link_invites").select("id").eq("owner_id", userId).is("revoked_at", null);
      if (Array.isArray(active) && active.length >= MAX_ACTIVE_INVITES) return { error: "quota" };
      const token = newInviteToken();
      const expires_at = hours ? new Date(now() + hours * 3_600_000).toISOString() : null;
      const { data, error } = await o.db.from("link_invites").insert({ owner_id: userId, device_id: deviceId, label, email, level, token_hash: hashToken(token), expires_at }).select("id").single();
      if (error || !data) return { error: "server" };
      audit(userId, deviceId, "invite.create", true, undefined, `${label} (${level})`.slice(0, 120));
      return { id: (data as { id: string }).id, token, expires_at };
    },
    /** Invitations actives du compte, avec leur état de connexion. Jamais le secret ni son empreinte. */
    async invites(userId: string): Promise<(Omit<InviteRow, "owner_id" | "revoked_at"> & { connected: number; expired: boolean })[]> {
      const { data } = await o.db.from("link_invites").select(INVITE_COLS).eq("owner_id", userId).is("revoked_at", null);
      return ((data as InviteRow[] | null) ?? []).map((r) => ({
        id: r.id, device_id: r.device_id, label: r.label, email: r.email, level: r.level, expires_at: r.expires_at, last_used_at: r.last_used_at, created_at: r.created_at,
        connected: guests.get(r.id)?.size ?? 0, expired: !!r.expires_at && Date.parse(r.expires_at) <= now(),
      }));
    },
    /** Révoque une invitation : le lien ne marche plus, les invités connectés sont déconnectés tout de suite. */
    async revokeInvite(userId: string, inviteId: string): Promise<boolean> {
      const { data } = await o.db.from("link_invites").update({ revoked_at: new Date(now()).toISOString() }).eq("id", inviteId).eq("owner_id", userId).is("revoked_at", null).select("id");
      for (const c of guests.get(inviteId) ?? []) c.ws.close(4005, "revoked");
      const ok = Array.isArray(data) && data.length > 0;
      if (ok) audit(userId, null, "invite.revoke", true);
      return ok;
    },
    /** Compte propriétaire et droits d'un lien d'invitation (pour l'aperçu vidéo de l'invité), ou null. */
    async inviteAuth(token: unknown, ip = ""): Promise<{ userId: string; level: InviteLevel } | null> {
      if (!isInviteToken(token) || throttled(ip)) return null;
      const inv = await findInvite(token);
      if (!inv || !o.canUse(inv.owner_id)) {
        fail(ip);
        return null;
      }
      return { userId: inv.owner_id, level: inv.level };
    },

    /** Dernières actions du compte (journal d'audit). */
    async auditLog(userId: string, limit = 50): Promise<unknown[]> {
      const { data } = await o.db.from("link_audit").select("id, device_id, method, ok, error, detail, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(Math.min(Math.max(limit, 1), 200));
      return (data as unknown[] | null) ?? [];
    },

    canUse: o.canUse,
    /** Compte propriétaire du jeton d'appareil (en-tête Authorization), ou null. Sert aux envois et téléchargements de sauvegardes. */
    async deviceUser(authorization: string | undefined): Promise<string | null> {
      const t = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
      if (!isDeviceToken(t)) return null;
      const dev = await findDevice(t);
      return dev && o.canUse(dev.user_id) ? dev.user_id : null;
    },
    /** Compte et appareil du jeton d'accès (en-tête Authorization), ou null. */
    async deviceAuth(authorization: string | undefined): Promise<{ userId: string; deviceId: string } | null> {
      const t = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
      if (!isDeviceToken(t)) return null;
      const dev = await findDevice(t);
      return dev && o.canUse(dev.user_id) ? { userId: dev.user_id, deviceId: dev.id } : null;
    },
    account: (userId: string) => o.account?.(userId) ?? Promise.resolve(null),
    status: (userId: string) => ({ agent: agentInfo(pick(userId)), remotes: remotes.get(userId)?.size ?? 0 }),

    close() {
      clearInterval(heartbeat);
      for (const m of agents.values()) for (const a of m.values()) clearTimeout(a.expiry);
      for (const ws of wss.clients) ws.terminate();
      wss.close();
    },
  };
}

export type Remote = ReturnType<typeof createRemote>;
