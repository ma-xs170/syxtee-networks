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
  /** Règles supplémentaires (caméra 2, écran, invité…) : même logique que le drone, par ordre de priorité après lui. */
  rules: AutoRule[];
};
export type AutoRule = { source: string; scene: string };
export const MAX_RULES = 8;
export const DEFAULT_AUTO: AutoConfig = { enabled: false, droneScene: "", droneSource: "", rules: [] };

function cleanRules(v: unknown, prev: AutoRule[]): AutoRule[] {
  if (!Array.isArray(v)) return prev;
  const out: AutoRule[] = [];
  for (const r of v.slice(0, MAX_RULES)) {
    const o = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
    const source = typeof o.source === "string" ? o.source.slice(0, 200) : "";
    const scene = typeof o.scene === "string" ? o.scene.slice(0, 200) : "";
    out.push({ source, scene }); // les lignes vides restent : l'interface les remplit ensuite (targets() les ignore)
  }
  return out;
}

export function cleanAuto(v: unknown, prev: AutoConfig = DEFAULT_AUTO): AutoConfig {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const str = (x: unknown, d: string) => (typeof x === "string" ? x.slice(0, 200) : d);
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : prev.enabled,
    droneScene: str(o.droneScene, prev.droneScene),
    droneSource: str(o.droneSource, prev.droneSource),
    rules: cleanRules(o.rules, prev.rules ?? []),
  };
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
  /** Règles de prise (drone + règles supplémentaires) : dernière image et compteurs par couple source/scène. */
  private takes = new Map<string, { last: string; up: number; down: number }>();
  /** Règle dont la scène est à l'antenne (état « drone »). */
  private active: AutoRule | null = null;
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
    if (!a.enabled) this.takes.clear();
  }

  setLive(scene: string) {
    if (scene !== this.live) this.disarm();
    this.live = scene;
  }

  private disarm() {
    this.last = "";
    this.takes.clear();
    this.active = null;
    this.still = 0;
    this.moving = 0;
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
    const targets = this.targets();
    const piloting = targets.length > 0;
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
    const ours = (this.state === "backup" && cur === c.scene) || (this.state === "drone" && cur === this.active?.scene);
    if (cur !== this.live && !ours) {
      // Autre scène à l'antenne (choix manuel) : on se désarme sans rien toucher.
      if (this.state !== "idle" || this.armedTicks > 0) this.disarm();
      return;
    }
    // Retour manuel sur la scène Live pendant un secours ou un drone : on laisse la main à l'utilisateur un moment.
    if (cur === this.live && (this.state === "backup" || this.state === "drone")) {
      this.hold = HOLD_TICKS;
      this.returnTo = null;
      this.active = null;
      this.takes.clear();
      this.setState("ok");
    }
    this.armedTicks++;

    // ───── Prises (drone et autres règles) : belle prise → scène cible, prise perdue → retour ─────
    if (piloting) {
      // Une capture par source, même si plusieurs règles la partagent.
      const shots = new Map<string, string>();
      for (const t of targets) if (!shots.has(t.source)) shots.set(t.source, await this.shot(t.source));
      for (const t of targets) {
        const key = `${t.source}\n${t.scene}`;
        const seen = this.takes.get(key);
        const st = seen ?? { last: "", up: 0, down: 0 };
        const shot = shots.get(t.source) ?? "";
        // Première capture après un armement : on la mémorise seulement (une image périmée ne compte pas comme « qui bouge »).
        const good = !!seen && shot.length > MIN_IMAGE_CHARS && shot !== st.last;
        st.last = shot;
        if (good) {
          st.up++;
          st.down = 0;
        } else {
          st.down++;
          st.up = 0;
        }
        this.takes.set(key, st);
      }
      if (this.state === "drone" && this.active) {
        const act = this.active;
        const st = this.takes.get(`${act.source}\n${act.scene}`);
        if (!st || st.down >= DRONE_DOWN) {
          await this.back("drone", `prise de « ${act.source} » perdue`);
          return;
        }
        return; // on reste sur la prise ; le secours ne joue pas pendant une belle prise
      }
      if (cur === this.live && this.hold === 0 && this.state !== "backup") {
        // Priorité : ordre de la liste (drone d'abord).
        const pick = targets.find((t) => (this.takes.get(`${t.source}\n${t.scene}`)?.up ?? 0) >= DRONE_UP);
        if (pick) {
          try {
            this.returnTo = cur;
            await this.req("SetCurrentProgramScene", { sceneName: pick.scene });
            this.log(`auto-gérance : belle prise de « ${pick.source} », bascule sur « ${pick.scene} »`);
            this.active = pick;
            this.setState("drone");
            for (const v of this.takes.values()) v.down = 0;
            return;
          } catch (e) {
            this.log(`auto-gérance : bascule impossible (${(e as Error).message})`);
          }
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
      const mine = from === "backup" ? this.cfg.scene : this.active?.scene;
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
    this.active = null;
    this.takes.clear();
    this.setState("ok");
  }

  /** Règles actives, par priorité : le drone, puis les règles supplémentaires complètes (source et scène). */
  private targets(): AutoRule[] {
    if (!this.auto.enabled) return [];
    const list: AutoRule[] = [{ source: this.auto.droneSource, scene: this.auto.droneScene }, ...(this.auto.rules ?? [])];
    return list.filter((r) => r.source && r.scene);
  }
}
