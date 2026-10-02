import { whipPublish, whipStop, type WhipSession } from "../cam/whip";
import { coreToken } from "../dashboard/coreClient";
import { H, MAX_DELAY_MS, W, defaultSettings, hasAudio, saveProject, uid, type Item, type Project, type Settings, type Source } from "./model";

// Moteur du studio : compose les scènes dans un canvas 1280 x 720 (30 images/s), mixe l'audio avec WebAudio,
// gère les transitions et l'enregistrement. Tout tourne dans le navigateur. Aucun serveur, aucun OBS.

type Runtime = {
  el?: HTMLVideoElement;
  img?: HTMLImageElement;
  gain?: GainNode;
  /** Niveau après le retard (ce que les spectateurs entendent) : mixeur et détection de parole. */
  analyser?: AnalyserNode;
  /** Niveau avant le retard : calibration de la synchro. */
  pre?: AnalyserNode;
  delay?: DelayNode;
  /** Suivi d'image figée : dernier nombre d'images reçues et dernier instant où il a bougé. */
  frames: number;
  advancedAt: number;
  startedAt: number;
  started: boolean;
  /** Débit reçu du relais, en ko/s (lecteur mpegts). */
  speed?: number;
  /** Retard vidéo (podcast) : images réduites en 640 x 360 gardées en mémoire. */
  vdelayMs: number;
  vbuf?: { t: number; bmp: ImageBitmap }[];
  vtimer?: ReturnType<typeof setInterval>;
  vol: number;
  muted: boolean;
  error?: string;
  stop: () => void;
};

type Transition = { from: string; to: string; start: number; dur: number };
export const FADE_MS = 450;

export class StudioEngine {
  project: Project;
  coreUrl: string;
  studioMode = false;
  recording = false;
  onChange: () => void = () => {};
  private runtimes = new Map<string, Runtime>();
  /** Image de sortie (programme), toujours composée : sert à l'enregistrement et à tous les affichages. */
  private out: HTMLCanvasElement;
  private program?: HTMLCanvasElement;
  private preview?: HTMLCanvasElement;
  private tiles = new Map<string, HTMLCanvasElement>();
  private frame = 0;
  private actx?: AudioContext;
  private master?: GainNode;
  private monitor?: GainNode;
  private recDest?: MediaStreamAudioDestinationNode;
  private transition?: Transition;
  private raf = 0;
  private recorder?: MediaRecorder;
  private chunks: Blob[] = [];
  private buf = new Float32Array(1024);
  /** Journal des décisions automatiques (secours, podcast). */
  log: string[] = [];
  calibrating = false;
  private failFrom?: string;
  private failOkSince = 0;
  private lastWatch = 0;
  private lastTrack = 0;
  private lastFailCheck = 0;
  private lvl = new Map<string, number>();
  /** Diffusion : le programme et le mixage partent en WebRTC (WHIP) vers le Core, qui les envoie aux plateformes. */
  live: "idle" | "connecting" | "live" | "error" = "idle";
  liveError: string | null = null;
  private whip: WhipSession | null = null;
  private ticker: Worker | null = null;
  private spk: { cur?: string; cand?: string; since: number; last: number } = { since: 0, last: 0 };

  constructor(project: Project, coreUrl: string) {
    this.project = project;
    this.coreUrl = coreUrl;
    this.out = document.createElement("canvas");
    this.out.width = W;
    this.out.height = H;
    this.raf = requestAnimationFrame(this.loop);
  }

  // ---------- projet ----------
  update(fn: (p: Project) => Project) {
    this.project = fn(this.project);
    saveProject(this.project);
    this.sync();
    this.onChange();
  }

  get settings(): Settings {
    return this.project.settings ?? defaultSettings();
  }
  setSettings(fn: (s: Settings) => Settings) {
    this.update((p) => ({ ...p, settings: fn(p.settings ?? defaultSettings()) }));
    this.applyDelays();
  }
  /** Mode podcast : les flux sont relancés avec un grand tampon (latence haute, image régulière). */
  setPodcast(on: boolean) {
    this.setSettings((s) => ({ ...s, podcast: { ...s.podcast, on } }));
    this.restartRelays();
  }
  restartRelays() {
    for (const [id, rt] of this.runtimes) {
      if (this.source(id)?.kind !== "relay") continue;
      this.clean(rt);
      rt.stop();
      this.runtimes.delete(id);
    }
    this.sync();
  }
  private addLog(msg: string) {
    this.log = [`${new Date().toLocaleTimeString("fr-FR")} ${msg}`, ...this.log].slice(0, 20);
    this.onChange();
  }

