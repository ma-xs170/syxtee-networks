// Garde audio : pendant que la scène Live est à l'antenne, surveille le micro choisi. Silence prolongé ou micro coupé : alerte à l'écran,
// et, si on le demande, le micro est remis tout seul quand il a été coupé par erreur. Tout se passe sur le PC, comme la régie.

export type AudioConfig = {
  enabled: boolean;
  /** Entrée OBS surveillée (le micro). */
  source: string;
  /** Secondes de silence avant l'alerte. */
  seconds: number;
  /** Remet le micro tout seul s'il est coupé alors que la scène Live est à l'antenne. */
  unmute: boolean;
};

export const DEFAULT_AUDIO: AudioConfig = { enabled: false, source: "", seconds: 10, unmute: false };

export function cleanAudio(v: unknown, prev: AudioConfig = DEFAULT_AUDIO): AudioConfig {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : prev.enabled,
    source: typeof o.source === "string" ? o.source.slice(0, 200) : prev.source,
    seconds: typeof o.seconds === "number" && Number.isFinite(o.seconds) ? Math.min(120, Math.max(3, Math.round(o.seconds))) : prev.seconds,
    unmute: typeof o.unmute === "boolean" ? o.unmute : prev.unmute,
  };
}

export type AudioState = "idle" | "ok" | "silent" | "muted";

/** Pic linéaire sous lequel on parle de silence (-60 dB). */
export const SILENCE_PEAK = 0.001;

type Req = (type: string, data?: Record<string, unknown>) => Promise<Record<string, unknown>>;

export class AudioGuard {
  cfg: AudioConfig = DEFAULT_AUDIO;
  state: AudioState = "idle";
  onChange: (s: AudioState) => void = () => {};
  private live = "";
  private loudAt = 0;
  private armedAt = 0;
  private req: Req;
  private log: (m: string) => void;

  constructor(req: Req, log: (m: string) => void = () => {}) {
    this.req = req;
    this.log = log;
  }

  set(cfg: AudioConfig) {
    this.cfg = cfg;
    if (!cfg.enabled || !cfg.source) this.disarm();
  }

  setLive(scene: string) {
    if (scene !== this.live) this.disarm();
    this.live = scene;
  }

  /** Niveau d'une entrée (pic linéaire, 0 à 1), appelé à chaque mesure d'OBS. */
  feed(name: string, peak: number, now = Date.now()) {
    if (name === this.cfg.source && peak > SILENCE_PEAK) this.loudAt = now;
  }

  private disarm() {
    this.armedAt = 0;
    this.loudAt = 0;
    this.setState("idle");
  }

  private setState(s: AudioState) {
    if (s === this.state) return;
    this.state = s;
    this.onChange(s);
  }

  async tick(now = Date.now()): Promise<void> {
    const c = this.cfg;
    if (!c.enabled || !c.source || !this.live) return;
    let cur = "";
    try {
      cur = String((await this.req("GetCurrentProgramScene")).currentProgramSceneName ?? "");
    } catch {
      return;
    }
    if (cur !== this.live) return this.disarm(); // rien ne se surveille hors de la scène Live
    if (!this.armedAt) this.armedAt = now;
    let muted = false;
    try {
      muted = !!(await this.req("GetInputMute", { inputName: c.source })).inputMuted;
    } catch {
      this.setState("idle"); // entrée introuvable : on ne dit rien de faux
      return;
    }
    if (muted) {
      if (c.unmute) {
        try {
          await this.req("SetInputMute", { inputName: c.source, inputMuted: false });
          this.log(`audio : « ${c.source} » était coupé, micro remis`);
          this.loudAt = 0;
          this.armedAt = now;
          this.setState("ok");
          return;
        } catch (e) {
          this.log(`audio : impossible de remettre le micro (${(e as Error).message})`);
        }
      }
      return this.setState("muted");
    }
    const since = Math.max(this.loudAt, this.armedAt);
    this.setState(now - since >= c.seconds * 1000 ? "silent" : "ok");
  }
}
