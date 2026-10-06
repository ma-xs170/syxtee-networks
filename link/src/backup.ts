// Backup de scène : si la source surveillée (le flux SRT du relais, dans OBS) se fige ou coupe, bascule OBS sur la scène de secours,
// puis revient à la scène d'origine quand l'image repart. Tout se passe sur le PC : rien ne transite par le serveur.

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

type Req = (type: string, data?: Record<string, unknown>) => Promise<Record<string, unknown>>;

/**
 * Appelée une fois par seconde. L'image est « figée » quand deux captures consécutives de la source sont identiques ou que la capture échoue
 * (source absente, flux coupé). Les captures sont petites (160 px) : coût négligeable.
 */
export class BackupWatcher {
  cfg: BackupConfig = DEFAULT_BACKUP;
  state: "idle" | "ok" | "frozen" | "backup" = "idle";
  private last = "";
  private still = 0;
  private moving = 0;
  /** Scène à rétablir quand l'image revient. */
  private returnTo: string | null = null;
  onChange: (state: BackupWatcher["state"]) => void = () => {};

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

  private reset() {
    this.last = "";
    this.still = 0;
    this.moving = 0;
    this.returnTo = null;
    this.setState("idle");
  }

  private setState(s: BackupWatcher["state"]) {
    if (s === this.state) return;
    this.state = s;
    this.onChange(s);
  }

  async tick(): Promise<void> {
    const c = this.cfg;
    if (!c.enabled || !c.source || !c.scene) return;
    let shot = "";
    try {
      const r = await this.req("GetSourceScreenshot", { sourceName: c.source, imageFormat: "jpg", imageWidth: 160, imageHeight: 90, imageCompressionQuality: 40 });
      shot = String(r.imageData ?? "");
    } catch {
      shot = ""; // source introuvable ou flux coupé
    }
    const frozen = shot === "" || shot === this.last;
    this.last = shot;
    if (frozen) {
      this.still++;
      this.moving = 0;
    } else {
      this.moving++;
      this.still = 0;
    }

    if (this.state !== "backup") {
      if (this.still >= c.freezeSeconds) await this.engage();
      else this.setState(this.still > 0 ? "frozen" : "ok");
    } else if (this.moving >= c.recoverSeconds) {
      await this.release();
    }
  }

  private async engage() {
    const c = this.cfg;
    try {
      const cur = String((await this.req("GetCurrentProgramScene")).currentProgramSceneName ?? "");
      if (cur === c.scene) return;
      this.returnTo = cur;
      await this.req("SetCurrentProgramScene", { sceneName: c.scene });
      this.log(`backup : « ${c.source} » figée, bascule sur « ${c.scene} »`);
      this.setState("backup");
    } catch (e) {
      this.log(`backup : bascule impossible (${(e as Error).message})`);
    }
  }

  private async release() {
    const back = this.returnTo;
    try {
      const cur = String((await this.req("GetCurrentProgramScene")).currentProgramSceneName ?? "");
      // Si l'utilisateur a changé de scène à la main entre-temps, on ne touche à rien.
      if (back && cur === this.cfg.scene) {
        await this.req("SetCurrentProgramScene", { sceneName: back });
        this.log(`backup : image revenue, retour sur « ${back} »`);
      }
    } catch (e) {
      this.log(`backup : retour impossible (${(e as Error).message})`);
      return;
    }
    this.returnTo = null;
    this.setState("ok");
  }
}
