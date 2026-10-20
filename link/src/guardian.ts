import { execFile, spawn, type ChildProcess } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { VERSION } from "./agent.ts";
import { load } from "./config.ts";
import { obsRoot } from "./obsconfig.ts";
import { DEFAULT_SETTINGS, readObsExe, readSession, readSettings, readStreaming, writeResume, writeSettings, type GuardianSettings } from "./state.ts";
import { osLabel } from "./system.ts";
import { refreshTokens } from "./tokens.ts";
import { findObsWin, keepAwakeWin, killObsWin, launchObsWin } from "./winobs.ts";

// Gardien SYXTEE : petit processus lancé à l'ouverture de session (launchd sur Mac, clé Run sur Windows), indépendant d'OBS.
//  - garde le PC éveillé (caffeinate sur Mac, SetThreadExecutionState sur Windows) : écran verrouillé, le direct continue ;
//  - relance OBS s'il plante (jamais s'il est fermé normalement) et reprend le direct s'il était actif ;
//  - reste connecté au Core quand OBS est tombé : le site affiche « OBS hors ligne » avec un bouton « Relancer OBS ».

/** Au plus 3 relances automatiques par quart d'heure : en cas de boucle de plantages, le Gardien s'arrête et le dit. */
export const MAX_AUTO_RESTARTS = 3;
export const RESTART_WINDOW_MS = 15 * 60_000;
const RELAUNCH_DELAY_MS = 4_000;
const POLL_MS = 2_000;

export type Deps = {
  /** pid d'OBS s'il tourne, sinon null. */
  findObs: () => Promise<number | null>;
  launchObs: () => Promise<void>;
  kill: (pid: number, signal: NodeJS.Signals) => void;
  now: () => number;
  log: (m: string) => void;
};

export type GuardianStatus = { obs: boolean; watch: boolean; resume: boolean; awake: boolean; restarts: number; gaveUp: boolean; crashedAt: number; launching: boolean };

/** Cœur du Gardien (sans réseau) : détecte la fin d'OBS, décide de relancer. Les dépendances sont injectées pour les tests. */
export class ObsWatch {
  settings: GuardianSettings = { ...DEFAULT_SETTINGS };
  obsPid: number | null = null;
  private seenPid: number | null = null;
  private restartTimes: number[] = [];
  private pendingLaunch: ReturnType<typeof setTimeout> | null = null;
  /** Fin d'OBS voulue par le Gardien (redémarrage demandé) : ne compte pas comme un plantage. */
  private expected = false;
  gaveUp = false;
  crashedAt = 0;
  launching = false;
  onChange: () => void = () => {};

  /** Dépendances (publiques : les tests les remplacent). */
  d: Deps;

  constructor(d: Deps) {
    this.d = d;
  }

  get restarts() {
    return this.restartTimes.filter((t) => this.d.now() - t < RESTART_WINDOW_MS).length;
  }

  /** Un tour de surveillance (toutes les 2 s). */
  async tick(): Promise<void> {
    const pid = await this.d.findObs().catch(() => null);
    const was = this.obsPid;
    this.obsPid = pid;
    if (pid !== null && was === null) {
      this.seenPid = pid;
      this.launching = false;
      this.gaveUp = false;
      this.d.log(`OBS ouvert (pid ${pid})`);
      this.onChange();
    } else if (pid === null && was !== null) {
      this.onGone(was);
      this.onChange();
    }
  }

  private onGone(pid: number) {
    if (this.expected) {
      this.expected = false;
      return;
    }
    const s = readSession();
    // Le plugin note la fermeture normale d'OBS. Sans note pour ce processus (ancien plugin, plugin absent) : on ne relance pas.
    if (!s || s.pid !== pid) {
      this.d.log(`OBS terminé (pid ${pid}) : fermeture non identifiée, pas de relance`);
      return;
    }
    if (s.exited) {
      this.d.log("OBS fermé normalement");
      return;
    }
    this.crashedAt = this.d.now();
    this.d.log(`OBS a planté (pid ${pid})`);
    if (!this.settings.watch) return;
    this.autoRelaunch();
  }

  private autoRelaunch() {
    const now = this.d.now();
    this.restartTimes = this.restartTimes.filter((t) => now - t < RESTART_WINDOW_MS);
    if (this.restartTimes.length >= MAX_AUTO_RESTARTS) {
      this.gaveUp = true;
      this.d.log(`${MAX_AUTO_RESTARTS} plantages en 15 min : relance automatique suspendue`);
      return;
    }
    this.restartTimes.push(now);
    this.launching = true;
    if (this.settings.resume && readStreaming()) writeResume();
    this.pendingLaunch = setTimeout(() => {
      this.pendingLaunch = null;
      void this.launch();
    }, RELAUNCH_DELAY_MS);
  }

