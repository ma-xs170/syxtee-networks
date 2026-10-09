// Régie IA : plusieurs caméras en même temps (3 téléphones SRTLA, un drone…), chacune dans sa scène OBS. Toutes les quelques secondes, une vignette
// de chaque caméra vivante part vers un modèle de vision (Claude Haiku) avec les consignes de l'utilisateur en langage naturel (« si je montre un objet,
// prends cette caméra »). Le modèle ne répond que par un numéro : on bascule sur la scène de cette caméra. Une caméra figée ou noire n'est jamais choisie.
//
// Règle de base, comme la régie : rien ne bascule tant que la scène Live (ou une scène que NOUS avons mise à l'antenne) n'est pas à l'antenne.
// Anti-yoyo : durée minimale sur une caméra, et deux avis concordants avant de changer (sauf si la caméra à l'antenne est morte).

export type DirectorCam = {
  /** Source OBS de la caméra (le flux SRTLA du téléphone). */
  source: string;
  /** Scène à montrer quand on choisit cette caméra. */
  scene: string;
  /** Rôle en quelques mots, lu par le modèle : « caméra à la main », « drone », « dans la voiture ». */
  label: string;
};

export type DirectorConfig = {
  enabled: boolean;
  /** Clé API Anthropic de l'utilisateur : reste sur son PC. */
  apiKey: string;
  cams: DirectorCam[];
  /** Consignes en langage naturel. */
  rules: string;
  /** Secondes entre deux analyses. */
  interval: number;
  /** Secondes minimales sur une caméra avant d'en changer. */
  hold: number;
};

export const MAX_CAMS = 6;
export const DEFAULT_DIRECTOR: DirectorConfig = {
  enabled: false,
  apiKey: "",
  cams: [],
  rules:
    "Montre la caméra où il se passe quelque chose : une personne qui parle à la caméra, un objet montré de près, une entrée dans un véhicule. Le drone, quand il vole avec une belle vue. Reste sur la caméra actuelle si rien ne change.",
  interval: 4,
  hold: 6,
};

export function cleanDirector(v: unknown, prev: DirectorConfig = DEFAULT_DIRECTOR): DirectorConfig {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const str = (x: unknown, d: string, n: number) => (typeof x === "string" ? x.slice(0, n) : d);
  const num = (x: unknown, d: number, lo: number, hi: number) => (typeof x === "number" && Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : d);
  let cams = prev.cams;
  if (Array.isArray(o.cams)) {
    cams = o.cams.slice(0, MAX_CAMS).map((c) => {
      const x = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
      return { source: str(x.source, "", 200), scene: str(x.scene, "", 200), label: str(x.label, "", 80) };
    });
  }
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : prev.enabled,
    // Clé : une valeur vide ne l'efface pas (l'interface ne la relit jamais) ; « clearKey » l'efface.
    apiKey: o.clearKey === true ? "" : typeof o.apiKey === "string" && o.apiKey.trim() ? o.apiKey.trim().slice(0, 300) : prev.apiKey,
    cams,
    rules: str(o.rules, prev.rules, 1000),
    interval: num(o.interval, prev.interval, 2, 30),
    hold: num(o.hold, prev.hold, 2, 120),
  };
}

export type DirectorState = "idle" | "watching" | "cam";

type Req = (type: string, data?: Record<string, unknown>) => Promise<Record<string, unknown>>;
/** Interroge le modèle : images (data URI jpeg), une par caméra vivante, dans l'ordre donné. Renvoie le texte de la réponse. */
export type Ask = (prompt: string, images: string[]) => Promise<string>;

/** Une vignette presque noire se compresse en très peu d'octets : en dessous, ce n'est pas une image exploitable. */
const MIN_IMAGE_CHARS = 2500;
/** Avis concordants avant de changer de caméra. */
const AGREE = 2;

export class AiDirector {
  cfg: DirectorConfig = DEFAULT_DIRECTOR;
  state: DirectorState = "idle";
  /** Index de la caméra à l'antenne choisie par nous (−1 : aucune). */
  current = -1;
  lastReason = "";
  onChange: (s: DirectorState, cam: number, reason: string) => void = () => {};
  private live = "";
  private req: Req;
  private ask: Ask;
  private log: (m: string) => void;
  private last = new Map<string, string>();
  private busy = false;
  private lastRun = 0;
  private since = 0;
  private candidate = -1;
  private votes = 0;

  constructor(req: Req, ask: Ask, log: (m: string) => void = () => {}) {
    this.req = req;
    this.ask = ask;
    this.log = log;
  }

  set(cfg: DirectorConfig) {
    this.cfg = cfg;
    if (!this.ready()) this.disarm();
  }

  setLive(scene: string) {
    if (scene !== this.live) this.disarm();
    this.live = scene;
  }

  private ready() {
    return this.cfg.enabled && !!this.cfg.apiKey && this.usable().length >= 2;
  }

  /** Caméras complètes (source et scène). Leur position dans cette liste est le numéro donné au modèle. */
  private usable(): DirectorCam[] {
    return this.cfg.cams.filter((c) => c.source && c.scene);
  }

  private disarm() {
    this.last.clear();
    this.current = -1;
    this.candidate = -1;
    this.votes = 0;
    this.since = 0;
    this.setState("idle", "");
  }

  private setState(s: DirectorState, reason: string) {
    if (s === this.state && reason === this.lastReason) return;
    this.state = s;
    this.lastReason = reason;
    this.onChange(s, this.current, reason);
  }

