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
  /** Fournisseur de l'IA : « none » (sans IA : reprise sur une caméra vivante seulement), « mistral » (offre gratuite d'expérimentation), « anthropic » (Claude, payant) ou « local » (Ollama). */
  provider: Provider;
  /** Identifiant de l'espace de travail Anthropic, seulement si la clé n'est pas rattachée à un espace. */
  workspaceId: string;
  /** Modèle Ollama du mode « sur ce PC » (vide : LOCAL_MODEL). */
  model: string;
  cams: DirectorCam[];
  /** Consignes en langage naturel. */
  rules: string;
  /** Mode économe : vignettes plus petites, et l'IA n'est interrogée que lorsque les images ont changé de façon notable (ou toutes les 30 s). */
  eco: boolean;
  /** Secondes entre deux analyses. */
  interval: number;
  /** Secondes minimales sur une caméra avant d'en changer. */
  hold: number;
};

export type Provider = "none" | "mistral" | "anthropic" | "local";
export const PROVIDERS: Provider[] = ["none", "mistral", "anthropic", "local"];
/** Modèle de vision léger lancé sur le PC avec Ollama (ollama pull gemma3:4b). */
export const LOCAL_MODEL = "gemma3:4b";
export const MAX_CAMS = 6;
export const DEFAULT_DIRECTOR: DirectorConfig = {
  enabled: false,
  apiKey: "",
  provider: "none",
  model: "",
  workspaceId: "",
  cams: [],
  rules:
    "Montre la caméra où il se passe quelque chose : une personne qui parle à la caméra, un objet montré de près, une entrée dans un véhicule. Le drone, quand il vole avec une belle vue. Reste sur la caméra actuelle si rien ne change.",
  eco: true,
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
    provider: PROVIDERS.includes(o.provider as Provider) ? (o.provider as Provider) : prev.provider ?? "none",
    model: typeof o.model === "string" ? o.model.trim().slice(0, 80) : prev.model ?? "",
    workspaceId: typeof o.workspaceId === "string" ? o.workspaceId.trim().slice(0, 100) : prev.workspaceId ?? "",
    cams,
    rules: str(o.rules, prev.rules, 1000),
    eco: typeof o.eco === "boolean" ? o.eco : prev.eco ?? true,
    interval: num(o.interval, prev.interval, 2, 30),
    hold: num(o.hold, prev.hold, 2, 120),
  };
}

export type DirectorState = "idle" | "watching" | "cam" | "error";

type Req = (type: string, data?: Record<string, unknown>) => Promise<Record<string, unknown>>;
/** Interroge le modèle : images (data URI jpeg), une par caméra vivante, dans l'ordre donné. Renvoie le texte de la réponse. */
export type Ask = (prompt: string, images: string[]) => Promise<string>;