  private async launch() {
    if ((await this.d.findObs().catch(() => null)) !== null) return;
    this.d.log("relance d'OBS");
    await this.d.launchObs().catch((e) => this.d.log(`relance impossible : ${(e as Error).message}`));
    this.onChange();
  }

  /** Demande du site : lance OBS s'il est fermé. Remet le compteur à zéro. */
  async manualLaunch(): Promise<void> {
    if ((await this.d.findObs().catch(() => null)) !== null) throw new Error("OBS est déjà ouvert.");
    this.restartTimes = [];
    this.gaveUp = false;
    this.launching = true;
    if (this.pendingLaunch) clearTimeout(this.pendingLaunch);
    this.pendingLaunch = null;
    this.d.log("lancement d'OBS demandé depuis le site");
    try {
      await this.d.launchObs();
    } catch (e) {
      this.launching = false;
      throw e;
    } finally {
      this.onChange();
    }
  }

  /** Demande du site : ferme OBS (même gelé) puis le rouvre. Reprend le direct s'il était actif. */
  async restartObs(): Promise<void> {
    const pid = await this.d.findObs().catch(() => null);
    if (pid !== null) {
      this.expected = true;
      if (this.settings.resume && readStreaming()) writeResume();
      this.d.kill(pid, "SIGTERM");
      const until = this.d.now() + 12_000;
      while (this.d.now() < until && (await this.d.findObs().catch(() => null)) !== null) await sleep(500);
      const still = await this.d.findObs().catch(() => null);
      if (still !== null) {
        this.d.kill(still, "SIGKILL"); // OBS gelé : il ne répond plus à l'arrêt normal
        await sleep(1500);
      }
      await sleep(1500);
    }
    await this.manualLaunch();
  }

  status(awake: boolean): GuardianStatus {
    return { obs: this.obsPid !== null, watch: this.settings.watch, resume: this.settings.resume, awake, restarts: this.restarts, gaveUp: this.gaveUp, crashedAt: this.crashedAt, launching: this.launching };
  }

