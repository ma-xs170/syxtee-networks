import {
  ALERT_THRESHOLDS,
  CAMERA,
  CONNECTIONS,
  DESTINATIONS,
  INITIAL_EVENTS,
  LOOP_SECONDS,
  MODES,
  RESOLUTIONS,
  SYSTEM,
} from "@/config/encoder-demo";
import type { CameraInput, ConnId, EventLog, LiveState, ModeId, ResolutionId, SceneId, Status, SystemInfo } from "./types";

// Moteur de simulation de l'Encodeur : aucune dépendance React ni réseau. Valeurs réalistes, événements, scénario automatique d'environ 20 s
// (4G qui chute, bonding qui compense, slate qui apparaît puis disparaît, retour au vert) tant que personne n'a interagi.
// Utilisé par le mockProvider, donc par la démo publique ET par le dashboard client tant que le vrai backend n'est pas prêt.

export type Page = "overview" | "camera" | "connections" | "encoding" | "destinations" | "scenes" | "alerts" | "system" | "updates";
export type Tab = "live" | "connections" | "destinations" | "system";
export type Toast = { text: string; tone: "ok" | "error"; n: number };

export type Controls = {
  page: Page;
  tab: Tab;
  live: LiveState;
  muted: boolean;
  scene: SceneId;
  on: Record<ConnId, boolean>;
  order: ConnId[];
  res: ResolutionId;
  maxBitrate: number;
  mode: ModeId;
  codec: string;
  alerts: Record<string, boolean>;
  dest: Record<string, boolean>;
  reveal: Record<string, boolean>;
  toast: Toast | null;
  update: { state: "available" | "installing" | "done"; progress: number };
  restart: "idle" | "confirm" | "restarting";
  slateUntil: number;
  interacted: boolean;
  camera: CameraInput;
  /** Gain d'entrée audio en dB (-12 à +12) et noise gate. */
  gain: number;
  gate: boolean;
};

export type Snapshot = {
  seconds: number;
  rates: Record<ConnId, number>;
  signal: Record<ConnId, number>;
  latencies: Record<ConnId, number>;
  history: Record<ConnId, number[]>;
  totalHistory: number[];
  total: number;
  latency: number;
  loss: number;
  fps: number;
  slate: boolean;
  status: Status;
  dataPerHour: number;
  events: EventLog[];
  system: SystemInfo;
  note: string;
};

export type EngineState = { c: Controls; snap: Snapshot; auto: boolean };

