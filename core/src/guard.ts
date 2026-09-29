import { execFile } from "node:child_process";
import { createServer, request, type IncomingMessage } from "node:http";
import { isIP } from "node:net";
import { promisify } from "node:util";
import { isServiceToken } from "./auth.ts";
import { createSlsLogParser, type SlsEvent } from "./sls-log.ts";

// SYXTEE Guard : petit service root à côté du Core (conteneur séparé, réseau et PID de l'hôte, API Docker).
// Le Core n'a aucun droit système ; le Guard fait seulement deux choses, sans logique métier :
// 1. il suit le journal du srt-live-server (API Docker) et envoie au Core chaque connexion, refus ou 2e appareil ;
// 2. il applique les ordres du Core avec iptables DANS le réseau du conteneur srtla-receiver :
//    - couper une session : DROP de l'IP:port source (UDP) pendant 60 s, le SLS ferme la connexion en ~5 s ;
//    - bannir une IP : DROP de tout son trafic vers le relais (SRT, SRTLA) jusqu'à expiration.
// API locale (127.0.0.1:GUARD_PORT, jeton CORE_API_TOKEN) : POST /kick, POST /ban, POST /unban.

const run = promisify(execFile);
const env = process.env;
const TOKEN = env.CORE_API_TOKEN ?? "";
const CONTAINER = env.GUARD_SLS_CONTAINER ?? "srtla-receiver";
const PORT = Number(env.GUARD_PORT ?? 8788);
const CORE = env.GUARD_CORE_URL ?? `http://127.0.0.1:${env.PORT ?? 8787}`;
const SOCKET = env.DOCKER_SOCKET ?? "/var/run/docker.sock";
const CHAIN = "SYXTEE-GUARD";
const log = (m: string) => console.log(`[guard] ${m}`);
if (TOKEN.length < 32) throw new Error("CORE_API_TOKEN manquant");

// ───── API Docker (socket Unix) ─────
function docker(path: string): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = request({ socketPath: SOCKET, path, method: "GET" }, resolve);
    req.on("error", reject);
    req.end();
  });
}
async function inspect(): Promise<{ pid: number } | null> {
  const res = await docker(`/containers/${CONTAINER}/json`);
  let body = "";
  for await (const c of res) body += c;
  if (res.statusCode !== 200) return null;
  const pid = (JSON.parse(body) as { State?: { Pid?: number; Running?: boolean } }).State;
  return pid?.Running && pid.Pid ? { pid: pid.Pid } : null;
}

// ───── iptables dans le réseau du conteneur du relais ─────
let pid = 0;
const bans = new Map<string, number>(); // IP → fin (ms)
const kicks = new Map<string, { ip: string; port: number; until: number }>();

const tool = (ip: string) => (isIP(ip) === 6 ? "ip6tables" : "iptables");
async function ipt(ip: string, args: string[]) {
  if (!pid) throw new Error("conteneur du relais introuvable");
  await run("nsenter", ["-t", String(pid), "-n", tool(ip), "-w", ...args]);
}
async function setupChain() {
  for (const t of ["iptables", "ip6tables"]) {
    const x = (args: string[]) => run("nsenter", ["-t", String(pid), "-n", t, "-w", ...args]);
    await x(["-N", CHAIN]).catch(() => x(["-F", CHAIN]));
    await x(["-C", "INPUT", "-j", CHAIN]).catch(() => x(["-I", "INPUT", "1", "-j", CHAIN]));
  }
  for (const ip of bans.keys()) await ipt(ip, ["-A", CHAIN, "-s", ip, "-j", "DROP"]).catch(() => {});
}
async function refreshPid() {
  try {
    const c = await inspect();
    if (c && c.pid !== pid) {
      pid = c.pid;
      kicks.clear();
      await setupChain();
      log(`relais ${CONTAINER} (pid ${pid}) : chaîne ${CHAIN} prête, ${bans.size} IP bannie(s)`);
    }
    if (!c) pid = 0;
  } catch (e) {
    log(`docker : ${(e as Error).message}`);
  }
}

async function ban(ip: string, seconds: number) {
  const had = bans.has(ip);
  bans.set(ip, Date.now() + seconds * 1000);
  if (!had) await ipt(ip, ["-A", CHAIN, "-s", ip, "-j", "DROP"]);
}
async function unban(ip: string) {
  if (!bans.delete(ip)) return;
  await ipt(ip, ["-D", CHAIN, "-s", ip, "-j", "DROP"]).catch(() => {});
}
async function kick(ip: string, port: number, seconds: number) {
  const id = `${ip}:${port}`;
  const had = kicks.has(id);
  kicks.set(id, { ip, port, until: Date.now() + seconds * 1000 });
  if (!had) await ipt(ip, ["-I", CHAIN, "1", "-p", "udp", "-s", ip, "--sport", String(port), "-j", "DROP"]);
}
async function expire() {
  const now = Date.now();
  for (const [ip, until] of bans) if (until <= now) await unban(ip);
  for (const [id, k] of kicks)
    if (k.until <= now) {
      kicks.delete(id);
      await ipt(k.ip, ["-D", CHAIN, "-p", "udp", "-s", k.ip, "--sport", String(k.port), "-j", "DROP"]).catch(() => {});
    }
}