  stop() {
    if (this.pendingLaunch) clearTimeout(this.pendingLaunch);
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** OBS sur macOS : processus « OBS ». */
const findObsMac = () =>
  new Promise<number | null>((resolve) => {
    execFile("pgrep", ["-x", "OBS"], (err, out) => {
      const pid = Number(String(out).split("\n")[0]);
      resolve(!err && pid > 0 ? pid : null);
    });
  });

/**
 * OBS note chaque exécution par un fichier `run_<id>` dans `.sentinel` et le retire à la fermeture normale. Un fichier resté là au démarrage
 * déclenche la fenêtre « OBS ne s'est pas arrêté correctement » (mode sans échec) : personne n'est là pour cliquer, donc on les retire avant la relance.
 * À n'appeler que lorsqu'OBS est fermé.
 */
export function clearCrashSentinel(dir = join(obsRoot(), ".sentinel")): number {
  let n = 0;
  try {
    for (const f of readdirSync(dir)) {
      if (!/^run_[0-9a-f-]+$/i.test(f)) continue;
      rmSync(join(dir, f), { force: true });
      n++;
    }
  } catch {
    // pas de dossier : rien à nettoyer
  }
  return n;
}

const launchObsMac = async () => {
  if ((await findObsMac()) !== null) throw new Error("OBS est déjà ouvert.");
  clearCrashSentinel();
  await new Promise<void>((resolve, reject) => {
    execFile("open", ["-a", "OBS", "--args", "--disable-missing-files-check"], (err) => (err ? reject(new Error("OBS est introuvable sur ce Mac.")) : resolve()));
  });
};

const isMac = process.platform === "darwin";
const isWin = process.platform === "win32";

/** Arrêt d'OBS demandé par le Gardien : SIGTERM = fermeture normale (taskkill sans /F sur Windows), SIGKILL = OBS gelé. */
const killObs = (pid: number, sig: NodeJS.Signals) => (isWin ? killObsWin(pid, sig === "SIGKILL") : process.kill(pid, sig));

export function startGuardian(opts: { log?: (m: string) => void } = {}) {
  const log = opts.log ?? (() => {});
  if (!isMac && !isWin) {
    log("Le Gardien n'est disponible que sur macOS et Windows pour l'instant.");
    return { stop() {} };
  }
  const watch = new ObsWatch(isWin ? { findObs: findObsWin, launchObs: () => launchObsWin(clearCrashSentinel, readObsExe()), kill: killObs, now: Date.now, log } : { findObs: findObsMac, launchObs: launchObsMac, kill: killObs, now: Date.now, log });
  watch.settings = readSettings();

  // Garde le PC éveillé tant que la surveillance est active : veille système et veille du disque (l'écran peut s'éteindre et se verrouiller).
  let awake: ChildProcess | null = null;
  let stopped = false;
  const syncAwake = () => {
    if (stopped) return;
    if (watch.settings.watch && !awake) {
      awake = isWin ? keepAwakeWin(process.pid) : spawn("caffeinate", ["-i", "-m", "-s"], { stdio: "ignore" });
      awake.on("exit", () => {
        awake = null;
        if (!stopped) setTimeout(syncAwake, 2000);
      });
      awake.on("error", () => (awake = null));
    } else if (!watch.settings.watch && awake) {
      awake.kill();
      awake = null;
    }
  };
  syncAwake();

  const status = () => watch.status(awake !== null);
  let ws: WebSocket | null = null;
  const push = () => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "status", status: status() }));
  };
  watch.onChange = push;
  const poll = setInterval(() => void watch.tick().catch((e) => log(`surveillance : ${(e as Error).message}`)), POLL_MS);
  void watch.tick();
  const beat = setInterval(push, 20_000);

  // ───── Core ─────
  let sentToken = "";
  let delay = 3000;
  let retry: ReturnType<typeof setTimeout> | null = null;
  const later = (ms: number) => {
    if (!stopped) retry = setTimeout(() => void connect(), ms);
  };

  async function connect() {
    if (stopped) return;
    let cfg = load();
    // L'agent (dans OBS) renouvelle les jetons tant qu'il tourne. Le Gardien ne le fait que si le jeton est périmé depuis un moment : OBS est donc tombé.
    if (cfg.token && cfg.refresh && cfg.expires && Date.now() > cfg.expires + 30_000) {
      cfg = load();
      if (Date.now() > cfg.expires + 30_000) await refreshTokens(cfg);
    }
    if (!cfg.token) return later(30_000); // PC pas encore connecté au compte
    let sock: WebSocket;
    try {
      sock = new WebSocket(`${cfg.core.replace(/^http/, "ws")}/v1/link/guardian`);
    } catch {
      return later(30_000);
    }
    ws = sock;
    sentToken = cfg.token;
    sock.onopen = () => sock.send(JSON.stringify({ type: "hello", token: cfg.token, name: hostname(), platform: process.platform, os: osLabel(), host: hostname(), version: VERSION }));
    sock.onmessage = (ev) => {
      let m: { type?: string; id?: string; method?: string; params?: Record<string, unknown> };
      try {
        m = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (m.type === "ready") {
        delay = 3000;
        push();
      } else if (m.type === "req" && typeof m.id === "string" && typeof m.method === "string") void handle(sock, m.id, m.method, m.params ?? {});
    };
    sock.onclose = (e) => {
      if (ws === sock) ws = null;
      if (e.code === 4005) return later(5 * 60_000); // appareil révoqué : il faut le reconnecter
      if (e.code === 4003 || e.code === 4006) delay = 5000;
      later(delay);
      delay = Math.min(delay * 2, 60_000);
    };
    sock.onerror = () => {};
  }

  async function handle(sock: WebSocket, id: string, method: string, params: Record<string, unknown>) {
    const reply = (ok: boolean, result?: unknown, error?: string) => sock.readyState === WebSocket.OPEN && sock.send(JSON.stringify({ type: "res", id, ok, result, error }));
    try {
      if (method === "guardian.status") return reply(true, { ...status(), version: VERSION });
      if (method === "guardian.launchObs") {
        await watch.manualLaunch();
        return reply(true, {});
      }
      if (method === "guardian.restartObs") {
        void watch.restartObs().catch((e) => log(`redémarrage d'OBS : ${(e as Error).message}`));
        return reply(true, {});
      }
      if (method === "guardian.setWatch" || method === "guardian.setResume") {
        const on = params.enabled === true;
        if (method === "guardian.setWatch") watch.settings.watch = on;
        else watch.settings.resume = on;
        writeSettings(watch.settings);
        syncAwake();
        push();
        return reply(true, status());
      }
      reply(false, undefined, "méthode inconnue");
    } catch (e) {
      reply(false, undefined, (e as Error).message);
    }
  }

  // Jeton renouvelé par l'agent (ou plus tard par nous) : la session ouverte le reçoit sans coupure.
  const tokens = setInterval(() => {
    const cfg = load();
    if (ws?.readyState === WebSocket.OPEN && cfg.token && cfg.token !== sentToken) {
      sentToken = cfg.token;
      ws.send(JSON.stringify({ type: "reauth", token: cfg.token }));
    }
  }, 60_000);

  void connect();

  return {
    stop() {
      stopped = true;
      clearInterval(poll);
      clearInterval(beat);
      clearInterval(tokens);
      if (retry) clearTimeout(retry);
      watch.stop();
      awake?.kill();
      ws?.close();
    },
  };
}
