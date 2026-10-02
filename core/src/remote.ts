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
  // OBS : actions
  "SetCurrentProgramScene", "SetCurrentPreviewScene", "SetStudioModeEnabled", "TriggerStudioModeTransition", "SetSceneItemEnabled",
  "SetInputMute", "SetInputVolume", "StartStream", "StopStream", "ToggleStream", "StartRecord", "StopRecord", "ToggleRecord", "PauseRecord", "ResumeRecord",
  // SYXTEE Link : bascule automatique sur une scène de secours, état de l'agent
  "link.getBackup", "link.setBackup", "link.getInfo",
]);

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_TTL_MS = 5 * 60_000;
const SESSION_MAX_MS = 12 * 3_600_000;
const HELLO_TIMEOUT_MS = 5_000;
const REQ_TIMEOUT_MS = 10_000;
const MAX_PAYLOAD = 512 * 1024;

export const newPairCode = () => Array.from(randomBytes(8), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
export const newDeviceToken = () => `slk_${randomBytes(24).toString("hex")}`;
export const isDeviceToken = (s: unknown): s is string => typeof s === "string" && /^slk_[0-9a-f]{48}$/.test(s);
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Sous-ensemble du client Supabase utilisé ici (table link_devices, migration 0023). */
export type DeviceDb = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type Device = { id: string; user_id: string; name: string; platform: string; created_at: string; last_seen: string | null };

type Pending = { remote: Conn; rid: string; agent: Agent; timer: ReturnType<typeof setTimeout> };
type Conn = { ws: WebSocket; id: string; userId: string };
type Agent = Conn & { deviceId: string; name: string; platform: string; version: string };

export function createRemote(o: {
  db: DeviceDb;
  /** Compte autorisé à utiliser SYXTEE (accès sur invitation). */
  canUse: (userId: string) => boolean;
  verifyUser: (authorization: string | undefined) => Promise<string | null>;
  log: (m: string) => void;
  now?: () => number;
}) {
  const now = o.now ?? Date.now;
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });
  const codes = new Map<string, { userId: string; expires: number }>();
  const failures = new Map<string, { n: number; since: number }>();
  const agents = new Map<string, Agent>(); // compte → agent connecté
  const remotes = new Map<string, Set<Conn>>(); // compte → navigateurs connectés
  const pending = new Map<string, Pending>(); // id routé → demande en attente
  let seq = 0;

  const send = (ws: WebSocket, msg: unknown) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg));
  const toRemotes = (userId: string, msg: unknown) => remotes.get(userId)?.forEach((c) => send(c.ws, msg));
  const agentInfo = (userId: string) => {
    const a = agents.get(userId);
    return a ? { online: true, name: a.name, platform: a.platform, version: a.version } : { online: false };
  };

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
        if (!p) return;
        clearTimeout(p.timer);
        pending.delete(m.id);
        send(p.remote.ws, { type: "res", id: p.rid, ok: m.ok !== false, result: m.result, error: m.error });
      } else if (m.type === "event" && typeof m.name === "string") toRemotes(authed.userId, { type: "event", name: m.name, data: m.data });
    });
    ws.on("close", () => {
      if (agents.get(authed.userId) === authed) {
        agents.delete(authed.userId);
        toRemotes(authed.userId, { type: "agent", online: false });
        o.log(`link ${authed.userId.slice(0, 8)} : agent déconnecté`);
      }
      // Les demandes en attente de cet agent échouent tout de suite (au lieu d'attendre le délai).
      for (const [id, p] of pending) {
        if (p.agent !== authed) continue;
        clearTimeout(p.timer);
        pending.delete(id);
        send(p.remote.ws, { type: "res", id: p.rid, ok: false, error: "agent_offline" });
      }
    });
  }

  function handleRemote(ws: WebSocket, conn: Conn) {
    let bucket = { n: 0, since: now() };
    ws.on("message", (raw) => {
      let m: { type?: string; id?: unknown; method?: unknown; params?: unknown };
      try {
        m = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (m.type !== "req" || typeof m.id !== "string" || typeof m.method !== "string") return;
      if (now() - bucket.since > 10_000) bucket = { n: 0, since: now() };
      if (++bucket.n > 200) return send(ws, { type: "res", id: m.id, ok: false, error: "rate_limited" });
      if (!ALLOWED.has(m.method)) return send(ws, { type: "res", id: m.id, ok: false, error: "method_not_allowed" });
      const agent = agents.get(conn.userId);
      if (!agent) return send(ws, { type: "res", id: m.id, ok: false, error: "agent_offline" });
      const routed = `${conn.id}:${++seq}`;
      const rid = m.id;
      pending.set(routed, {
        remote: conn,
        rid,
        agent,
        timer: setTimeout(() => {
          pending.delete(routed);
          send(ws, { type: "res", id: rid, ok: false, error: "timeout" });
        }, REQ_TIMEOUT_MS),
      });
      send(agent.ws, { type: "req", id: routed, method: m.method, params: m.params });
    });
    ws.on("close", () => {
      dropPending(conn);
      const set = remotes.get(conn.userId);
      set?.delete(conn);
      if (set && set.size === 0) remotes.delete(conn.userId);
      const a = agents.get(conn.userId);
      if (a) send(a.ws, { type: "viewers", n: remotes.get(conn.userId)?.size ?? 0 });
    });
  }

  /** Premier message obligatoire : authentification (5 s), puis le canal devient celui de l'agent ou du navigateur. */
  function accept(ws: WebSocket, kind: "agent" | "remote", ip: string) {
    const timer = setTimeout(() => ws.close(4001, "hello_timeout"), HELLO_TIMEOUT_MS);
    ws.once("message", async (raw) => {
      clearTimeout(timer);
      let m: { type?: string; token?: unknown; access?: unknown; name?: unknown; platform?: unknown; version?: unknown };
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
        const prev = agents.get(dev.user_id);
        const agent: Agent = { ws, id, userId: dev.user_id, deviceId: dev.id, name: String(m.name ?? dev.name).slice(0, 40), platform: String(m.platform ?? dev.platform).slice(0, 20), version: String(m.version ?? "").slice(0, 20) };
        agents.set(dev.user_id, agent);
        prev?.ws.close(4000, "replaced");
        void touch(dev.id);
        send(ws, { type: "ready", viewers: remotes.get(dev.user_id)?.size ?? 0 });
        toRemotes(dev.user_id, { type: "agent", ...agentInfo(dev.user_id) });
        o.log(`link ${dev.user_id.slice(0, 8)} : agent « ${agent.name} » connecté`);
        handleAgent(ws, agent);
      } else {
        const userId = typeof m.access === "string" ? await o.verifyUser(`Bearer ${m.access}`) : null;
        if (!userId || !o.canUse(userId)) return ws.close(4003, "unauthorized");
        const conn: Conn = { ws, id, userId };
        const set = remotes.get(userId) ?? new Set<Conn>();
        set.add(conn);
        remotes.set(userId, set);
        send(ws, { type: "ready", agent: agentInfo(userId) });
        const a = agents.get(userId);
        if (a) send(a.ws, { type: "viewers", n: set.size });
        setTimeout(() => ws.close(4004, "session_expired"), SESSION_MAX_MS).unref();
        handleRemote(ws, conn);
      }
    });
  }

  // ───── Appareils (Supabase) ─────
  async function findDevice(token: string): Promise<Device | null> {
    const { data } = await o.db.from("link_devices").select("id, user_id, name, platform, created_at, last_seen").eq("token_hash", hashToken(token)).maybeSingle();
    return (data as Device | null) ?? null;
  }
  const lastTouch = new Map<string, number>();
  async function touch(id: string) {
    if (now() - (lastTouch.get(id) ?? 0) < 60_000) return;
    lastTouch.set(id, now());
    await o.db.from("link_devices").update({ last_seen: new Date(now()).toISOString() }).eq("id", id);
  }

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

    /** Nouveau code d'appairage pour le compte (un seul code actif par compte). */
    newCode(userId: string) {
      for (const [c, v] of codes) if (v.userId === userId || v.expires < now()) codes.delete(c);
      const code = newPairCode();
      codes.set(code, { userId, expires: now() + CODE_TTL_MS });
      return { code, expires_in: CODE_TTL_MS / 1000 };
    },

    /** L'agent présente le code : renvoie un jeton d'appareil (affiché une seule fois) ou une erreur. */
    async claim(ip: string, code: unknown, name: unknown, platform: unknown): Promise<{ error: string } | { token: string; device_id: string }> {
      if (throttled(ip)) return { error: "too_many" };
      const key = typeof code === "string" ? code.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
      const c = codes.get(key);
      if (!c || c.expires < now() || !o.canUse(c.userId)) {
        fail(ip);
        return { error: "invalid_code" };
      }
      codes.delete(key); // usage unique
      const token = newDeviceToken();
      const { data, error } = await o.db
        .from("link_devices")
        .insert({ user_id: c.userId, token_hash: hashToken(token), name: String(name ?? "OBS").slice(0, 40) || "OBS", platform: String(platform ?? "").slice(0, 20) })
        .select("id")
        .single();
      if (error || !data) return { error: "server" };
      return { token, device_id: (data as { id: string }).id };
    },

    async devices(userId: string): Promise<(Device & { online: boolean })[]> {
      const { data } = await o.db.from("link_devices").select("id, user_id, name, platform, created_at, last_seen").eq("user_id", userId);
      const a = agents.get(userId);
      return ((data as Device[] | null) ?? []).map((d) => ({ ...d, online: a?.deviceId === d.id }));
    },

    async revoke(userId: string, deviceId: string): Promise<boolean> {
      const { data } = await o.db.from("link_devices").delete().eq("id", deviceId).eq("user_id", userId).select("id");
      const a = agents.get(userId);
      if (a?.deviceId === deviceId) a.ws.close(4005, "revoked");
      return Array.isArray(data) && data.length > 0;
    },

    canUse: o.canUse,
    status: (userId: string) => ({ agent: agentInfo(userId), remotes: remotes.get(userId)?.size ?? 0 }),

    close() {
      clearInterval(heartbeat);
      for (const ws of wss.clients) ws.terminate();
      wss.close();
    },
  };
}

export type Remote = ReturnType<typeof createRemote>;