/** Une vignette presque noire se compresse en très peu d'octets : en dessous, ce n'est pas une image exploitable. */
const MIN_IMAGE_CHARS = 2500;
/** Mode économe : variation de taille de la vignette (en proportion) à partir de laquelle on considère que l'image a changé. */
const ECO_CHANGE = 0.12;
/** Mode économe : l'IA est interrogée au moins toutes les 30 s, même si rien ne semble avoir changé. */
const ECO_REFRESH_MS = 30_000;
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
  /** Scène de secours du « Connexion perdue » et question « est-elle à l'antenne à cause du secours ? » : la régie reprend alors la main dès qu'une caméra revient. */
  fallbackScene = "";
  backupActive: () => boolean = () => false;
  private req: Req;
  private ask: Ask;
  private log: (m: string) => void;
  private last = new Map<string, string>();
  private busy = false;
  private lastRun = 0;
  private since = 0;
  private candidate = -1;
  private votes = 0;
  /** Dernière consultation de l'IA : caméras vivantes et taille de leur vignette, pour le mode économe. */
  /** Dernier balayage : caméras vivantes et heure, pour que le secours sache si une autre caméra peut prendre le relais. */
  private scan: { at: number; sources: string[] } | null = null;
  private asked: { at: number; sizes: Map<number, number> } | null = null;

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
    // Sans clé API : mode local gratuit (reprise sur une caméra vivante quand celle à l'antenne tombe). Avec une clé : choix par l'IA.
    return this.cfg.enabled && this.usable().length >= 2;
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
    this.asked = null;
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
      const r = await this.req("GetSourceScreenshot", { sourceName: source, imageFormat: "jpg", imageWidth: this.cfg.eco ? 224 : 320, imageHeight: this.cfg.eco ? 126 : 180, imageCompressionQuality: this.cfg.eco ? 40 : 50 });
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
      const msg = (e as Error).message;
      // Même erreur en boucle : une seule ligne de journal, mais l'état d'erreur reste affiché dans la page.
      if (this.lastReason !== msg) this.log(`régie IA : ${msg}`);
      this.setState("error", msg);
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
    // Une scène de caméra mise à l'antenne à la main est reprise par la régie : si cette caméra tombe, elle bascule sur une vivante.
    // Cas où la scène Live est elle-même une scène de caméra : elle compte comme la caméra à l'antenne.
    const onAir = cams.findIndex((c) => c.scene === cur);
    const liveIsCam = cams.some((c) => c.scene === this.live);
    if (onAir >= 0 && onAir !== this.current && (cur !== this.live || liveIsCam)) {
      this.current = onAir;
      this.since = now;
      this.candidate = -1;
      this.votes = 0;
      this.setState("cam", cams[onAir].label || cams[onAir].source);
    }
    // Le secours a mis sa scène à l'antenne (aucune caméra vivante) : on la considère nôtre pour reprendre dès qu'une caméra revient.
    const onFallback = !!this.fallbackScene && cur === this.fallbackScene && cur !== this.live && this.backupActive();
    const ours = onFallback || (this.current >= 0 && cams[this.current]?.scene === cur);
    // Autre scène à l'antenne (choix manuel) : on se désarme sans rien toucher.
    if (cur !== this.live && !ours) {
      if (this.state !== "idle") this.disarm();
      return;
    }
    // Retour manuel sur Live pendant que nous tenions une caméra : la main revient à l'utilisateur pour un moment.
    if (cur === this.live && this.current >= 0 && !liveIsCam) {
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
    this.scan = { at: now, sources: alive.map((a) => cams[a.idx].source) };
    if (this.state === "idle") this.setState("watching", "");
    if (alive.length === 0) return;

    if (onFallback) {
      // Une caméra est revenue : on la prend tout de suite (le secours n'a plus de raison d'être).
      const back = (await this.decide(cams, alive, -1)) ?? alive[0].idx;
      try {
        await this.req("SetCurrentProgramScene", { sceneName: cams[back].scene });
      } catch (e) {
        this.log(`régie IA : retour impossible (${(e as Error).message})`);
        return;
      }
      this.log(`régie IA : « ${cams[back].label || cams[back].source} » revenue, reprise depuis le secours`);
      this.current = back;
      this.since = now;
      this.candidate = -1;
      this.votes = 0;
      this.setState("cam", cams[back].label || cams[back].source);
      return;
    }
    const curAlive = this.current >= 0 && alive.some((a) => a.idx === this.current);
    // Mode économe : si les mêmes caméras sont vivantes et que leurs images n'ont pas notablement changé, on ne dérange pas l'IA.
    // Un avis en attente de confirmation (candidat) force toujours une deuxième consultation.
    if (this.cfg.eco && this.candidate < 0 && this.skipAsk(alive, now)) return;
    this.asked = { at: now, sizes: new Map(alive.map((a) => [a.idx, a.img.length])) };
    const pick = await this.decide(cams, alive, this.current);
    if (this.state === "error") this.setState(this.current >= 0 ? "cam" : "watching", this.current >= 0 ? cams[this.current].label || cams[this.current].source : "");
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

  /** Vrai si la régie surveille et qu'une caméra autre que `source` était vivante au dernier balayage (moins de 10 s). */
  canTakeOver(source: string, now = Date.now()): boolean {
    return this.ready() && !!this.scan && now - this.scan.at < 10_000 && this.scan.sources.some((s) => s !== source);
  }

  /** Vrai si l'IA peut être épargnée : mêmes caméras vivantes, vignettes de taille voisine, dernière consultation récente. */
  private skipAsk(alive: { idx: number; img: string }[], now: number): boolean {
    const a = this.asked;
    if (!a || now - a.at >= ECO_REFRESH_MS || a.sizes.size !== alive.length) return false;
    for (const { idx, img } of alive) {
      const before = a.sizes.get(idx);
      if (before === undefined || Math.abs(img.length - before) / before > ECO_CHANGE) return false;
    }
    return true;
  }

  /** Numéro de caméra choisi par le modèle, ou null si la réponse est inutilisable (on ne change alors rien). */
  private async decide(cams: DirectorCam[], alive: { idx: number; img: string }[], current: number): Promise<number | null> {
    // Mode local, sans clé : on ne fait que remplacer la caméra à l'antenne quand elle est tombée.
    if (this.cfg.provider === "none" || (!this.cfg.apiKey && this.cfg.provider !== "local")) {
      if (current < 0 || alive.some((a) => a.idx === current)) return current >= 0 ? current : null;
      return alive[0].idx;
    }
    const curDead = current >= 0 && !alive.some((a) => a.idx === current);
    // Une seule caméra vivante et celle à l'antenne est tombée : inutile de demander, on la prend.
    if (curDead && alive.length === 1) return alive[0].idx;
    // Numérotation par position (Image 1, Image 2...) : plus simple à suivre pour un petit modèle que des numéros de caméra qui sautent.
    const list = alive.map((a, n) => `Image ${n + 1} : ${cams[a.idx].label || cams[a.idx].source}`).join("\n");
    const onAir = alive.findIndex((a) => a.idx === current);
    const prompt =
      `Tu es le réalisateur d'un direct. Chaque image est la vue actuelle d'une caméra.\n${list}\n` +
      `À l'antenne : ${onAir >= 0 ? `image ${onAir + 1}` : "plan large"}.\n` +
      `Consignes du streamer : ${this.cfg.rules}\n` +
      `Réponds uniquement par un objet JSON : {"image": <numéro de l'image à mettre à l'antenne>, "raison": "<5 mots>"}. Choisis parmi : ${alive.map((_, n) => n + 1).join(", ")}.`;
    const text = await this.ask(prompt, alive.map((a) => a.img));
    const m = /"(?:image|camera)"\s*:\s*(\d+)/.exec(text);
    const picked = m ? alive[Number(m[1]) - 1]?.idx : undefined;
    if (picked === undefined) {
      this.log(`régie IA : réponse inexploitable « ${text.slice(0, 80).replace(/\s+/g, " ")} »`);
      // Caméra à l'antenne tombée : mieux vaut une caméra vivante que rester sur une image figée.
      return curDead ? alive[0].idx : null;
    }
    return picked;
  }
}

