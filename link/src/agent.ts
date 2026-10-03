import { rm } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { BackupWatcher, cleanBackup } from "./backup.ts";
import { downloadArchive, uploadArchive } from "./cloud.ts";
import { save, type LinkConfig } from "./config.ts";
import { ObsClient } from "./obs.ts";
import { listCollections, readObsWebsocket } from "./obsconfig.ts";
import { createArchive, plan, restoreArchive } from "./scenesync.ts";

export const VERSION = "0.2.0";

/** Méthodes OBS que le Core laisse passer (liste blanche aussi appliquée ici : l'agent ne fait pas confiance au serveur). */
export const OBS_METHODS = new Set([
  "GetVersion", "GetStats", "GetSceneList", "GetCurrentProgramScene", "GetCurrentPreviewScene", "GetSceneItemList", "GetInputList",
  "GetInputMute", "GetInputVolume", "GetStreamStatus", "GetRecordStatus", "GetStudioModeEnabled", "GetMediaInputStatus", "GetSourceScreenshot",
  "GetSceneTransitionList", "GetCurrentSceneTransition", "GetVideoSettings",
  "SetCurrentProgramScene", "SetCurrentSceneTransition", "SetCurrentPreviewScene", "SetStudioModeEnabled", "TriggerStudioModeTransition", "SetSceneItemEnabled",
  "SetInputMute", "SetInputVolume", "StartStream", "StopStream", "ToggleStream", "StartRecord", "StopRecord", "ToggleRecord", "PauseRecord", "ResumeRecord",
]);

/** Événements OBS relayés vers le navigateur (les niveaux audio sont limités à 5 images par seconde). */
const EVENTS = new Set([
  "CurrentProgramSceneChanged", "CurrentPreviewSceneChanged", "SceneListChanged", "StreamStateChanged", "RecordStateChanged",
  "InputMuteStateChanged", "InputVolumeChanged", "SceneItemEnableStateChanged", "StudioModeStateChanged", "ExitStarted",
]);

export type Job = { kind: "backup" | "restore"; state: "running" | "done" | "error"; progress: number; message: string } | null;

export type Status = { core: "off" | "connecting" | "on"; obs: "off" | "connecting" | "on"; obsVersion: string; backup: BackupWatcher["state"]; lastError: string; viewers: number; job: Job };

/**
 * Relie OBS (local) et le Core (sortant). Se reconnecte seul aux deux. N'ouvre aucun port : la connexion part du PC.
 */
export class Agent {
  status: Status = { core: "off", obs: "off", obsVersion: "", backup: "idle", lastError: "", viewers: 0, job: null };
  onStatus: (s: Status) => void = () => {};
  private obs = new ObsClient();
  private core: WebSocket | null = null;
  private stopped = false;
  private watcher: BackupWatcher;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private lastMeters = 0;
  private obsBusy = false;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;
  private previewScene = "";
  private previewSceneAt = 0;
  private studioScene = "";
  private previewTick = 0;

  private cfg: LinkConfig;
  private log: (m: string) => void;

  constructor(cfg: LinkConfig, log: (m: string) => void = () => {}) {
    this.cfg = cfg;
    this.log = log;
    this.watcher = new BackupWatcher((t, d) => this.obs.request(t, d), log);
    this.watcher.set(cfg.backup);
    this.watcher.onChange = (s) => {
      this.status.backup = s;
      this.emit();
      this.send({ type: "event", name: "link.backupState", data: { state: s } });
    };
  }

  start() {
    this.stopped = false;
    void this.connectObs();
    this.connectCore();
    this.tickTimer = setInterval(() => void this.watcher.tick(), 1000);
    void this.previewLoop();
  }

