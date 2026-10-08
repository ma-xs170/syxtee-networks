// Régie automatique : (1) backup de scène : si la source surveillée (le flux SRT du relais, dans OBS) se fige ou coupe, bascule OBS sur la scène de secours,
// puis revient à la scène d'origine quand l'image repart. (2) Auto-gérance : une belle prise de la source « drone » (image qui bouge, pas noire)
// bascule sur la scène drone, et on revient à la scène Live quand elle se fige. Tout se passe sur le PC : rien ne transite par le serveur.
//
// Règle de base : la logique ne démarre QUE lorsque la scène Live est à l'antenne (on l'a cliquée). Sur toute autre scène (« On commence
// bientôt », « Discord »…), rien ne bascule jamais toute seule.

export type BackupConfig = {
  enabled: boolean;
  /** Source OBS surveillée (entrée média ou navigateur qui lit le relais). */
  source: string;
  /** Scène de secours (BRB). */
  scene: string;
  /** Secondes d'image figée avant de basculer. */
  freezeSeconds: number;
  /** Secondes d'image mobile avant de revenir. */
  recoverSeconds: number;
  /** Déclenchement : « cut » coupure seulement ; « cut_lowbitrate » coupure ou débit très bas ; « sensitive » plus réactif. */
  trigger: Trigger;
};

export type Trigger = "cut" | "cut_lowbitrate" | "sensitive";
export const TRIGGERS: Trigger[] = ["cut", "cut_lowbitrate", "sensitive"];

export const DEFAULT_BACKUP: BackupConfig = { enabled: false, source: "", scene: "", freezeSeconds: 4, recoverSeconds: 3, trigger: "cut" };

export function cleanBackup(v: unknown, prev: BackupConfig = DEFAULT_BACKUP): BackupConfig {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const num = (x: unknown, d: number, lo: number, hi: number) => (typeof x === "number" && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d);
  const str = (x: unknown, d: string) => (typeof x === "string" ? x.slice(0, 200) : d);
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : prev.enabled,
    source: str(o.source, prev.source),
    scene: str(o.scene, prev.scene),
    freezeSeconds: num(o.freezeSeconds, prev.freezeSeconds, 1, 60),
    recoverSeconds: num(o.recoverSeconds, prev.recoverSeconds, 1, 60),
    trigger: TRIGGERS.includes(o.trigger as Trigger) ? (o.trigger as Trigger) : prev.trigger,
  };
}


/** Auto-gérance : prises de drone (ou de toute autre caméra) qui s'enchaînent toutes seules avec la scène Live. */
export type AutoConfig = {
  enabled: boolean;
  /** Scène à montrer pendant une belle prise (n'importe quelle scène, pas forcément « DRONE »). */
  droneScene: string;
  /** Source OBS dont on juge l'image : entrée média ou navigateur du drone. */
  droneSource: string;
};
export const DEFAULT_AUTO: AutoConfig = { enabled: false, droneScene: "", droneSource: "" };

export function cleanAuto(v: unknown, prev: AutoConfig = DEFAULT_AUTO): AutoConfig {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const str = (x: unknown, d: string) => (typeof x === "string" ? x.slice(0, 200) : d);
  return { enabled: typeof o.enabled === "boolean" ? o.enabled : prev.enabled, droneScene: str(o.droneScene, prev.droneScene), droneSource: str(o.droneSource, prev.droneSource) };
}

type Req = (type: string, data?: Record<string, unknown>) => Promise<Record<string, unknown>>;

/** Une image de 160 px presque noire se compresse en très peu d'octets : en dessous, ce n'est pas une « belle prise ». */
const MIN_IMAGE_CHARS = 3000;
/** Secondes d'attente après avoir mis la scène Live à l'antenne, le temps que le flux arrive, avant de basculer sur le secours. */
const GRACE_TICKS = 8;
/** Secondes d'une belle prise stable avant de basculer sur le drone, et de prise perdue avant de revenir. */
const DRONE_UP = 3;
const DRONE_DOWN = 4;
/** Après un choix manuel de scène, l'auto-gérance se met en pause (secondes). */
const HOLD_TICKS = 30;

