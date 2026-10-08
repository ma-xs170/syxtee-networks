import { rm } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { BackupWatcher, cleanBackup, TRIGGERS, type Trigger } from "./backup.ts";
import { downloadArchive, uploadArchive } from "./cloud.ts";
import { save, type LinkConfig } from "./config.ts";
import { ObsClient, type ObsEvent } from "./obs.ts";
import { ipcPath, ObsIpc } from "./obsipc.ts";
import { listCollections, readObsWebsocket } from "./obsconfig.ts";
import { statSync } from "node:fs";
import { scenesDir } from "./obsconfig.ts";
import { backupV2, LegacyCore, restoreV2 } from "./backup2.ts";
import { createArchive, plan, restoreArchive } from "./scenesync.ts";
import { osLabel } from "./system.ts";
import { coreCall } from "./corehttp.ts";
import { fixLiveScene } from "./livescene.ts";
import { freshToken, refreshTokens } from "./tokens.ts";

export const VERSION = "0.5.5";

/** Méthodes OBS que le Core laisse passer (liste blanche aussi appliquée ici : l'agent ne fait pas confiance au serveur). */
export const OBS_METHODS = new Set([
  "GetVersion", "GetStats", "GetSceneList", "GetCurrentProgramScene", "GetCurrentPreviewScene", "GetSceneItemList", "GetInputList",
  "GetInputMute", "GetInputVolume", "GetStreamStatus", "GetRecordStatus", "GetStudioModeEnabled", "GetMediaInputStatus", "GetSourceScreenshot",
  "GetSceneTransitionList", "GetCurrentSceneTransition", "GetVideoSettings",
  "SetCurrentProgramScene", "SetCurrentSceneTransition", "SetCurrentPreviewScene", "SetStudioModeEnabled", "TriggerStudioModeTransition", "SetSceneItemEnabled",
  "GetProfileList", "SetCurrentProfile", "GetSceneCollectionList", "SetCurrentSceneCollection", "GetInputAudioMonitorType", "SetInputAudioMonitorType", "GetOutputStats",
  "SetInputMute", "SetInputVolume", "StartStream", "StopStream", "ToggleStream", "StartRecord", "StopRecord", "ToggleRecord", "PauseRecord", "ResumeRecord",
]);

/** Sorties multistream gérées par le plugin (liste, ajout, retrait, démarrage, arrêt). */
export const MULTISTREAM_METHODS = new Set(["link.multistreamList", "link.multistreamSave", "link.multistreamRemove", "link.multistreamStart", "link.multistreamStop"]);

/** Événements OBS relayés vers le navigateur (les niveaux audio sont limités à 20 images par seconde). */
const EVENTS = new Set([
  "CurrentProgramSceneChanged", "CurrentPreviewSceneChanged", "SceneListChanged", "StreamStateChanged", "RecordStateChanged",
  "InputMuteStateChanged", "InputVolumeChanged", "SceneItemEnableStateChanged", "StudioModeStateChanged", "ExitStarted",
  "CurrentSceneCollectionChanged", "CurrentProfileChanged", "link.multistream", "InputCreated", "SceneCreated", "SceneItemCreated", "SceneItemRemoved",
  "SceneItemListIndexingChanged", "SourceRenamed", "CurrentSceneTransitionChanged",
]);

export type RelayLite = { id: string; name: string; protocol: string; live: boolean; switch_trigger: Trigger; obs_srt_url: string };

export type Job = { kind: "backup" | "restore"; state: "running" | "done" | "error"; progress: number; message: string } | null;

export type Status = { core: "off" | "connecting" | "on"; obs: "off" | "connecting" | "on"; obsVersion: string; backup: BackupWatcher["state"]; lastError: string; viewers: number; job: Job };

/**
 * Relie OBS (local) et le Core (sortant). Se reconnecte seul aux deux. N'ouvre aucun port : la connexion part du PC.
 */