  private async shot(source: string): Promise<string> {
    try {
      const r = await this.req("GetSourceScreenshot", { sourceName: source, imageFormat: "jpg", imageWidth: 320, imageHeight: 180, imageCompressionQuality: 50 });
      return String(r.imageData ?? "");
    } catch {
      return "";
    }
  }

  /** Appelée une fois par seconde ; fait son travail toutes les `interval` secondes, jamais deux analyses en même temps. */
  async tick(now = Date.now()): Promise<void> {
    if (!this.ready() || !this.live || this.busy) return;
    if (now - this.lastRun < this.cfg.interval * 1000) return;
    this.busy = true;
    this.lastRun = now;
    try {
      await this.run(now);
    } catch (e) {
      this.log(`régie IA : ${(e as Error).message}`);
    } finally {
      this.busy = false;
    }
  }

  private async run(now: number) {
    const cams = this.usable();
    let cur = "";
    try {
      cur = String((await this.req("GetCurrentProgramScene")).currentProgramSceneName ?? "");
    } catch {
      return;
    }
    const ours = this.current >= 0 && cams[this.current]?.scene === cur;
    // Autre scène à l'antenne (choix manuel) : on se désarme sans rien toucher.
    if (cur !== this.live && !ours) {
      if (this.state !== "idle") this.disarm();
      return;
    }
    // Retour manuel sur Live pendant que nous tenions une caméra : la main revient à l'utilisateur pour un moment.
    if (cur === this.live && this.current >= 0) {
      this.current = -1;
      this.since = now + 30_000;
    }
    if (now < this.since && this.current < 0) return;

    // Une vignette par caméra ; figée ou noire = morte, jamais proposée au modèle.
    const alive: { idx: number; img: string }[] = [];
    for (let i = 0; i < cams.length; i++) {
      const img = await this.shot(cams[i].source);
      const moved = img !== "" && img !== this.last.get(cams[i].source);
      this.last.set(cams[i].source, img);
      if (img.length > MIN_IMAGE_CHARS && moved) alive.push({ idx: i, img });
    }
    this.setState("watching", this.lastReason);
    if (alive.length === 0) return;

    const curAlive = this.current >= 0 && alive.some((a) => a.idx === this.current);
    const pick = await this.decide(cams, alive, this.current);
    if (pick === null) return;

    if (pick === this.current) {
      this.candidate = -1;
      this.votes = 0;
      return;
    }
    // Caméra à l'antenne morte : on change tout de suite. Sinon : durée minimale et avis concordants.
    const urgent = this.current >= 0 && !curAlive;
    if (!urgent) {
      if (this.current >= 0 && now - this.since < this.cfg.hold * 1000) return;
      this.votes = pick === this.candidate ? this.votes + 1 : 1;
      this.candidate = pick;
      if (this.votes < AGREE) return;
    }
    try {
      await this.req("SetCurrentProgramScene", { sceneName: cams[pick].scene });
    } catch (e) {
      this.log(`régie IA : bascule impossible (${(e as Error).message})`);
      return;
    }
    this.log(`régie IA : « ${cams[pick].label || cams[pick].source} » au programme`);
    this.current = pick;
    this.since = now;
    this.candidate = -1;
    this.votes = 0;
    this.setState("cam", cams[pick].label || cams[pick].source);
  }

  /** Numéro de caméra choisi par le modèle, ou null si la réponse est inutilisable (on ne change alors rien). */
  private async decide(cams: DirectorCam[], alive: { idx: number; img: string }[], current: number): Promise<number | null> {
    const list = alive.map((a, n) => `Image ${n + 1} = caméra ${a.idx + 1} : ${cams[a.idx].label || cams[a.idx].source}`).join("\n");
    const prompt =
      `Tu es le réalisateur d'un direct. Chaque image est la vue actuelle d'une caméra.\n${list}\n` +
      `Caméra actuellement au programme : ${current >= 0 ? current + 1 : "aucune (plan large)"}.\n` +
      `Consignes du streamer : ${this.cfg.rules}\n` +
      `Réponds uniquement par un objet JSON : {"camera": <numéro de caméra>, "raison": "<5 mots>"}. Choisis parmi : ${alive.map((a) => a.idx + 1).join(", ")}.`;
    const text = await this.ask(prompt, alive.map((a) => a.img));
    const m = /"camera"\s*:\s*(\d+)/.exec(text);
    if (!m) return null;
    const idx = Number(m[1]) - 1;
    return alive.some((a) => a.idx === idx) ? idx : null;
  }
}

/** Appel direct à l'API Anthropic avec la clé de l'utilisateur (la clé ne quitte pas le PC). */
export function anthropicAsk(apiKey: string, model = "claude-haiku-5-5", fetchFn: typeof fetch = fetch): Ask {
  return async (prompt, images) => {
    const content: unknown[] = images.map((img) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: img.replace(/^data:image\/\w+;base64,/, "") } }));
    content.push({ type: "text", text: prompt });
    const r = await fetchFn("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 100, messages: [{ role: "user", content }] }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) throw new Error(r.status === 401 ? "clé API refusée" : `API ${r.status}`);
    const j = (await r.json()) as { content?: { type: string; text?: string }[] };
    return (j.content ?? []).map((b) => (b.type === "text" ? (b.text ?? "") : "")).join("");
  };
}