const HISTORY = 40;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const noise = (a: number) => (Math.random() - 0.5) * 2 * a;
const ids = CONNECTIONS.map((c) => c.id);
const allOn = () => Object.fromEntries(ids.map((i) => [i, true])) as Record<ConnId, boolean>;
const hist = () => Object.fromEntries(CONNECTIONS.map((c) => [c.id, Array(HISTORY).fill(c.base)])) as Record<ConnId, number[]>;
const clock = (sec: number) => {
  const m = 10 * 60 + 48 + Math.floor(sec / 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

function initialControls(): Controls {
  return {
    page: "overview",
    tab: "live",
    live: "on",
    muted: false,
    scene: "live",
    on: allOn(),
    order: ids,
    res: "1080p30",
    maxBitrate: 8,
    mode: "balanced",
    codec: "H.264",
    alerts: Object.fromEntries(ALERT_THRESHOLDS.map((a) => [a.id, a.on])),
    dest: Object.fromEntries(DESTINATIONS.map((d) => [d.id, d.connected])),
    reveal: {},
    toast: null,
    update: { state: "available", progress: 0 },
    restart: "idle",
    slateUntil: 0,
    interacted: false,
    camera: { state: "connected", type: CAMERA.type, detected: CAMERA.detected, audioLevel: 62, test: "idle", framing: "frame" },
    gain: 0,
    gate: true,
  };
}

/** Instantané initial fixe (aucun hasard) : identique côté serveur et côté client, pas de décalage d'hydratation. */
function staticSnapshot(): Snapshot {
  const total = 8;
  return {
    seconds: 3720,
    rates: Object.fromEntries(CONNECTIONS.map((c) => [c.id, c.base])) as Record<ConnId, number>,
    signal: Object.fromEntries(CONNECTIONS.map((c) => [c.id, c.signal])) as Record<ConnId, number>,
    latencies: Object.fromEntries(CONNECTIONS.map((c) => [c.id, c.latency])) as Record<ConnId, number>,
    history: hist(),
    totalHistory: Array(HISTORY).fill(total),
    total,
    latency: 52,
    loss: 0.2,
    fps: 30,
    slate: false,
    status: "stable",
    dataPerHour: 3.6,
    events: INITIAL_EVENTS,
    system: { temp: SYSTEM.temp, battery: SYSTEM.battery, storage: SYSTEM.storage, cpu: SYSTEM.cpu, gpu: SYSTEM.gpu, ram: SYSTEM.ram },
    note: "Flux stable : toutes les connexions sont bondées.",
  };
}

export class MockEncoderEngine {
  readonly id: string;
  private c = initialControls();
  private snap = staticSnapshot();
  private listeners = new Set<() => void>();
  private t = 0;
  private events: EventLog[] = INITIAL_EVENTS;
  private fired = new Set<number>();
  private battery = SYSTEM.battery;
  private reduce = false;
  private state: EngineState;

  constructor(id = "enc-demo") {
    this.id = id;
    this.state = this.build();
  }

  private build(): EngineState {
    return { c: this.c, snap: this.snap, auto: !this.c.interacted && !this.reduce };
  }
  private emit() {
    this.state = this.build();
    this.listeners.forEach((f) => f());
  }
  getState = () => this.state;
  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  };
  setReduceMotion(r: boolean) {
    if (r !== this.reduce) {
      this.reduce = r;
      this.emit();
    }
  }

  private push(text: string, status: EventLog["status"]) {
    this.events = [{ time: clock(this.snap.seconds), text, status }, ...this.events].slice(0, 20);
  }
  private toast(text: string, tone: Toast["tone"] = "ok"): Toast {
    return { text, tone, n: Date.now() };
  }
  private set(fn: (p: Controls) => Controls, interact = true) {
    this.c = fn(interact ? { ...this.c, interacted: true } : { ...this.c });
    this.tick(0.7);
  }

  /** Un pas de simulation (dt en secondes). */
  tick(dt: number) {
    const k = this.c;
    this.t += dt;
    const auto = !k.interacted && !this.reduce;
    const phase = this.t % LOOP_SECONDS;
    let deg4g = 0;
    let degAll = 1;
    let note = "Flux stable : toutes les connexions sont bondées.";
    if (auto) {
      if (phase >= 6 && phase < 11) {
        deg4g = phase < 7 ? phase - 6 : phase > 10 ? 11 - phase : 1;
        note = "La 4G / 5G chute : les autres connexions compensent.";
      }
      if (phase >= 12 && phase < 15.5) {
        degAll = 0.04;
        note = "Coupure : le slate s'affiche, le temps de reconnecter.";
      }
      if (phase >= 15.5 && phase < 17) note = "Retour à la normale, le flux se rééquilibre.";
      const marks: [number, string, EventLog["status"]][] = [[6, "4G / 5G : signal faible, les autres connexions compensent", "warn"], [12, "Coupure générale : slate affiché", "bad"], [15.5, "Connexions rétablies", "ok"]];
      marks.forEach(([m, text, st], i) => {
        const key = Math.floor(this.t / LOOP_SECONDS) * 10 + i;
        if (phase >= m && !this.fired.has(key)) {
          this.fired.add(key);
          this.push(text, st);
        }
      });
    } else if (k.slateUntil > this.t) note = "Slate déclenché à la main.";

    const live = k.live === "on";
    const alive = ids.filter((i) => k.on[i]).length;
    const rates = { ...this.snap.rates };
    const signal = { ...this.snap.signal };
    const latencies = { ...this.snap.latencies };
    for (const d of CONNECTIONS) {
      const comp = alive > 0 && alive < ids.length ? 1 + 0.08 * (ids.length - alive) : 1;
      let target = k.on[d.id] && live ? d.base * comp * degAll : 0;
      if (d.id === "cell") target *= 1 - 0.9 * deg4g;
      else if (deg4g > 0 && target > 0) target *= 1 + 0.08 * deg4g;
      if (target > 0) target = Math.max(0.05, target + noise(0.15));
      rates[d.id] = clamp(rates[d.id] + (target - rates[d.id]) * 0.55, 0, 6);
      signal[d.id] = !k.on[d.id] ? 0 : d.id === "cell" && deg4g > 0.5 ? 1 : d.signal;
      latencies[d.id] = k.on[d.id] ? Math.round(d.latency + noise(3) + (d.id === "cell" ? deg4g * 70 : 0)) : 0;
    }
    const res = RESOLUTIONS.find((r) => r.id === k.res)!;
    const mode = MODES.find((m) => m.id === k.mode)!;
    const raw = Object.values(rates).reduce((a, b) => a + b, 0) * 0.97;
    const cap = Math.min(raw, k.maxBitrate);
    const starve = live ? clamp((res.need - cap) / res.need, 0, 1) : 0;
    const capacity = CONNECTIONS.reduce((a, d) => a + d.base, 0);
    const deficit = clamp(1 - raw / capacity, 0, 1);
    const latTarget = mode.latency + deficit * 110;
    const latency = this.snap.latency + (latTarget - this.snap.latency) * 0.5 + noise(2);
    const loss = clamp(this.snap.loss + ((0.15 + starve * starve * 8 + (deg4g > 0.5 ? 0.9 : 0)) - this.snap.loss) * 0.5 + noise(0.06), 0, 25);
    const noCam = k.camera.state === "nosignal";
    const slate = live && (k.slateUntil > this.t || cap < 1.2 || noCam);
    const fps = !live ? 0 : slate ? 30 : clamp(res.fps * (1 - 0.3 * starve) + noise(0.3), 15, res.fps);
    const status: Status = !live || slate ? "offline" : loss > 1.2 || starve > 0.25 ? "unstable" : "stable";
    if (live && noCam) note = "Aucun signal de la caméra : vérifie le câble.";
    else if (!auto && slate && k.slateUntil <= this.t && cap < 1.2) note = "Débit trop bas : le slate s'affiche.";
    this.battery = Math.max(20, this.battery - dt * 0.002);
    const cpu = clamp(24 + (res.fps === 60 ? 22 : 8) + (k.codec === "H.265" ? 12 : 0) + (live ? 6 : -10) + noise(2), 5, 95);
    const gpu = clamp(14 + (res.fps === 60 ? 20 : 8) + (k.codec === "H.265" ? 10 : 0) + (live ? 8 : -6) + noise(2), 3, 95);
    const ram = clamp(40 + (live ? 8 : 0) + (k.codec === "H.265" ? 6 : 0) + noise(1.5), 20, 90);
    const system: SystemInfo = { temp: Math.round(40 + cpu * 0.2 + gpu * 0.1 + noise(0.4)), battery: Math.round(this.battery), storage: SYSTEM.storage, cpu: Math.round(cpu), gpu: Math.round(gpu), ram: Math.round(ram) };
    const history = Object.fromEntries(ids.map((i) => [i, [...this.snap.history[i].slice(1), rates[i]]])) as Record<ConnId, number[]>;
    // niveau audio de la caméra
    const cam = k.camera;
    const audio = cam.state === "connected" && !k.muted ? clamp(cam.audioLevel + noise(14), 18, 95) : 0;
    if (audio !== cam.audioLevel) this.c = { ...this.c, camera: { ...cam, audioLevel: Math.round(audio) } };
    this.snap = {
      seconds: this.snap.seconds + dt,
      rates, signal, latencies, history,
      totalHistory: [...this.snap.totalHistory.slice(1), cap],
      total: cap,
      latency: Math.max(18, latency),
      loss, fps, slate, status,
      dataPerHour: (cap * 3600) / 8 / 1000,
      events: this.events,
      system,
      note: live ? note : "Direct arrêté.",
    };
    this.emit();
  }

  /* ───────────── actions (équivalent des méthodes du provider) ───────────── */
  setPage = (page: Page) => this.set((p) => ({ ...p, page }));
  setTab = (tab: Tab) => this.set((p) => ({ ...p, tab }));
  startStream = () => {
    if (this.c.live !== "off") return;
    this.set((p) => ({ ...p, live: "starting" }));
    setTimeout(() => {
      this.c = { ...this.c, live: "on", toast: this.toast("Direct démarré.") };
      this.push("Direct démarré", "ok");
      this.tick(0.7);
    }, 1200);
  };
  stopStream = () => {
    if (this.c.live !== "on") return;
    this.push("Direct arrêté", "warn");
    this.set((p) => ({ ...p, live: "off", toast: this.toast("Direct arrêté.") }));
  };
  toggleLive = () => (this.c.live === "on" ? this.stopStream() : this.startStream());
  toggleMute = () => this.set((p) => ({ ...p, muted: !p.muted, toast: this.toast(p.muted ? "Micro réactivé." : "Micro coupé.") }));
  switchScene = (scene: SceneId) => this.set((p) => ({ ...p, scene }));
  triggerSlate = () => {
    this.push("Slate déclenché à la main", "warn");
    this.set((p) => ({ ...p, toast: this.toast("Slate affiché pendant 4 s."), slateUntil: this.t + 4 }));
  };
  setConnectionEnabled = (id: ConnId, on: boolean) => {
    if (this.c.on[id] === on) return;
    const alive = ids.filter((i) => this.c.on[i]).length;
    this.push(`${CONNECTIONS.find((d) => d.id === id)!.label} : ${on ? "rétablie" : "coupée"}`, on ? "ok" : "warn");
    this.set((p) => ({ ...p, on: { ...p.on, [id]: on }, toast: this.toast(on ? "Connexion rétablie." : alive > 1 ? "Connexion coupée, le bonding compense." : "Connexion coupée, plus aucune connexion.") }));
  };
  toggleConn = (id: ConnId) => this.setConnectionEnabled(id, !this.c.on[id]);
  moveConn = (id: ConnId, dir: -1 | 1) =>
    this.set((p) => {
      const o = [...p.order];
      const i = o.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= o.length) return p;
      [o[i], o[j]] = [o[j], o[i]];
      return { ...p, order: o, toast: this.toast("Priorité modifiée.") };
    });
  setEncoding = (s: { res?: ResolutionId; maxBitrate?: number; mode?: ModeId; codec?: string }) => this.set((p) => ({ ...p, ...s }));
  toggleAlert = (id: string) => this.set((p) => ({ ...p, alerts: { ...p.alerts, [id]: !p.alerts[id] } }));
  setDestination = (id: string, connected: boolean) => this.set((p) => ({ ...p, dest: { ...p.dest, [id]: connected }, toast: this.toast(connected ? "Destination connectée." : "Destination déconnectée.") }));
  toggleDest = (id: string) => this.setDestination(id, !this.c.dest[id]);
  toggleReveal = (id: string) => this.set((p) => ({ ...p, reveal: { ...p.reveal, [id]: !p.reveal[id] } }));
  notify = (text: string, tone: Toast["tone"] = "ok") => this.set((p) => ({ ...p, toast: this.toast(text, tone) }));
  askRestart = () => this.set((p) => ({ ...p, restart: "confirm" }));
  cancelRestart = () => this.set((p) => ({ ...p, restart: "idle" }));
  reboot = () => {
    this.push("Redémarrage de l'Encodeur", "warn");
    this.set((p) => ({ ...p, restart: "restarting", live: "off" }));
    setTimeout(() => {
      this.c = { ...this.c, restart: "idle", live: "on", toast: this.toast("Encodeur redémarré, direct repris.") };
      this.tick(0.7);
    }, 2600);
  };
  startUpdate = () => {
    this.set((p) => ({ ...p, update: { state: "installing", progress: 0 } }));
    const id = setInterval(() => {
      const progress = Math.min(100, this.c.update.progress + 7);
      if (progress >= 100) {
        clearInterval(id);
        this.push("Mise à jour installée", "ok");
        this.c = { ...this.c, update: { state: "done", progress: 100 }, toast: this.toast("Mise à jour installée.") };
      } else this.c = { ...this.c, update: { state: "installing", progress } };
      this.tick(0.7);
    }, 350);
  };
  /* Entrée caméra */
  testCamera = () => {
    if (this.c.camera.test === "testing") return;
    this.set((p) => ({ ...p, camera: { ...p.camera, test: "testing" } }));
    setTimeout(() => {
      const ok = this.c.camera.state === "connected";
      this.c = { ...this.c, camera: { ...this.c.camera, test: ok ? "ok" : "idle" }, toast: this.toast(ok ? `Signal caméra OK : ${this.c.camera.detected}.` : "Aucun signal : vérifie le câble de ta caméra.", ok ? "ok" : "error") };
      this.tick(0.7);
    }, 1500);
  };
  setCameraConnected = (on: boolean) => {
    this.push(on ? "Caméra branchée" : "Caméra débranchée", on ? "ok" : "bad");
    this.set((p) => ({ ...p, camera: { ...p.camera, state: on ? "connected" : "nosignal", test: "idle" }, toast: this.toast(on ? "Caméra détectée." : "Aucun signal de la caméra.", on ? "ok" : "error") }));
  };
  setAudio = (s: { gain?: number; gate?: boolean }) => this.set((p) => ({ ...p, ...s }));
  setFraming = (framing: CameraInput["framing"]) => this.set((p) => ({ ...p, camera: { ...p.camera, framing } }));
  reset = () => {
    this.t = 0;
    this.fired = new Set();
    this.events = INITIAL_EVENTS;
    this.battery = SYSTEM.battery;
    this.c = initialControls();
    this.snap = staticSnapshot();
    this.emit();
  };
}