// ───── Journal du SLS → Core ─────
const parse = createSlsLogParser();
let queue: SlsEvent[] = [];
async function flush() {
  if (!queue.length) return;
  const events = queue;
  queue = [];
  try {
    const res = await fetch(`${CORE}/internal/guard/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    queue = [...events, ...queue].slice(-2000); // Core en redémarrage : on garde les événements
    log(`envoi au Core impossible : ${(e as Error).message}`);
  }
}

/** Flux de logs Docker (sans TTY) : trames de 8 octets d'en-tête + contenu. */
async function follow() {
  let since = Math.floor(Date.now() / 1000);
  for (;;) {
    try {
      const res = await docker(`/containers/${CONTAINER}/logs?follow=1&stdout=1&stderr=1&since=${since}`);
      if (res.statusCode !== 200) throw new Error(`logs HTTP ${res.statusCode}`);
      let buf = Buffer.alloc(0);
      let text = "";
      for await (const chunk of res) {
        buf = Buffer.concat([buf, chunk as Buffer]);
        while (buf.length >= 8) {
          const size = buf.readUInt32BE(4);
          if (buf.length < 8 + size) break;
          text += buf.subarray(8, 8 + size).toString("utf8");
          buf = buf.subarray(8 + size);
        }
        const lines = text.split("\n");
        text = lines.pop() ?? "";
        for (const l of lines) {
          const e = parse(l);
          if (e) queue.push(e);
        }
        since = Math.floor(Date.now() / 1000);
      }
    } catch (e) {
      log(`journal du relais : ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

// ───── Bannissements actifs, relus au Core (source de vérité) ─────
async function syncBans() {
  try {
    const res = await fetch(`${CORE}/internal/guard/bans`, { headers: { Authorization: `Bearer ${TOKEN}` }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return;
    const { bans: list } = (await res.json()) as { bans: { ip: string; until: string }[] };
    const want = new Map(list.filter((b) => isIP(b.ip)).map((b) => [b.ip, Date.parse(b.until)]));
    for (const ip of [...bans.keys()]) if (!want.has(ip)) await unban(ip);
    for (const [ip, until] of want) if (until > Date.now()) await ban(ip, Math.ceil((until - Date.now()) / 1000));
  } catch {
    // Core absent : on garde l'état actuel
  }
}

// ───── API locale ─────
const server = createServer((req, res) => {
  const reply = (code: number, body: unknown = {}) => (res.writeHead(code, { "Content-Type": "application/json" }), res.end(JSON.stringify(body)));
  if (!isServiceToken(req.headers.authorization, TOKEN)) return reply(401, { error: "unauthorized" });
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", async () => {
    try {
      const p = JSON.parse(body || "{}") as { ip?: string; port?: number; seconds?: number; targets?: { ip: string; port: number }[] };
      const seconds = Math.min(Math.max(Number(p.seconds) || 60, 5), 30 * 86_400);
      if (req.method === "POST" && req.url === "/kick") {
        const targets = (p.targets ?? []).filter((t) => isIP(t.ip) && Number.isInteger(t.port) && t.port > 0 && t.port < 65536);
        for (const t of targets) await kick(t.ip, t.port, seconds);
        log(`${targets.length} session(s) coupée(s)`);
        return reply(200, { kicked: targets.length });
      }
      if (req.method === "POST" && req.url === "/ban" && p.ip && isIP(p.ip)) {
        await ban(p.ip, seconds);
        log(`IP ${p.ip} bannie ${seconds} s`);
        return reply(200, { ok: true });
      }
      if (req.method === "POST" && req.url === "/unban" && p.ip && isIP(p.ip)) {
        await unban(p.ip);
        return reply(200, { ok: true });
      }
      if (req.method === "GET" && req.url === "/health") return reply(200, { ok: pid > 0, pid, bans: bans.size, kicks: kicks.size });
      reply(404, { error: "not_found" });
    } catch (e) {
      reply(500, { error: (e as Error).message });
    }
  });
});

await refreshPid();
await syncBans();
void follow();
setInterval(() => void flush(), 500);
setInterval(() => void refreshPid(), 5000);
setInterval(() => void expire(), 1000);
setInterval(() => void syncBans(), 60_000);
server.listen(PORT, "127.0.0.1", () => log(`prêt sur 127.0.0.1:${PORT} · relais ${CONTAINER}`));