  scene(id: string) {
    return this.project.scenes.find((s) => s.id === id);
  }
  source(id: string) {
    return this.project.sources.find((s) => s.id === id);
  }

  // ---------- affichage ----------
  attach(program: HTMLCanvasElement | null, preview: HTMLCanvasElement | null) {
    this.program = program ?? undefined;
    this.preview = preview ?? undefined;
  }

  /** Vignette d'une scène (multiview). */
  attachTile(sceneId: string, canvas: HTMLCanvasElement | null) {
    if (canvas) this.tiles.set(sceneId, canvas);
    else this.tiles.delete(sceneId);
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    this.renderFrame(performance.now());
  };

  private renderFrame(now: number) {
    if (this.transition && now - this.transition.start >= this.transition.dur) {
      const to = this.transition.to;
      this.transition = undefined;
      this.project = { ...this.project, program: to };
      saveProject(this.project);
      this.sync();
      this.onChange();
    }
    const c = this.out.getContext("2d")!;
    if (this.transition) {
      const t = Math.min(1, (now - this.transition.start) / this.transition.dur);
      this.draw(c, this.transition.from, 1);
      this.draw(c, this.transition.to, t, true);
    } else this.draw(c, this.project.program, 1);
    if (this.program) this.program.getContext("2d")!.drawImage(this.out, 0, 0, this.program.width, this.program.height);
    if (this.preview && this.studioMode) this.scaled(this.preview, this.project.preview);
    // Vignettes : une image sur deux suffit.
    if (this.tiles.size && this.frame++ % 2 === 0) for (const [id, cv] of this.tiles) this.scaled(cv, id);
    this.applyGains();
    if (now - this.lastWatch > 100) {
      this.lastWatch = now;
      this.watch(now);
    }
  }

  /** Dessine une scène dans un canvas de n'importe quelle taille. */
  private scaled(cv: HTMLCanvasElement, sceneId: string) {
    const c = cv.getContext("2d")!;
    c.save();
    c.scale(cv.width / W, cv.height / H);
    this.draw(c, sceneId, 1);
    c.restore();
  }

  private draw(c: CanvasRenderingContext2D, sceneId: string, alpha: number, over = false) {
    if (!over) {
      c.globalAlpha = 1;
      c.fillStyle = "#000";
      c.fillRect(0, 0, W, H);
    }
    const scene = this.scene(sceneId);
    if (!scene) return;
    c.globalAlpha = alpha;
    for (const it of scene.items) {
      if (!it.visible) continue;
      const s = this.source(it.sourceId);
      if (s) this.drawItem(c, s, it);
    }
    c.globalAlpha = 1;
  }

  private drawItem(c: CanvasRenderingContext2D, s: Source, it: Item) {
    if (s.kind === "color") {
      c.fillStyle = s.color ?? "#ffffff";
      c.fillRect(it.x, it.y, it.w, it.h);
    } else if (s.kind === "text") {
      c.fillStyle = s.color ?? "#ffffff";
      c.font = `600 ${s.fontSize ?? 64}px Geist, system-ui, sans-serif`;
      c.textBaseline = "top";
      c.fillText(s.text ?? "", it.x, it.y, it.w);
    } else {
      const rt = this.runtimes.get(s.id);
      const delayed = rt && rt.vdelayMs > 0 ? this.delayedFrame(rt, performance.now()) : undefined;
      if (rt && rt.vdelayMs > 0 && !delayed) return;
      const media = delayed ?? rt?.img ?? rt?.el;
      if (!media) return;
      const w = media instanceof HTMLImageElement ? media.naturalWidth : media instanceof HTMLVideoElement ? media.videoWidth : media.width;
      const h = media instanceof HTMLImageElement ? media.naturalHeight : media instanceof HTMLVideoElement ? media.videoHeight : media.height;
      if (!w || !h) return;
      const k = Math.min(it.w / w, it.h / h);
      c.drawImage(media, it.x + (it.w - w * k) / 2, it.y + (it.h - h * k) / 2, w * k, h * k);
    }
  }