export type DirectorState = "idle" | "ok" | "frozen" | "backup" | "drone";

/**
 * Appelée une fois par seconde. L'image est « figée » quand deux captures consécutives de la source sont identiques ou que la capture échoue
 * (source absente, flux coupé). Les captures sont petites (160 px) : coût négligeable.
 */
export class BackupWatcher {
  cfg: BackupConfig = DEFAULT_BACKUP;
  auto: AutoConfig = DEFAULT_AUTO;
  state: DirectorState = "idle";
  /** Scène Live : la logique n'est active que lorsqu'elle est à l'antenne. */
  private live = "";
  /** Débit du flux surveillé (kbit/s), donné par l'agent ; null = inconnu (les déclenchements au débit sont alors sans effet). */
  private bitrate: number | null = null;
  setBitrate(kbps: number | null) {
    this.bitrate = kbps;
  }
  /** Seuil de « débit très bas » selon le déclenchement choisi. */
  static lowBitrate(t: Trigger): number {
    return t === "sensitive" ? 800 : t === "cut_lowbitrate" ? 300 : 0;
  }
  private last = "";
  private still = 0;
  private moving = 0;
  private lastDrone = "";
  private droneUp = 0;
  private droneDown = 0;
  private armedTicks = 0;
  private seenMoving = false;
  private hold = 0;
  /** Scène à rétablir quand l'image revient. */
  private returnTo: string | null = null;
  onChange: (state: DirectorState) => void = () => {};

  private req: Req;
  private log: (m: string) => void;

  constructor(req: Req, log: (m: string) => void = () => {}) {
    this.req = req;
    this.log = log;
  }

  set(cfg: BackupConfig) {
    this.cfg = cfg;
    if (!cfg.enabled || !cfg.source || !cfg.scene) this.reset();
  }

  setAuto(a: AutoConfig) {
    this.auto = a;
    if (!a.enabled) {
      this.droneUp = this.droneDown = 0;
      this.lastDrone = "";
    }
  }

  setLive(scene: string) {
    if (scene !== this.live) this.disarm();
    this.live = scene;
  }

  private disarm() {
    this.last = "";
    this.lastDrone = "";
    this.still = 0;
    this.moving = 0;
    this.droneUp = 0;
    this.droneDown = 0;
    this.armedTicks = 0;
    this.seenMoving = false;
    this.returnTo = null;
    this.setState("idle");
  }

  private reset() {
    this.disarm();
  }

  private setState(s: DirectorState) {
    if (s === this.state) return;
    this.state = s;
    this.onChange(s);
  }

  private async shot(source: string): Promise<string> {
    try {
      const r = await this.req("GetSourceScreenshot", { sourceName: source, imageFormat: "jpg", imageWidth: 160, imageHeight: 90, imageCompressionQuality: 40 });
      return String(r.imageData ?? "");
    } catch {
      return ""; // source introuvable ou flux coupé
    }
  }

