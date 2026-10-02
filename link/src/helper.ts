import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Agent, VERSION } from "./agent.ts";
import { cleanBackup } from "./backup.ts";
import { cloudError } from "./cloud.ts";
import { load, save, type LinkConfig } from "./config.ts";
import { Login } from "./login.ts";
import { listCollections } from "./obsconfig.ts";
import { PANEL } from "./panel.ts";
import { plan } from "./scenesync.ts";
import { askBackup, openUrl } from "./system.ts";

// SYXTEE Link (agent du plugin OBS) : tourne en arrière-plan avec OBS. Il pilote OBS en local (obs-websocket), se connecte au serveur
// SYXTEE (sortant), sauvegarde les scènes dans l'espace du compte et sert une petite page de réglages sur 127.0.0.1.
// Le plugin OBS le lance au démarrage d'OBS (--parent-pid) et il s'arrête quand OBS se ferme.

export const PORT = Number(process.env.SYXTEE_LINK_PORT) || 47831;

export function startHelper(opts: { parentPid?: number; log?: (m: string) => void; openOnFirstRun?: boolean } = {}) {
  const cfg: LinkConfig = load();
  const logs: string[] = [];
  const log = (m: string) => {
    logs.push(`${new Date().toLocaleTimeString("fr-FR")}  ${m}`);
    if (logs.length > 60) logs.shift();
    opts.log?.(m);
  };
  const csrf = randomBytes(24).toString("hex");
  let agent: Agent | null = null;

  const login = new Login(cfg.core, cfg.site, (token) => {
    cfg.token = token;
    cfg.onboarded = false;
    save(cfg);
    startAgent();
    log("connecté au compte SYXTEE");
    // Proposition de sauvegarde avant toute utilisation : boîte native, sinon la page locale montre le même écran.
    void askBackup().then((yes) => {
      if (yes) openUrl(`http://127.0.0.1:${PORT}/`);
    });
  });

  function startAgent() {
    agent?.stop();
    agent = null;
    if (!cfg.token) return;
    agent = new Agent(cfg, log);
    agent.start();
  }

  const cloud = async () => {
    const res = await fetch(`${cfg.core}/v1/link/backups`, { headers: { authorization: `Bearer ${cfg.token}` }, signal: AbortSignal.timeout(10_000) }).catch(() => null);
    if (!res) return { error: "Serveur injoignable." };
    const j = (await res.json().catch(() => ({}))) as { backups?: unknown[]; used?: number; quota?: number; error?: string };
    return res.ok ? j : { error: cloudError(j.error) };
  };

  const state = () => ({
    version: VERSION,
    paired: cfg.token !== "",
    onboarded: cfg.onboarded,
    login: login.state,
    status: agent?.status ?? { core: "off", obs: "off", obsVersion: "", backup: "idle", lastError: "", viewers: 0, job: null },
    backup: cfg.backup,
    obsCustom: cfg.obs.password !== "",
    logs,
  });

  async function route(req: IncomingMessage, res: ServerResponse) {
    const host = String(req.headers.host ?? "");
    // Seule la page locale peut parler à l'agent : hôte loopback (anti DNS rebinding) et jeton propre à cette exécution.
    if (host !== `127.0.0.1:${PORT}` && host !== `localhost:${PORT}`) return end(res, 403, "hôte refusé");
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY" });
      return void res.end(PANEL.replace("__CSRF__", csrf));
    }
    if (!url.pathname.startsWith("/api/") || req.headers["x-syxtee"] !== csrf) return end(res, 403, "refusé");
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      const parts: Buffer[] = [];
      let n = 0;
      for await (const c of req) {
        n += (c as Buffer).length;
        if (n > 64 * 1024) return end(res, 413, "trop gros");
        parts.push(c as Buffer);
      }
      try {
        body = JSON.parse(Buffer.concat(parts).toString("utf8") || "{}");
      } catch {
        return end(res, 400, "json");
      }
    }
    const json = (v: unknown) => {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(v));
    };
    switch (`${req.method} ${url.pathname}`) {
      case "GET /api/state":
        return json(state());
      case "GET /api/collections": {
        const rows = await Promise.all(listCollections().map(async (name) => ({ name, ...(await plan(name).then((p) => ({ media: p.media.length, bytes: p.bytes })).catch(() => ({ media: 0, bytes: 0 }))) })));
        return json({ collections: rows });
      }
      case "GET /api/cloud":
        return json(cfg.token ? await cloud() : { error: "Non connecté." });
      case "GET /api/options": {
        try {
          const [sl, il] = await Promise.all([agent!.obsRequest("GetSceneList"), agent!.obsRequest("GetInputList")]);
          return json({ scenes: ((sl.scenes as { sceneName: string }[]) ?? []).map((s) => s.sceneName).reverse(), inputs: ((il.inputs as { inputName: string }[]) ?? []).map((i) => i.inputName) });
        } catch {
          return json({ scenes: [], inputs: [] });
        }
      }
      case "POST /api/login/start":
        void login.start();
        return json({ ok: true });
      case "POST /api/login/reopen":
        login.reopen();
        return json({ ok: true });
      case "POST /api/login/cancel":
        login.cancel();
        return json({ ok: true });
      case "POST /api/unpair":
        cfg.token = "";
        save(cfg);
        startAgent();
        return json({ ok: true });
      case "POST /api/onboarded":
        cfg.onboarded = true;
        save(cfg);
        return json({ ok: true });
      case "POST /api/backup":
        void agent?.runBackup(String(body.collection ?? ""));
        return json({ ok: true });
      case "POST /api/restore":
        void agent?.runRestore(String(body.id ?? ""));
        return json({ ok: true });
      case "POST /api/switch":
        cfg.backup = cleanBackup(body, cfg.backup);
        save(cfg);
        agent?.setBackup(cfg.backup);
        return json({ ok: true });
      case "POST /api/obs":
        cfg.obs.password = typeof body.password === "string" ? body.password : cfg.obs.password;
        save(cfg);
        startAgent();
        return json({ ok: true });
      default:
        return end(res, 404, "inconnu");
    }
  }

  const server = createServer((req, res) => {
    route(req, res).catch((e) => {
      log(`interface locale : ${(e as Error).message}`);
      if (!res.headersSent) end(res, 500, "erreur");
    });
  });
  server.on("error", (e) => log(`interface locale indisponible : ${(e as Error).message}`));
  server.listen(PORT, "127.0.0.1");

  startAgent();
  // Premier lancement (pas encore connecté) : ouvre la connexion tout de suite, sans rien demander.
  if (!cfg.token && opts.openOnFirstRun !== false) {
    void login.start();
  }

  // S'arrête avec OBS.
  let watch: ReturnType<typeof setInterval> | null = null;
  if (opts.parentPid) {
    watch = setInterval(() => {
      try {
        process.kill(opts.parentPid!, 0);
      } catch {
        stop();
        process.exit(0);
      }
    }, 2000);
  }

  function stop() {
    if (watch) clearInterval(watch);
    agent?.stop();
    login.cancel();
    server.close();
  }

  return { stop, state, openPanel: () => openUrl(`http://127.0.0.1:${PORT}/`), cfg, login: () => login };
}

function end(res: ServerResponse, code: number, msg: string) {
  res.writeHead(code, { "content-type": "text/plain; charset=utf-8" });
  res.end(msg);
}