  // ---------- scènes ----------
  /** Coupe franche : la scène devient le programme. */
  cut(id: string) {
    this.transition = undefined;
    this.update((p) => ({ ...p, program: id }));
  }
  /** Fondu enchaîné vers la scène. */
  fade(id: string) {
    if (id === this.project.program || this.transition) return;
    this.transition = { from: this.project.program, to: id, start: performance.now(), dur: FADE_MS };
    this.sync();
  }
  /** Mode studio : l'aperçu passe en programme, le programme devient l'aperçu. */
  swap(kind: "cut" | "fade") {
    const { program, preview } = this.project;
    if (program === preview) return;
    if (kind === "cut") this.update((p) => ({ ...p, program: preview, preview: program }));
    else {
      this.fade(preview);
      this.project = { ...this.project, preview: program };
      saveProject(this.project);
      this.onChange();
    }
  }
  setStudioMode(on: boolean) {
    this.studioMode = on;
    this.sync();
    this.onChange();
  }

  // ---------- sources actives ----------
  /** Démarre les sources visibles dans le programme ou l'aperçu, arrête les autres (le micro reste actif). */
  sync() {
    const need = new Set<string>();
    const ids = [this.project.program, this.transition?.to, this.studioMode ? this.project.preview : undefined];
    for (const id of ids) for (const it of (id && this.scene(id)?.items) || []) if (it.visible) need.add(it.sourceId);
    // Secours : on garde les flux de la scène quittée pour savoir quand ils reviennent.
    for (const it of (this.failFrom && this.scene(this.failFrom)?.items) || []) if (it.visible) need.add(it.sourceId);
    // Podcast : tous les intervenants tournent (leur voix pilote les scènes), même hors programme.
    const pod = this.settings.podcast;
    if (pod.on) for (const [id, sp] of Object.entries(pod.speakers)) if (sp.scene) need.add(id);
    for (const s of this.project.sources) if (s.kind === "mic") need.add(s.id);
    for (const s of this.project.sources) if (need.has(s.id) && !this.runtimes.has(s.id)) this.start(s);
    for (const [id, rt] of this.runtimes) {
      if (!need.has(id) || !this.source(id)) {
        this.clean(rt);
        rt.stop();
        this.runtimes.delete(id);
      }
    }
  }

  private audio() {
    if (!this.actx) {
      this.actx = new AudioContext();
      this.master = this.actx.createGain();
      this.monitor = this.actx.createGain();
      this.recDest = this.actx.createMediaStreamDestination();
      this.master.connect(this.monitor).connect(this.actx.destination);
      this.master.connect(this.recDest);
    }
    return this.actx;
  }

  /** À appeler sur un geste de l'utilisateur : les navigateurs bloquent l'audio avant. */
  unlock() {
    this.audio().resume().catch(() => {});
    for (const rt of this.runtimes.values()) rt.el?.play().catch(() => {});
  }

  setMonitor(on: boolean) {
    this.audio();
    this.monitor!.gain.value = on ? 1 : 0;
  }

  /** Chaîne audio d'une source : entrée, mesure avant retard, retard (synchro), mesure après retard, volume, mixage. */
  private wire(id: string, rt: Runtime, node: AudioNode) {
    const a = this.audio();
    rt.pre = a.createAnalyser();
    rt.pre.fftSize = 1024;
    rt.delay = a.createDelay(MAX_DELAY_MS / 1000);
    rt.delay.delayTime.value = (this.settings.podcast.speakers[id]?.delayMs ?? 0) / 1000;
    rt.analyser = a.createAnalyser();
    rt.analyser.fftSize = 1024;
    rt.gain = a.createGain();
    node.connect(rt.pre);
    node.connect(rt.delay);
    rt.delay.connect(rt.analyser);
    rt.delay.connect(rt.gain);
    rt.gain.connect(this.master!);
  }