export class Agent {
  status: Status = { core: "off", obs: "off", obsVersion: "", backup: "idle", lastError: "", viewers: 0, job: null };
  onStatus: (s: Status) => void = () => {};
  /** OBS est piloté par le plugin (socket local) ; obs-websocket ne sert qu'en repli, sans le plugin (essais, Qt incompatible). */
  private obs: {
    connected: boolean;
    onEvent: ObsEvent;
    onClose: () => void;
    request<T = Record<string, unknown>>(t: string, d?: Record<string, unknown>): Promise<T>;
    close(): void;
  } & ({ connect(): Promise<{ wsVersion: string }> } | { connect(host: string, port: number, password: string): Promise<{ wsVersion: string }> }) = ipcPath() ? new ObsIpc(ipcPath()) : new ObsClient();
  private core: WebSocket | null = null;
  private stopped = false;
  private watcher: BackupWatcher;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private autoTimer: ReturnType<typeof setInterval> | null = null;
  private autoFailedAt = new Map<string, number>();
  private previewMgr: ReturnType<typeof setInterval> | null = null;
  private relayMgr: ReturnType<typeof setInterval> | null = null;
  private bitrateMgr: ReturnType<typeof setInterval> | null = null;
  /** Flux (relais) du compte, avec l'adresse de lecture pour OBS : jamais montrée dans une interface. */
  relays: RelayLite[] = [];
  private relaysAt = 0;
  /** Aperçu vidéo (WHIP). `mode` : « video » (image + son), « jpeg » (repli, images sans son), « idle » (personne ne regarde). */
  private whip: { active: boolean; starting: boolean; failedAt: number; reason: string; touchedAt: number } = { active: false, starting: false, failedAt: 0, reason: "", touchedAt: 0 };
  get whipReason() {
    return this.whip.reason;
  }
  get previewMode(): "video" | "jpeg" | "idle" {
    if (this.whip.active) return "video";
    return this.status.viewers > 0 && this.cfg.previewEnabled ? "jpeg" : "idle";
  }
  private lastMeters = 0;
  private meterPeak = new Map<string, number>();
  /** Dernières mesures du poste (CPU, images, débit du direct), poussées par le plugin chaque seconde. */
  lastStats: Record<string, unknown> = {};
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
    this.autoTimer = setInterval(() => void this.autoBackupTick(), 30_000);
    this.previewMgr = setInterval(() => void this.managePreview(), 5000);
    this.relayMgr = setInterval(() => void this.syncRelays(), 30_000);
    this.bitrateMgr = setInterval(() => void this.pollBitrate(), 2000);
    void this.previewLoop();
  }

  stop() {
    this.stopped = true;
    this.timers.forEach(clearTimeout);
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.autoTimer) clearInterval(this.autoTimer);
    if (this.previewMgr) clearInterval(this.previewMgr);
    if (this.relayMgr) clearInterval(this.relayMgr);
    if (this.bitrateMgr) clearInterval(this.bitrateMgr);
    void this.stopWhip();
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
      this.setJob({ kind: "backup", state: "running", progress: 0, message: "Préparation…" });
      let last = 0;
      const tick = (p: number, message: string) => {
        if (Date.now() - last < 500) return;
        last = Date.now();
        this.setJob({ kind: "backup", state: "running", progress: p, message });
      };
      // Format léger : seuls les fichiers que le serveur n'a pas déjà sont envoyés.
      try {
        const r = await backupV2({ core: this.cfg.core, token: () => freshToken(this.cfg), collection, obs: this.status.obsVersion, host: hostName(), onProgress: tick });
        this.cfg.lastBackup[collection] = new Date().toISOString();
        save(this.cfg);
        const added = r.new_bytes < 1024 ? "rien de nouveau" : r.new_bytes < 1e6 ? `${Math.round(r.new_bytes / 1024)} Ko ajoutés` : `${(r.new_bytes / 1e6).toFixed(0)} Mo ajoutés`;
        this.setJob({ kind: "backup", state: "done", progress: 1, message: `« ${collection} » sauvegardée (version ${r.version}, ${added}).` });
        this.log(`sauvegarde « ${collection} » v${r.version} : ${r.uploaded} octets envoyés`);
        return true;
      } catch (e) {
        if (!(e instanceof LegacyCore)) throw e;
        // Serveur pas encore à jour : ancienne archive .tgz.
      }
      const a = await createArchive(collection, file, { obs: this.status.obsVersion, host: hostName(), onProgress: (d, t) => tick(t ? (d / t) * 0.5 : 0, "Compression des scènes et médias…") });
      await uploadArchive(this.cfg.core, await freshToken(this.cfg), file, a.size, { name: collection, collection, media: a.media, obs: this.status.obsVersion, host: hostName() }, (s, t) => tick(0.5 + (s / t) * 0.5, "Envoi vers ton espace…"));
      this.cfg.lastBackup[collection] = new Date().toISOString();
      save(this.cfg);
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

  /**
   * Sauvegarde automatique : toutes les 30 s, chaque collection cochée dont le fichier a changé depuis sa dernière sauvegarde
   * (et n'a plus bougé depuis une minute : OBS a fini d'écrire) est envoyée. Un échec n'est pas retenté avant 10 minutes.
   */
  async autoBackupTick(): Promise<void> {
    if (this.stopped || this.status.core !== "on" || this.status.job?.state === "running") return;
    for (const [name, on] of Object.entries(this.cfg.autoBackup)) {
      if (!on) continue;
      let mtime = 0;
      try {
        mtime = statSync(join(scenesDir(), `${name}.json`)).mtimeMs;
      } catch {
        continue; // collection supprimée
      }
      const last = Date.parse(this.cfg.lastBackup[name] ?? "") || 0;
      if (mtime <= last || Date.now() - mtime < 60_000) continue;
      if (Date.now() - (this.autoFailedAt.get(name) ?? 0) < 600_000) continue;
      this.log(`sauvegarde automatique de « ${name} »`);
      if (!(await this.runBackup(name))) this.autoFailedAt.set(name, Date.now());
      return; // une collection par passage
    }
  }

  /** Restaure une sauvegarde de l'espace du compte : ajoute une collection « … (SYXTEE) » à OBS. */
  async runRestore(id: string): Promise<boolean> {
    if (this.status.job?.state === "running") return false;
    try {
      this.setJob({ kind: "restore", state: "running", progress: 0, message: "Téléchargement…" });
      let lastTick = 0;
      const v2 = await restoreV2({
        core: this.cfg.core, token: () => freshToken(this.cfg), id,
        onProgress: (p, message) => {
          if (Date.now() - lastTick < 500) return;
          lastTick = Date.now();
          this.setJob({ kind: "restore", state: "running", progress: p, message });
        },
      });
      if (v2) {
        this.setJob({ kind: "restore", state: "done", progress: 1, message: `Collection « ${v2.collection} » ajoutée. Dans OBS : menu Collection de scènes.` });
        this.log(`restauration → ${v2.collection}`);
        return true;
      }
      const stream = await downloadArchive(this.cfg.core, await freshToken(this.cfg), id);
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

  // ───── Aperçu vidéo (WHIP vers le serveur) ─────

  /** Démarre l'envoi quand quelqu'un regarde et que l'aperçu est actif, l'arrête sinon. Rien ne part sans spectateur. */
  async managePreview(): Promise<void> {
    if (this.stopped) return;
    const want = this.status.viewers > 0 && this.cfg.previewEnabled && this.obs.connected && this.status.core === "on";
    const w = this.whip;
    if (want && !w.active && !w.starting && Date.now() - w.failedAt > 30_000) return this.startWhip();
    if (!want && (w.active || w.starting)) return this.stopWhip();
    // Signe de vie au serveur toutes les minutes : la session ne doit pas expirer pendant qu'on regarde.
    if (want && w.active && Date.now() - w.touchedAt > 60_000) {
      w.touchedAt = Date.now();
      void coreCall(this.cfg, "POST", "/v1/link/preview/touch", {});
    }
  }

  // ───── Flux du compte : sources d'OBS, déclenchement de la bascule, débit surveillé ─────

  /** Relit les flux du compte, les donne au plugin (noms, adresses, relais supprimés) et applique le déclenchement du flux de destination. */
  async syncRelays(force = false): Promise<boolean> {
    if (this.stopped || !this.cfg.token) return false;
    if (!force && Date.now() - this.relaysAt < 20_000) return true;
    const r = await coreCall(this.cfg, "GET", "/v1/link/streams");
    if (!r.ok) return false;
    this.relaysAt = Date.now();
    this.relays = ((r.json.streams as RelayLite[]) ?? []).map((s) => ({ ...s, switch_trigger: TRIGGERS.includes(s.switch_trigger) ? s.switch_trigger : "cut" }));
    if (this.cfg.destination && !this.relays.some((s) => s.id === this.cfg.destination)) {
      this.cfg.destination = "";
      save(this.cfg);
    }
    const dest = this.relays.find((s) => s.id === this.cfg.destination);
    if (dest && dest.switch_trigger !== this.cfg.backup.trigger) {
      this.cfg.backup = { ...this.cfg.backup, trigger: dest.switch_trigger };
      this.watcher.set(this.cfg.backup);
      save(this.cfg);
    }
    if (this.obs.connected) {
      await this.obs.request("link.syncRelays", { relays: this.relays.map((s) => ({ id: s.id, name: s.name, url: s.obs_srt_url, live: s.live })) }).catch(() => {});
    }
    return true;
  }

  /** Débit du flux de destination, une fois toutes les 2 s, seulement si un déclenchement au débit est choisi. */
  private async pollBitrate() {
    const c = this.cfg.backup;
    if (this.stopped || !c.enabled || c.trigger === "cut" || !this.cfg.destination) return this.watcher.setBitrate(null);
    const r = await coreCall(this.cfg, "GET", `/v1/link/streams/${encodeURIComponent(this.cfg.destination)}/status`);
    this.watcher.setBitrate(r.ok ? (r.json.live ? Number(r.json.kbps) || 0 : 0) : null);
  }

  /** Change le déclenchement : sur le flux de destination (compte) et ici. Renvoie le déclenchement retenu. */
  async setTrigger(t: Trigger): Promise<Trigger> {
    this.cfg.backup = { ...this.cfg.backup, trigger: t };
    this.watcher.set(this.cfg.backup);
    save(this.cfg);
    if (this.cfg.destination) {
      const r = await coreCall(this.cfg, "PATCH", `/v1/link/streams/${encodeURIComponent(this.cfg.destination)}`, { switch_trigger: t });
      const dest = this.relays.find((s) => s.id === this.cfg.destination);
      if (r.ok && dest) dest.switch_trigger = t;
    }
    return t;
  }

  /** Active ou coupe l'aperçu (site ou fenêtre Studio d'OBS : même interrupteur). */
  setPreviewEnabled(on: boolean) {
    this.cfg.previewEnabled = on;
    save(this.cfg);
    this.send({ type: "event", name: "link.previewState", data: { enabled: on } });
    void this.managePreview();
  }

  private setMode(reason = "") {
    this.whip.reason = reason;
    this.send({ type: "event", name: "link.previewMode", data: { mode: this.previewMode, reason } });
  }

  private async startWhip() {
    const w = this.whip;
    w.starting = true;
    try {
      const r = await coreCall(this.cfg, "POST", "/v1/link/preview/start", {});
      const url = r.ok ? String(r.json.whip_url ?? "") : "";
      if (!url) throw new Error(r.status === 0 ? "Serveur SYXTEE injoignable." : "Le serveur n'accepte pas l'aperçu vidéo.");
      await this.obs.request("link.whipStart", { server: url });
      if (!this.whip.starting) {
        // Plus de spectateur pendant le démarrage : on referme tout de suite.
        void this.obs.request("link.whipStop").catch(() => {});
        void coreCall(this.cfg, "POST", "/v1/link/preview/stop", {});
        return;
      }
      w.active = true;
      w.touchedAt = Date.now();
      this.log("aperçu vidéo démarré");
      this.setMode();
    } catch (e) {
      w.active = false;
      w.failedAt = Date.now();
      this.log(`aperçu vidéo indisponible : ${(e as Error).message}`);
      void coreCall(this.cfg, "POST", "/v1/link/preview/stop", {});
      this.setMode((e as Error).message);
    } finally {
      w.starting = false;
    }
  }

  private async stopWhip() {
    const w = this.whip;
    const was = w.active || w.starting;
    w.starting = false;
    w.active = false;
    if (!was) return;
    await this.obs.request("link.whipStop").catch(() => {});
    void coreCall(this.cfg, "POST", "/v1/link/preview/stop", {});
    this.log("aperçu vidéo arrêté");
    this.setMode();
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
    if (this.status.viewers <= 0 || !this.obs.connected || !this.cfg.previewEnabled || this.whip.active || this.whip.starting) return false;
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
      let wsVersion: string;
      if (this.obs instanceof ObsIpc) {
        ({ wsVersion } = await this.obs.connect());
      } else {
        // Repli sans le plugin : réglages lus dans la configuration d'OBS. Jamais montré à l'utilisateur.
        const found = readObsWebsocket();
        const port = this.cfg.obs.password || !found ? this.cfg.obs.port : found.port;
        const password = this.cfg.obs.password || found?.password || "";
        if (found && !found.enabled) throw new Error("OBS n'est pas joignable. Mets à jour le plugin SYXTEE, puis redémarre OBS.");
        ({ wsVersion } = await (this.obs as ObsClient).connect(this.cfg.obs.host, port, password));
      }
      const v = await this.obs.request<{ obsVersion?: string }>("GetVersion");
      this.status.obs = "on";
      this.status.obsVersion = String(v.obsVersion ?? wsVersion);
      this.status.lastError = "";
      this.log(`OBS ${this.status.obsVersion} connecté`);
      this.obs.onEvent = (name, data) => {
        if (name === "InputVolumeMeters") return this.meters(data);
        if (name === "link.needRelays") {
          void this.syncRelays(true);
          return;
        }
        if (name === "link.whip" && !data.active && this.whip.active) {
          // L'envoi s'est interrompu côté OBS (réseau, serveur) : repli sur les images, nouvel essai dans 30 s.
          this.whip.active = false;
          this.whip.failedAt = Date.now();
          void coreCall(this.cfg, "POST", "/v1/link/preview/stop", {});
          this.setMode(String(data.error || "L'envoi vidéo s'est interrompu."));
          return;
        }
        if (name === "link.stats") {
          this.lastStats = data;
          if (this.status.viewers > 0) this.send({ type: "event", name, data });
          return;
        }
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
      void this.syncRelays(true);
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

  /** Niveaux audio : environ 20 fois par seconde, en dB, par entrée. Le plus haut pic entre deux envois est gardé (aucun pic perdu). */
  private meters(data: Record<string, unknown>) {
    const inputs = (data.inputs as { inputName: string; inputLevelsMul: number[][] }[]) ?? [];
    for (const i of inputs) {
      const peak = Math.max(0, ...i.inputLevelsMul.map((ch) => ch[1] ?? 0));
      this.meterPeak.set(i.inputName, Math.max(this.meterPeak.get(i.inputName) ?? 0, peak));
    }
    const t = Date.now();
    if (t - this.lastMeters < 45) return;
    this.lastMeters = t;
    const levels: Record<string, number> = {};
    for (const [name, peak] of this.meterPeak) levels[name] = peak > 0 ? Math.round(20 * Math.log10(peak)) : -100;
    this.meterPeak.clear();
    this.send({ type: "event", name: "link.levels", data: levels });
  }

  // ───── Core ─────
  private connectCore() {
    if (this.stopped) return;
    this.status.core = "connecting";
    this.emit();
    // Jeton d'accès à jour avant de se présenter (il dure 1 h).
    void freshToken(this.cfg).then(() => this.openCore());
  }

  private reauthTimer: ReturnType<typeof setTimeout> | null = null;
  /** Renouvelle le jeton avant son échéance et le donne au Core sur la connexion ouverte : pas de coupure. */
  private scheduleReauth(ws: WebSocket) {
    if (this.reauthTimer) clearTimeout(this.reauthTimer);
    if (!this.cfg.expires || !this.cfg.refresh) return;
    const wait = Math.max(5_000, this.cfg.expires - Date.now() - 5 * 60_000);
    this.reauthTimer = setTimeout(async () => {
      if (this.stopped || this.core !== ws) return;
      const r = await refreshTokens(this.cfg);
      if (r === "ok" && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "reauth", token: this.cfg.token }));
        this.scheduleReauth(ws);
      } else if (r === "offline") this.reauthTimer = setTimeout(() => this.scheduleReauth(ws), 30_000);
      // "revoked" : le Core coupera la session ; la reconnexion échouera et demandera de reconnecter le PC.
    }, wait);
    this.timers.push(this.reauthTimer);
  }

  private openCore() {
    if (this.stopped) return;
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
    ws.onopen = () => ws.send(JSON.stringify({ type: "hello", token: this.cfg.token, name: hostName(), platform: process.platform, os: osLabel(), host: hostName(), version: VERSION }));
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
        this.scheduleReauth(ws);
        this.emit();
      } else if (m.type === "viewers") {
        this.status.viewers = Number((m as { n?: number }).n) || 0;
        this.emit();
        void this.managePreview();
      } else if (m.type === "req" && typeof m.id === "string" && typeof m.method === "string") void this.handle(m.id, m.method, m.params ?? {});
    };
    ws.onclose = async (e) => {
      this.status.core = "off";
      if (this.reauthTimer) clearTimeout(this.reauthTimer);
      if (e.code === 4005) {
        this.err("Appareil révoqué : reconnecte-le à ton compte.");
        this.stopped = true;
        return;
      }
      if (e.code === 4003 || e.code === 4006) {
        // Jeton d'accès périmé ou refusé : un renouvellement règle le cas normal, sinon le PC doit être reconnecté.
        const r = this.cfg.refresh ? await refreshTokens(this.cfg) : "revoked";
        if (this.stopped) return;
        if (r === "revoked") {
          this.err("Appareil refusé ou révoqué : reconnecte-le à ton compte.");
          this.stopped = true;
          return;
        }
        delay = r === "ok" ? 500 : 10_000;
      }
      if (e.code === 4000) delay = 30_000; // remplacé par une autre session du même poste : n'insiste pas
      this.emit();
      this.later(() => this.connectCore(), delay);
    };
    ws.onerror = () => {};
  }

  private async handle(id: string, method: string, params: Record<string, unknown>) {
    const reply = (ok: boolean, result?: unknown, error?: string) => this.send({ type: "res", id, ok, result, error });
    try {
      if (method === "link.getInfo") return reply(true, { version: VERSION, platform: process.platform, ...this.status });
      // Rôles des scènes (scène de direct, scène de secours), bascule automatique et déclenchement.
      if (method === "link.getBackup") return reply(true, { ...this.watcher.cfg, liveScene: this.cfg.liveScene, state: this.watcher.state });
      if (method === "link.setBackup") {
        const before = this.cfg.backup.trigger;
        this.cfg.backup = cleanBackup(params, this.cfg.backup);
        // Déclenchement : se règle sur le flux de destination (même réglage que « Mes relais » sur le site).
        if (this.cfg.backup.trigger !== before) await this.setTrigger(this.cfg.backup.trigger);
        if (typeof params.liveScene === "string") this.cfg.liveScene = params.liveScene.slice(0, 200);
        this.watcher.set(this.cfg.backup);
        save(this.cfg);
        return reply(true, { ...this.cfg.backup, liveScene: this.cfg.liveScene, state: this.watcher.state });
      }
      // Aperçu programme : « Couper l'aperçu » l'arrête sur le PC (aucun encodage, aucun envoi).
      if (method === "link.getPreview") return reply(true, { enabled: this.cfg.previewEnabled, mode: this.previewMode, reason: this.whip.reason });
      if (method === "link.setPreview") {
        this.setPreviewEnabled(params.enabled !== false);
        return reply(true, { enabled: this.cfg.previewEnabled, mode: this.previewMode, reason: this.whip.reason });
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
      // « Corriger » : aucune source de flux dans OBS ? Ajoute celle du flux de destination (ou du seul flux du compte) à la scène en cours.
      if (method === "link.fixFlux") {
        await this.syncRelays(true);
        let dest = this.relays.find((s) => s.id === this.cfg.destination);
        if (!dest) {
          dest = this.relays.find((s) => s.live) ?? this.relays[0];
          if (dest) {
            this.cfg.destination = dest.id;
            save(this.cfg);
          }
        }
        if (!dest) return reply(true, { ok: false, message: "Tu n'as pas encore de flux. Crée un relais sur le site, puis reviens corriger." });
        const current = String(((await this.obs.request("GetCurrentProgramScene")) as { currentProgramSceneName?: string }).currentProgramSceneName ?? "");
        const scene = this.cfg.liveScene || current;
        const r = await fixLiveScene((t, d) => this.obs.request(t, d), scene, { id: dest.id, name: dest.name, url: dest.obs_srt_url });
        if (r.ok && current && current !== scene) await fixLiveScene((t, d) => this.obs.request(t, d), current, { id: dest.id, name: dest.name, url: dest.obs_srt_url }).catch(() => {});
        return reply(true, r);
      }
      if (method === "link.preview") return reply(true, {});
      // Multistream : les sorties (adresse + clé) vivent dans le plugin, sur le PC.
      if (MULTISTREAM_METHODS.has(method)) return reply(true, await this.obs.request(method, params));
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
