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
  /** Passe sur la scène de secours tant que le micro est muet ou coupé, puis revient sur Live quand le son repart. */
  backup: boolean;
};

export const DEFAULT_AUDIO: AudioConfig = { enabled: false, source: "", seconds: 10, unmute: false, backup: false };

export function cleanAudio(v: unknown, prev: AudioConfig = DEFAULT_AUDIO): AudioConfig {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : prev.enabled,
    source: typeof o.source === "string" ? o.source.slice(0, 200) : prev.source,
    seconds: typeof o.seconds === "number" && Number.isFinite(o.seconds) ? Math.min(120, Math.max(3, Math.round(o.seconds))) : prev.seconds,
    unmute: typeof o.unmute === "boolean" ? o.unmute : prev.unmute,
    backup: typeof o.backup === "boolean" ? o.backup : prev.backup,
  };
}

export type AudioState = "idle" | "ok" | "silent" | "muted" | "backup";

/** Secondes de son continu avant de quitter la scène de secours. */
const RECOVER_MS = 3000;

/** Pic linéaire sous lequel on parle de silence (-60 dB). */
export const SILENCE_PEAK = 0.001;

type Req = (type: string, data?: Record<string, unknown>) => Promise<Record<string, unknown>>;

export class AudioGuard {
  cfg: AudioConfig = DEFAULT_AUDIO;
  state: AudioState = "idle";
  onChange: (s: AudioState) => void = () => {};
  private live = "";
  /** Scène de secours de la régie (la même que pour le flux coupé). */
  private backupScene = "";
  private loudAt = 0;
  private loudSince = 0;
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

  setBackupScene(scene: string) {
    this.backupScene = scene;
  }

  setLive(scene: string) {
    if (scene !== this.live) this.disarm();
    this.live = scene;
  }

  /** Niveau d'une entrée (pic linéaire, 0 à 1), appelé à chaque mesure d'OBS. */
  feed(name: string, peak: number, now = Date.now()) {
    if (name !== this.cfg.source) return;
    if (peak > SILENCE_PEAK) {
      if (now - this.loudAt > 1000) this.loudSince = now; // le son vient de revenir
      this.loudAt = now;
    }
  }

  private disarm() {
    this.armedAt = 0;
    this.loudAt = 0;
    this.loudSince = 0;
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
    const away = this.state === "backup";
    // Hors scène Live (et hors du secours que nous avons mis nous-mêmes) : rien ne se surveille, rien ne bascule.
    if (cur !== this.live && !(away && cur === this.backupScene)) return this.disarm();
    if (!this.armedAt) this.armedAt = now;
    if (away && cur === this.backupScene) {
      // Le son doit être revenu un moment avant de quitter le secours.
      try {
        if (c.unmute && (await this.req("GetInputMute", { inputName: c.source })).inputMuted) await this.req("SetInputMute", { inputName: c.source, inputMuted: false });
      } catch {
        /* entrée introuvable : on reste sur le secours */
      }
      if (this.loudAt > 0 && now - this.loudAt < 1000 && this.loudAt - this.loudSince >= RECOVER_MS) {
        try {
          await this.req("SetCurrentProgramScene", { sceneName: this.live });
          this.log(`audio : son revenu sur « ${c.source} », retour sur « ${this.live} »`);
        } catch (e) {
          this.log(`audio : retour impossible (${(e as Error).message})`);
          return;
        }
        this.armedAt = now;
        this.setState("ok");
      }
      return;
    }
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
      return this.raise("muted", cur);
    }
    const since = Math.max(this.loudAt, this.armedAt);
    if (now - since >= c.seconds * 1000) await this.raise("silent", cur);
    else this.setState("ok");
  }

  /** Alerte, et bascule sur le secours si demandé et si ce n'est pas déjà la scène à l'antenne. */
  private async raise(kind: "silent" | "muted", cur: string) {
    const c = this.cfg;
    if (c.backup && this.backupScene && cur === this.live) {
      try {
        await this.req("SetCurrentProgramScene", { sceneName: this.backupScene });
        this.log(`audio : « ${c.source} » ${kind === "muted" ? "coupé" : "silencieux"}, bascule sur « ${this.backupScene} »`);
        this.loudAt = 0;
        this.loudSince = 0;
        this.setState("backup");
        return;
      } catch (e) {
        this.log(`audio : bascule impossible (${(e as Error).message})`);
      }
    }
    this.setState(kind);
  }
}