  // ---------- synchro (retard par flux) ----------
  /** Applique les retards des intervenants : audio par DelayNode, vidéo par une file d'images. */
  applyDelays() {
    for (const [id, rt] of this.runtimes) {
      const ms = Math.max(0, Math.min(MAX_DELAY_MS, this.settings.podcast.speakers[id]?.delayMs ?? 0));
      if (rt.delay) rt.delay.delayTime.value = ms / 1000;
      this.setVideoDelay(rt, ms);
    }
  }
  private setVideoDelay(rt: Runtime, ms: number) {
    rt.vdelayMs = ms;
    if (ms > 0 && rt.el && !rt.vtimer) {
      rt.vbuf = [];
      rt.vtimer = setInterval(() => this.grab(rt), 66);
    } else if (ms === 0 && rt.vtimer) this.clean(rt);
  }
  private grab(rt: Runtime) {
    const el = rt.el;
    if (!el || el.readyState < 2 || !el.videoWidth || !rt.vbuf) return;
    createImageBitmap(el, { resizeWidth: 640, resizeHeight: 360 })
      .then((bmp) => {
        if (!rt.vbuf) return bmp.close();
        const t = performance.now();
        rt.vbuf.push({ t, bmp });
        const keep = t - rt.vdelayMs - 1000;
        while (rt.vbuf.length > 2 && rt.vbuf[1].t < keep) rt.vbuf.shift()!.bmp.close();
      })
      .catch(() => {});
  }
  private delayedFrame(rt: Runtime, now: number) {
    let pick: ImageBitmap | undefined;
    for (const f of rt.vbuf ?? []) {
      if (f.t <= now - rt.vdelayMs) pick = f.bmp;
      else break;
    }
    return pick;
  }
  private clean(rt: Runtime) {
    if (rt.vtimer) clearInterval(rt.vtimer);
    rt.vtimer = undefined;
    rt.vbuf?.forEach((f) => f.bmp.close());
    rt.vbuf = undefined;
  }

  /** Calibration au son commun (un clap entendu par tous les micros) : mesure l'arrivée du pic de chaque flux et retarde les plus rapides. */
  async calibrate(seconds = 8) {
    if (this.calibrating) return;
    this.calibrating = true;
    this.onChange();
    const samples = new Map<string, { t: number; db: number }[]>();
    const timer = setInterval(() => {
      const t = performance.now();
      for (const [id, rt] of this.runtimes) if (rt.pre) samples.set(id, [...(samples.get(id) ?? []), { t, db: this.peak(rt.pre) }]);
    }, 20);
    await new Promise((res) => setTimeout(res, seconds * 1000));
    clearInterval(timer);
    const peaks: Record<string, number> = {};
    for (const [id, list] of samples) {
      const best = list.reduce((a, b) => (b.db > a.db ? b : a), list[0]);
      if (best && best.db > -45) peaks[id] = best.t;
    }
    const ids = Object.keys(peaks);
    this.calibrating = false;
    if (ids.length < 2) {
      this.addLog("Calibration : pas assez de flux ont entendu le son. Fais un clap fort près de tous les micros.");
      return;
    }
    const ref = Math.max(...ids.map((id) => peaks[id]));
    this.setSettings((st) => {
      const speakers = { ...st.podcast.speakers };
      for (const id of ids) speakers[id] = { ...speakers[id], delayMs: Math.min(MAX_DELAY_MS, Math.round(ref - peaks[id])) };
      return { ...st, podcast: { ...st.podcast, speakers } };
    });
    this.addLog(`Calibration : ${ids.length} flux alignés sur le plus lent.`);
  }

  private peak(a: AnalyserNode) {
    a.getFloatTimeDomainData(this.buf);
    let m = 0;
    for (const v of this.buf) m = Math.max(m, Math.abs(v));
    return m > 0.00001 ? 20 * Math.log10(m) : -100;
  }

  private start(s: Source) {
    const now = performance.now();
    const rt: Runtime = { vol: 1, muted: false, frames: 0, advancedAt: now, startedAt: now, started: false, vdelayMs: 0, stop: () => {} };
    this.runtimes.set(s.id, rt);
    if (s.kind === "image") {
      const img = new Image();
      img.src = s.src ?? "";
      rt.img = img;
    } else if (s.kind === "relay") this.startRelay(s, rt);
    else if (s.kind === "webcam" || s.kind === "screen" || s.kind === "mic") this.startDevice(s, rt);
  }

  private async startDevice(s: Source, rt: Runtime) {
    try {
      const stream =
        s.kind === "screen"
          ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
          : await navigator.mediaDevices.getUserMedia(s.kind === "webcam" ? { video: { width: 1280, height: 720 }, audio: true } : { audio: true });
      if (this.runtimes.get(s.id) !== rt) return stream.getTracks().forEach((t) => t.stop());
      if (s.kind !== "mic") {
        const el = document.createElement("video");
        el.muted = true;
        el.playsInline = true;
        el.srcObject = stream;
        el.play().catch(() => {});
        rt.el = el;
      }
      if (stream.getAudioTracks().length) this.wire(s.id, rt, this.audio().createMediaStreamSource(stream));
      this.applyDelays();
      rt.stop = () => {
        stream.getTracks().forEach((t) => t.stop());
        rt.el?.pause();
        rt.gain?.disconnect();
      };
      stream.getTracks()[0]?.addEventListener("ended", () => this.onChange());
    } catch {
      rt.error = s.kind === "mic" ? "Micro refusé." : s.kind === "screen" ? "Capture refusée." : "Webcam refusée.";
      this.onChange();
    }
  }