  async tick(): Promise<void> {
    const c = this.cfg;
    const watching = c.enabled && !!c.source && !!c.scene;
    const piloting = this.auto.enabled && !!this.auto.droneScene && !!this.auto.droneSource;
    if (!watching && !piloting) return;
    if (!this.live) return; // pas de scène Live choisie : rien ne bascule jamais tout seul
    let cur = "";
    try {
      cur = String((await this.req("GetCurrentProgramScene")).currentProgramSceneName ?? "");
    } catch {
      return;
    }
    if (this.hold > 0) this.hold--;

    // La logique n'existe que sur la scène Live, ou sur une scène que NOUS avons mise à l'antenne (secours, drone).
    const ours = (this.state === "backup" && cur === c.scene) || (this.state === "drone" && cur === this.auto.droneScene);
    if (cur !== this.live && !ours) {
      // Autre scène à l'antenne (choix manuel) : on se désarme sans rien toucher.
      if (this.state !== "idle" || this.armedTicks > 0) this.disarm();
      return;
    }
    // Retour manuel sur la scène Live pendant un secours ou un drone : on laisse la main à l'utilisateur un moment.
    if (cur === this.live && (this.state === "backup" || this.state === "drone")) {
      this.hold = HOLD_TICKS;
      this.returnTo = null;
      this.droneUp = this.droneDown = 0;
      this.setState("ok");
    }
    this.armedTicks++;

    // ───── Drone : belle prise → scène drone, prise perdue → retour ─────
    if (piloting) {
      const shot = await this.shot(this.auto.droneSource);
      const good = shot.length > MIN_IMAGE_CHARS && shot !== this.lastDrone;
      this.lastDrone = shot;
      if (good) {
        this.droneUp++;
        this.droneDown = 0;
      } else {
        this.droneDown++;
        this.droneUp = 0;
      }
      if (this.state === "drone") {
        if (this.droneDown >= DRONE_DOWN) {
          await this.back("drone", `prise de « ${this.auto.droneSource} » perdue`);
          return;
        }
        return; // on reste sur le drone ; le secours ne joue pas pendant une belle prise
      }
      if (cur === this.live && this.hold === 0 && this.droneUp >= DRONE_UP && this.state !== "backup") {
        try {
          this.returnTo = cur;
          await this.req("SetCurrentProgramScene", { sceneName: this.auto.droneScene });
          this.log(`auto-gérance : belle prise de « ${this.auto.droneSource} », bascule sur « ${this.auto.droneScene} »`);
          this.setState("drone");
          this.droneDown = 0;
          return;
        } catch (e) {
          this.log(`auto-gérance : bascule impossible (${(e as Error).message})`);
        }
      }
    }

    if (!watching) return;

    // ───── Secours : le flux surveillé se fige ou coupe ─────
    const shot = await this.shot(c.source);
    // Débit très bas (déclenchements « débit » et « sensible ») : compte comme une image figée, avant même que l'image ne se fige.
    const threshold = BackupWatcher.lowBitrate(c.trigger);
    const low = threshold > 0 && this.bitrate !== null && this.bitrate < threshold;
    const imageMoves = shot !== "" && shot !== this.last;
    if (imageMoves) this.seenMoving = true;
    const frozen = !imageMoves || low;
    this.last = shot;
    if (frozen) {
      this.still++;
      this.moving = 0;
    } else {
      this.moving++;
      this.still = 0;
    }

    if (this.state !== "backup") {
      // « Sensible » : bascule dès 2 secondes, même si le réglage de base est plus patient.
      const needed = c.trigger === "sensitive" ? Math.min(c.freezeSeconds, 2) : c.freezeSeconds;
      // À la mise à l'antenne de la scène Live, on laisse au flux le temps d'arriver avant de crier à la coupure.
      const graced = this.seenMoving || this.armedTicks > GRACE_TICKS;
      if (this.still >= needed && graced) await this.engage(cur);
      else this.setState(this.still > 0 && graced ? "frozen" : "ok");
    } else if (this.moving >= c.recoverSeconds) {
      await this.back("backup", "image revenue");
    }
  }

  private async engage(cur: string) {
    const c = this.cfg;
    try {
      if (cur === c.scene) return;
      this.returnTo = cur;
      await this.req("SetCurrentProgramScene", { sceneName: c.scene });
      this.log(`backup : « ${c.source} » figée, bascule sur « ${c.scene} »`);
      this.setState("backup");
    } catch (e) {
      this.log(`backup : bascule impossible (${(e as Error).message})`);
    }
  }

  /** Retour à la scène d'origine (Live) après un secours ou une prise de drone. */
  private async back(from: "backup" | "drone", why: string) {
    const target = this.returnTo ?? this.live;
    try {
      const cur = String((await this.req("GetCurrentProgramScene")).currentProgramSceneName ?? "");
      const mine = from === "backup" ? this.cfg.scene : this.auto.droneScene;
      // Si l'utilisateur a changé de scène à la main entre-temps, on ne touche à rien.
      if (target && cur === mine) {
        await this.req("SetCurrentProgramScene", { sceneName: target });
        this.log(`${from === "backup" ? "backup" : "auto-gérance"} : ${why}, retour sur « ${target} »`);
      }
    } catch (e) {
      this.log(`retour impossible (${(e as Error).message})`);
      return;
    }
    this.returnTo = null;
    this.droneUp = this.droneDown = 0;
    this.setState("ok");
  }
}