  stop() {
    this.stopped = true;
    this.timers.forEach(clearTimeout);
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.previewTimer) clearTimeout(this.previewTimer);
    this.core?.close();
    this.obs.close();
  }

  /** Nouveau réglage du backup (appelé par l'application). */
  setBackup(b: LinkConfig["backup"]) {
    this.cfg.backup = b;
    this.watcher.set(b);
  }

  /** Requête directe à OBS (listes de scènes et de sources pour l'interface). */
  obsRequest(type: string, data?: Record<string, unknown>) {
    return this.obs.request(type, data);
  }

  // ───── Sauvegarde et restauration des scènes ─────
  private setJob(j: Job) {
    this.status.job = j;
    this.send({ type: "event", name: "link.job", data: j });
    this.emit();
  }

  /** Sauvegarde une collection (scènes + médias) dans l'espace du compte. Un seul travail à la fois. */
  async runBackup(collection: string): Promise<boolean> {
    if (this.status.job?.state === "running") return false;
    const file = join(tmpdir(), `syxtee-link-${Date.now()}.tgz`);
    try {
      this.setJob({ kind: "backup", state: "running", progress: 0, message: "Préparation de l'archive…" });
      let last = 0;
      const tick = (p: number, message: string) => {
        if (Date.now() - last < 500) return;
        last = Date.now();
        this.setJob({ kind: "backup", state: "running", progress: p, message });
      };
      const a = await createArchive(collection, file, { obs: this.status.obsVersion, host: hostName(), onProgress: (d, t) => tick(t ? (d / t) * 0.5 : 0, "Compression des scènes et médias…") });
      await uploadArchive(this.cfg.core, this.cfg.token, file, a.size, { name: collection, collection, media: a.media, obs: this.status.obsVersion, host: hostName() }, (s, t) => tick(0.5 + (s / t) * 0.5, "Envoi vers ton espace…"));
      this.setJob({ kind: "backup", state: "done", progress: 1, message: `« ${collection} » sauvegardée (${a.media} média${a.media > 1 ? "s" : ""}).` });
      this.log(`sauvegarde « ${collection} » terminée`);
      return true;
    } catch (e) {
      this.setJob({ kind: "backup", state: "error", progress: 0, message: (e as Error).message });
      this.log(`sauvegarde échouée : ${(e as Error).message}`);
      return false;
    } finally {
      await rm(file, { force: true });
    }
  }

  /** Restaure une sauvegarde de l'espace du compte : ajoute une collection « … (SYXTEE) » à OBS. */
  async runRestore(id: string): Promise<boolean> {
    if (this.status.job?.state === "running") return false;
    try {
      this.setJob({ kind: "restore", state: "running", progress: 0, message: "Téléchargement…" });
      const stream = await downloadArchive(this.cfg.core, this.cfg.token, id);
      let last = 0;
      const r = await restoreArchive(stream, id, (b) => {
        if (Date.now() - last < 500) return;
        last = Date.now();
        this.setJob({ kind: "restore", state: "running", progress: 0.5, message: `Restauration… ${(b / 1e6).toFixed(0)} Mo` });
      });
      this.setJob({ kind: "restore", state: "done", progress: 1, message: `Collection « ${r.collection} » ajoutée. Dans OBS : menu Collection de scènes.` });
      this.log(`restauration → ${r.collection}`);
      return true;
    } catch (e) {
      this.setJob({ kind: "restore", state: "error", progress: 0, message: (e as Error).message });
      return false;
    }
  }

  /** Aperçu du programme pour le navigateur : environ 10 images par seconde, seulement si quelqu'un regarde.
   *  Boucle auto-cadencée : l'image suivante part dès que la précédente est faite, sans jamais en empiler. */
  private async previewLoop() {
    if (this.stopped) return;
    const t0 = Date.now();
    let delay = 100;
    try {
      delay = (await this.preview()) ? Math.max(0, 100 - (Date.now() - t0)) : 400;
    } catch {
      // OBS occupé ou scène en cours de changement : on réessaie au prochain tour.
      delay = 300;
    }
    this.previewTimer = setTimeout(() => void this.previewLoop(), delay);
  }

  /** Envoie une image. Renvoie false si rien n'a été envoyé (personne ne regarde, OBS fermé, réseau saturé). */
  private async preview(): Promise<boolean> {
    if (this.status.viewers <= 0 || !this.obs.connected) return false;
    // Réseau lent : on saute des images plutôt que d'accumuler du retard.
    if ((this.core?.bufferedAmount ?? 0) > 256 * 1024) return false;
    // La scène du programme change rarement : on la relit une fois par seconde, et dès qu'OBS la change.
    if (!this.previewScene || Date.now() - this.previewSceneAt > 1000) {
      const cur = (await this.obs.request("GetCurrentProgramScene")) as { currentProgramSceneName?: string };
      this.previewScene = String(cur.currentProgramSceneName ?? "");
      // Mode Studio : OBS a deux scènes, le programme (en direct) et l'aperçu (préparé hors antenne).
      const sm = (await this.obs.request("GetStudioModeEnabled")) as { studioModeEnabled?: boolean };
      this.studioScene = sm.studioModeEnabled ? String(((await this.obs.request("GetCurrentPreviewScene")) as { currentPreviewSceneName?: string }).currentPreviewSceneName ?? "") : "";
      this.previewSceneAt = Date.now();
    }
    if (!this.previewScene) return false;
    const shot = (await this.obs.request("GetSourceScreenshot", { sourceName: this.previewScene, imageFormat: "jpg", imageWidth: 800, imageHeight: 450, imageCompressionQuality: 55 })) as { imageData?: string };
    if (!shot.imageData) return false;
    this.send({ type: "event", name: "link.preview", data: { scene: this.previewScene, image: shot.imageData } });
    // Aperçu du Mode Studio : une image sur deux, pour ne pas doubler le débit.
    if (this.studioScene && ++this.previewTick % 2 === 0) {
      const pv = (await this.obs.request("GetSourceScreenshot", { sourceName: this.studioScene, imageFormat: "jpg", imageWidth: 640, imageHeight: 360, imageCompressionQuality: 50 })) as { imageData?: string };
      if (pv.imageData) this.send({ type: "event", name: "link.studioPreview", data: { scene: this.studioScene, image: pv.imageData } });
    }
    return true;
  }

  private emit() {
    this.onStatus({ ...this.status });
  }
  private err(m: string) {
    this.status.lastError = m;
    this.log(m);
    this.emit();
  }
  private later(fn: () => void, ms: number) {
    if (!this.stopped) this.timers.push(setTimeout(fn, ms));
  }
  private send(m: unknown) {
    if (this.core?.readyState === WebSocket.OPEN) this.core.send(JSON.stringify(m));
  }

  // ───── OBS ─────
  private async connectObs() {
    if (this.stopped || this.obsBusy || this.obs.connected) return;
    this.obsBusy = true;
    this.status.obs = "connecting";
    this.emit();
    try {
      // Réglages OBS : ceux d'OBS lui-même (lus dans sa configuration) tant que l'utilisateur n'en a pas imposé d'autres.
      const found = readObsWebsocket();
      const host = this.cfg.obs.host;
      const port = this.cfg.obs.password || !found ? this.cfg.obs.port : found.port;
      const password = this.cfg.obs.password || found?.password || "";
      if (found && !found.enabled) throw new Error("Active le serveur WebSocket d'OBS : Outils, Paramètres du serveur WebSocket.");
      const { wsVersion } = await this.obs.connect(host, port, password);
      const v = await this.obs.request<{ obsVersion?: string }>("GetVersion");
      this.status.obs = "on";
      this.status.obsVersion = String(v.obsVersion ?? wsVersion);
      this.status.lastError = "";
      this.log(`OBS ${this.status.obsVersion} connecté`);
      this.obs.onEvent = (name, data) => {
        if (name === "InputVolumeMeters") return this.meters(data);
        if (name === "CurrentProgramSceneChanged") this.previewScene = String(data.sceneName ?? "");
        if (name === "CurrentPreviewSceneChanged") this.studioScene = String(data.sceneName ?? "");
        if (name === "StudioModeStateChanged" && !data.studioModeEnabled) this.studioScene = "";
        if (name === "StudioModeStateChanged" && data.studioModeEnabled) this.previewSceneAt = 0;
        if (EVENTS.has(name)) this.send({ type: "event", name, data });
      };
      this.obs.onClose = () => {
        this.status.obs = "off";
        this.watcher.set({ ...this.watcher.cfg, enabled: false });
        this.emit();
        this.send({ type: "event", name: "link.obsClosed", data: {} });
        this.later(() => void this.connectObs(), 3000);
      };
      this.watcher.set(this.cfg.backup);
      this.send({ type: "event", name: "link.obsOpened", data: {} });
    } catch (e) {
      this.status.obs = "off";
      this.err((e as Error).message);
      this.later(() => void this.connectObs(), 5000);
    } finally {
      this.obsBusy = false;
      this.emit();
    }
  }

  /** Niveaux audio : 5 fois par seconde au plus, en dB, par entrée. */
  private meters(data: Record<string, unknown>) {
    const t = Date.now();
    if (t - this.lastMeters < 200) return;
    this.lastMeters = t;
    const inputs = (data.inputs as { inputName: string; inputLevelsMul: number[][] }[]) ?? [];
    const levels: Record<string, number> = {};
    for (const i of inputs) {
      const peak = Math.max(0, ...i.inputLevelsMul.map((ch) => ch[1] ?? 0));
      levels[i.inputName] = peak > 0 ? Math.round(20 * Math.log10(peak)) : -100;
    }
    this.send({ type: "event", name: "link.levels", data: levels });
  }

  // ───── Core ─────
  private connectCore() {
    if (this.stopped) return;
    this.status.core = "connecting";
    this.emit();
    const url = `${this.cfg.core.replace(/^http/, "ws")}/v1/link/agent`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.err("Adresse du serveur invalide.");
      return;
    }
    this.core = ws;
    let delay = 3000;
    ws.onopen = () => ws.send(JSON.stringify({ type: "hello", token: this.cfg.token, name: hostName(), platform: process.platform, version: VERSION }));
    ws.onmessage = (ev) => {
      let m: { type?: string; id?: string; method?: string; params?: Record<string, unknown> };
      try {
        m = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (m.type === "ready") {
        this.status.core = "on";
        this.status.lastError = "";
        this.emit();
      } else if (m.type === "viewers") {
        this.status.viewers = Number((m as { n?: number }).n) || 0;
        this.emit();
      } else if (m.type === "req" && typeof m.id === "string" && typeof m.method === "string") void this.handle(m.id, m.method, m.params ?? {});
    };
    ws.onclose = (e) => {
      this.status.core = "off";
      if (e.code === 4003 || e.code === 4005) {
        this.err("Appareil refusé ou révoqué : reconnecte-le à ton compte.");
        this.stopped = true;
        return;
      }
      if (e.code === 4000) delay = 30_000; // remplacé par un autre agent du même compte : n'insiste pas
      this.emit();
      this.later(() => this.connectCore(), delay);
    };
    ws.onerror = () => {};
  }

  private async handle(id: string, method: string, params: Record<string, unknown>) {
    const reply = (ok: boolean, result?: unknown, error?: string) => this.send({ type: "res", id, ok, result, error });
    try {
      if (method === "link.getInfo") return reply(true, { version: VERSION, platform: process.platform, ...this.status });
      if (method === "link.getBackup") return reply(true, { ...this.watcher.cfg, state: this.watcher.state });
      if (method === "link.setBackup") {
        this.cfg.backup = cleanBackup(params, this.cfg.backup);
        this.watcher.set(this.cfg.backup);
        save(this.cfg);
        return reply(true, { ...this.cfg.backup, state: this.watcher.state });
      }
      if (method === "link.collections") {
        const names = listCollections();
        const rows = await Promise.all(names.map(async (name) => ({ name, ...(await plan(name).then((p) => ({ media: p.media.length, bytes: p.bytes })).catch(() => ({ media: 0, bytes: 0 }))) })));
        return reply(true, { collections: rows });
      }
      if (method === "link.backupNow") {
        const c = String(params.collection ?? "");
        void this.runBackup(c);
        return reply(true, { started: true });
      }
      if (method === "link.restore") {
        void this.runRestore(String(params.id ?? ""));
        return reply(true, { started: true });
      }
      if (method === "link.preview") return reply(true, {});
      if (!OBS_METHODS.has(method)) return reply(false, undefined, "method_not_allowed");
      reply(true, await this.obs.request(method, params));
    } catch (e) {
      reply(false, undefined, (e as Error).message);
    }
  }
}

function hostName() {
  try {
    return String(hostname() || process.env.COMPUTERNAME || "OBS").slice(0, 40);
  } catch {
    return "OBS";
  }
}