  private async startRelay(s: Source, rt: Runtime) {
    const el = document.createElement("video");
    el.playsInline = true;
    rt.el = el;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let player: import("mpegts.js").default.Player | null = null;
    const teardown = () => {
      if (!player) return;
      const p = player;
      player = null;
      p.pause();
      p.unload();
      p.detachMediaElement();
      p.destroy();
    };
    const begin = async () => {
      if (stopped) return;
      try {
        const { default: mpegts } = await import("mpegts.js");
        if (!mpegts.isSupported()) throw new Error("unsupported");
        const token = await coreToken();
        if (stopped) return;
        mpegts.LoggingControl.enableAll = false;
        const p = mpegts.createPlayer(
          { type: "mpegts", isLive: true, url: `${this.coreUrl}/v1/me/relays/${s.relayId}/live.ts` },
          this.settings.podcast.on
            ? // Podcast : la latence n'est pas une priorité, un grand tampon garde l'image et le son réguliers.
              { headers: { Authorization: `Bearer ${token}` }, enableWorker: true, enableStashBuffer: true, stashInitialSize: 1024 * 1024, liveSync: false, autoCleanupSourceBuffer: true }
            : { headers: { Authorization: `Bearer ${token}` }, enableWorker: true, enableStashBuffer: false, liveSync: true, liveSyncMaxLatency: 1.5, liveSyncTargetLatency: 0.6, autoCleanupSourceBuffer: true },
        );
        player = p;
        const again = () => {
          teardown();
          if (!stopped) retry = setTimeout(begin, 3000);
        };
        p.on(mpegts.Events.ERROR, again);
        p.on(mpegts.Events.LOADING_COMPLETE, again);
        p.attachMediaElement(el);
        p.load();
        await Promise.resolve(p.play()).catch(() => {});
        if (!rt.gain) {
          this.wire(s.id, rt, this.audio().createMediaElementSource(el));
          this.applyDelays();
        }
      } catch {
        if (!stopped) retry = setTimeout(begin, 3000);
      }
    };
    const speedTimer = setInterval(() => {
      const info = (player as unknown as { statisticsInfo?: { speed?: number } } | null)?.statisticsInfo;
      rt.speed = info?.speed;
    }, 1000);
    rt.stop = () => {
      stopped = true;
      clearInterval(speedTimer);
      if (retry) clearTimeout(retry);
      teardown();
      rt.gain?.disconnect();
    };
    begin();
  }

  // ---------- audio ----------
  isActive(id: string) {
    const prog = this.scene(this.project.program);
    const tr = this.transition ? this.scene(this.transition.to) : undefined;
    return [prog, tr].some((sc) => sc?.items.some((i) => i.sourceId === id && i.visible));
  }

  private applyGains() {
    for (const [id, rt] of this.runtimes) if (rt.gain) rt.gain.gain.value = rt.muted ? 0 : this.isActive(id) || this.source(id)?.kind === "mic" ? rt.vol : 0;
  }

  mixer(id: string) {
    const rt = this.runtimes.get(id);
    return { vol: rt?.vol ?? 1, muted: rt?.muted ?? false, error: rt?.error, ready: !!rt };
  }
  setVolume(id: string, vol: number) {
    const rt = this.runtimes.get(id);
    if (rt) rt.vol = vol;
    this.onChange();
  }
  setMuted(id: string, muted: boolean) {
    const rt = this.runtimes.get(id);
    if (rt) rt.muted = muted;
    this.onChange();
  }