/** IA sur ce PC : Ollama (http://127.0.0.1:11434), un petit modèle de vision. Rien ne quitte l'ordinateur, aucune clé, aucun coût. */
export function ollamaAsk(model = LOCAL_MODEL, fetchFn: typeof fetch = fetch): Ask {
  return async (prompt, images) => {
    let r: Response;
    try {
      r = await fetchFn("http://127.0.0.1:11434/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          format: "json",
          options: { temperature: 0, num_predict: 60 },
          messages: [{ role: "user", content: prompt, images: images.map((i) => i.replace(/^data:image\/\w+;base64,/, "")) }],
        }),
        // Le premier appel charge le modèle en mémoire : plus long que les suivants.
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new Error("Ollama ne répond pas : installe-le (ollama.com) et lance-le sur le PC d'OBS");
    }
    if (!r.ok) {
      let detail = "";
      try {
        detail = String(((await r.json()) as { error?: string }).error ?? "").slice(0, 200);
      } catch {
        /* corps illisible */
      }
      throw new Error(r.status === 404 ? `modèle « ${model} » absent : lance « ollama pull ${model} »` : `Ollama ${r.status}${detail ? ` : ${detail}` : ""}`);
    }
    const j = (await r.json()) as { message?: { content?: unknown } };
    return typeof j.message?.content === "string" ? j.message.content : "";
  };
}

/** Appel à l'API Mistral (La Plateforme, offre gratuite d'expérimentation) avec la clé de l'utilisateur : modèle de vision, une image par caméra. */
export function mistralAsk(apiKey: string, model = "mistral-small-latest", fetchFn: typeof fetch = fetch): Ask {
  return async (prompt, images) => {
    const content: unknown[] = images.map((img) => ({ type: "image_url", image_url: img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}` }));
    content.push({ type: "text", text: prompt });
    const r = await fetchFn("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 100, temperature: 0, messages: [{ role: "user", content }] }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) {
      let detail = "";
      try {
        const j = (await r.json()) as { message?: string; detail?: unknown; error?: { message?: string } };
        detail = String(j.message ?? j.error?.message ?? (typeof j.detail === "string" ? j.detail : "")).slice(0, 200);
      } catch {
        /* corps illisible */
      }
      throw new Error(r.status === 401 ? "clé API refusée" : r.status === 429 ? "limite de requêtes atteinte, la régie réessaie" : `API ${r.status}${detail ? ` : ${detail}` : ""}`);
    }
    const j = (await r.json()) as { choices?: { message?: { content?: unknown } }[] };
    const c = j.choices?.[0]?.message?.content;
    return typeof c === "string" ? c : "";
  };
}

/** Appel direct à l'API Anthropic avec la clé de l'utilisateur (la clé ne quitte pas le PC). */
export function anthropicAsk(apiKey: string, model = "claude-haiku-5-5", fetchFn: typeof fetch = fetch, workspaceId = ""): Ask {
  return async (prompt, images) => {
    const content: unknown[] = images.map((img) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: img.replace(/^data:image\/\w+;base64,/, "") } }));
    content.push({ type: "text", text: prompt });
    const r = await fetchFn("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json", ...(workspaceId ? { "anthropic-workspace-id": workspaceId } : {}) },
      body: JSON.stringify({ model, max_tokens: 100, messages: [{ role: "user", content }] }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) {
      // Le message d'Anthropic dit la vraie cause (clé sans espace de travail, crédit épuisé, modèle inconnu).
      let detail = "";
      try {
        detail = String(((await r.json()) as { error?: { message?: string } }).error?.message ?? "").slice(0, 200);
      } catch {
        /* corps illisible */
      }
      throw new Error(r.status === 401 ? "clé API refusée" : `API ${r.status}${detail ? ` : ${detail}` : ""}`);
    }
    const j = (await r.json()) as { content?: { type: string; text?: string }[] };
    return (j.content ?? []).map((b) => (b.type === "text" ? (b.text ?? "") : "")).join("");
  };
}