  /** Niveau de crête de chaque source audio, en dB. */
  levels(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [id, rt] of this.runtimes) {
      if (!rt.analyser || !hasAudio(this.source(id)?.kind ?? "color")) continue;
      rt.analyser.getFloatTimeDomainData(this.buf);
      let peak = 0;
      for (const v of this.buf) peak = Math.max(peak, Math.abs(v));
      out[id] = peak > 0.00001 ? 20 * Math.log10(peak) : -100;
    }
    return out;
  }

  // ---------- surveillance : secours et podcast ----------
  /** État d'un flux relais : image figée ou non, débit reçu. Débit bas mais image qui avance = fluide, rien ne change. */
  health(id: string) {
    const rt = this.runtimes.get(id);
    const now = performance.now();
    const freeze = this.settings.failover.freezeSec * 1000;
    const frozen = !!rt?.el && (rt.started ? now - rt.advancedAt > freeze : now - rt.startedAt > freeze + 3000);
    return { running: !!rt, started: !!rt?.started, frozen, kbps: rt?.speed !== undefined ? Math.round(rt.speed * 8) : undefined };
  }

  private watch(now: number) {
    if (now - this.lastTrack > 250) {
      this.lastTrack = now;
      for (const rt of this.runtimes.values()) {
        const q = rt.el?.getVideoPlaybackQuality?.();
        if (q && q.totalVideoFrames > rt.frames) {
          rt.frames = q.totalVideoFrames;
          rt.advancedAt = now;
          rt.started = true;
        }
      }
    }
    if (now - this.lastFailCheck > 500) {
      this.lastFailCheck = now;
      this.checkFailover(now);
    }
    this.checkPodcast(now);
  }

  private watched(sceneId: string) {
    return (this.scene(sceneId)?.items ?? []).filter((i) => i.visible && this.source(i.sourceId)?.kind === "relay").map((i) => i.sourceId);
  }

  private fallbackScene() {
    const f = this.settings.failover;
    const named = this.project.scenes.find((s) => s.id === f.scene) ?? this.project.scenes.find((s) => s.name === "Secours");
    if (named) return named.id;
    // Aucune scène de secours : on en crée une (fond sombre et message).
    const bg = { id: uid(), name: "Fond secours", kind: "color" as const, color: "#111111" };
    const msg = { id: uid(), name: "Message secours", kind: "text" as const, text: "On revient tout de suite", fontSize: 72, color: "#ffffff" };
    const scene = { id: uid(), name: "Secours", items: [
      { id: uid(), sourceId: bg.id, visible: true, x: 0, y: 0, w: W, h: H },
      { id: uid(), sourceId: msg.id, visible: true, x: 240, y: 300, w: 800, h: 100 },
    ] };
    this.update((p) => ({ ...p, sources: [...p.sources, bg, msg], scenes: [...p.scenes, scene] }));
    this.setSettings((st) => ({ ...st, failover: { ...st.failover, scene: scene.id } }));
    return scene.id;
  }

  /** Bascule seulement si l'image est figée. Un débit bas avec une image qui avance ne change rien. */
  private checkFailover(now: number) {
    const f = this.settings.failover;
    if (!f.on) {
      this.failFrom = undefined;
      return;
    }
    if (this.transition) return;
    const freeze = f.freezeSec * 1000;
    const fallback = f.scene ?? this.project.scenes.find((s) => s.name === "Secours")?.id;
    if (this.failFrom) {
      if (this.project.program !== fallback) {
        this.failFrom = undefined; // changement de scène à la main
        return;
      }
      if (!f.autoReturn) return;
      const ids = this.watched(this.failFrom);
      const ok = ids.length > 0 && ids.every((id) => this.runtimes.get(id)?.started && !this.health(id).frozen);
      if (!ok) this.failOkSince = 0;
      else if (!this.failOkSince) this.failOkSince = now;
      else if (now - this.failOkSince > 3000) {
        const back = this.failFrom;
        this.failFrom = undefined;
        this.addLog(`Image revenue : retour sur « ${this.scene(back)?.name} »`);
        this.fade(back);
      }
      return;
    }
    const frozen = this.watched(this.project.program).filter((id) => this.runtimes.has(id) && this.health(id).frozen);
    if (!frozen.length || now < freeze) return;
    const target = this.fallbackScene();
    if (target === this.project.program) return;
    this.failFrom = this.project.program;
    this.failOkSince = 0;
    this.addLog(`Image figée (${this.source(frozen[0])?.name}) : bascule sur « ${this.scene(target)?.name} »`);
    this.fade(target);
  }

  /** Podcast : la scène suit la personne qui parle (voix la plus forte, tenue 0,5 s, pas plus d'un changement par délai de maintien). */
  private checkPodcast(now: number) {
    const p = this.settings.podcast;
    if (!p.on || !p.auto || this.failFrom || this.transition) return;
    const list = Object.entries(p.speakers)
      .filter(([id, sp]) => sp.scene && this.runtimes.get(id)?.analyser)
      .map(([id, sp]) => {
        const rt = this.runtimes.get(id)!;
        // Niveau lissé : monte tout de suite, redescend de 2 dB par pas de 100 ms (les pauses entre mots ne comptent pas).
        const db = Math.max(rt.muted ? -100 : this.peak(rt.analyser!), (this.lvl.get(id) ?? -100) - 2);
        this.lvl.set(id, db);
        return { id, scene: sp.scene!, db };
      })
      .sort((a, b) => b.db - a.db);
    const top = list[0];
    if (!top || top.db < p.thresholdDb) {
      this.spk.cand = undefined;
      return;
    }
    const holdOk = now - this.spk.last > p.holdSec * 1000;
    const second = list[1];
    const overlap = !!second && second.db > p.thresholdDb && top.db - second.db < 6;
    const want = overlap && p.wide ? "__wide" : top.id;
    if (this.spk.cand !== want) {
      this.spk.cand = want;
      this.spk.since = now;
    }
    if (now - this.spk.since < (overlap ? 1500 : 500) || !holdOk || this.spk.cur === want) return;
    const scene = want === "__wide" ? p.wide! : top.scene;
    this.spk.cur = want;
    this.spk.last = now;
    if (scene !== this.project.program && this.scene(scene)) {
      this.addLog(want === "__wide" ? "Plusieurs voix : plan large" : `Prise de parole : ${this.source(top.id)?.name}`);
      this.fade(scene);
    }
  }

  // ---------- diffusion ----------
  /** Publie le programme vers `whipUrl` (donnée par le Core). H.264 imposé par le client WHIP. */
  async goLive(whipUrl: string, kbps: number) {
    if (this.live === "connecting" || this.live === "live") return;
    this.live = "connecting";
    this.liveError = null;
    this.onChange();
    try {
      await this.audio().resume();
      const v = this.out.captureStream(30).getVideoTracks()[0];
      const a = this.recDest!.stream.getAudioTracks()[0];
      const stream = new MediaStream(a ? [v, a] : [v]);
      this.whip = await whipPublish(whipUrl, stream, kbps * 1000);
      const pc = this.whip.pc;
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") this.live = "live";
        else if (this.live !== "idle" && (pc.connectionState === "failed" || pc.connectionState === "disconnected" || pc.connectionState === "closed")) {
          this.live = "error";
          this.liveError = "La connexion avec le serveur est perdue.";
        }
        this.onChange();
      };
      this.live = pc.connectionState === "connected" ? "live" : "connecting";
      // Onglet en arrière-plan : requestAnimationFrame s'arrête, l'image figerait. Un Worker, lui, n'est pas ralenti.
      if (!this.ticker) {
        this.ticker = new Worker(URL.createObjectURL(new Blob(["setInterval(()=>postMessage(0),33)"], { type: "text/javascript" })));
        this.ticker.onmessage = () => document.hidden && this.renderFrame(performance.now());
      }
    } catch (e) {
      this.live = "error";
      this.liveError = e instanceof Error && e.message ? e.message : "Impossible de se connecter au serveur.";
      whipStop(this.whip);
      this.whip = null;
    }
    this.onChange();
  }
  stopLive() {
    whipStop(this.whip);
    this.whip = null;
    this.ticker?.terminate();
    this.ticker = null;
    this.live = "idle";
    this.liveError = null;
    this.onChange();
  }

  // ---------- enregistrement ----------
  startRecording() {
    if (this.recording) return;
    this.audio();
    const stream = this.out.captureStream(30);
    this.recDest!.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    const type = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
    this.recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6_000_000 });
    this.chunks = [];
    this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.recorder.onstop = () => {
      const url = URL.createObjectURL(new Blob(this.chunks, { type: "video/webm" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `syxtee-studio-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    };
    this.recorder.start(1000);
    this.recording = true;
    this.onChange();
  }
  stopRecording() {
    this.recorder?.stop();
    this.recording = false;
    this.onChange();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.recording) this.stopRecording();
    this.stopLive();
    for (const rt of this.runtimes.values()) {
      this.clean(rt);
      rt.stop();
    }
    this.runtimes.clear();
    this.actx?.close().catch(() => {});
  }
}
