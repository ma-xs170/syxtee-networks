// Modèle du studio SYXTEE : sources, scènes et éléments de scène. Coordonnées en pixels dans le canvas 1280 x 720.

export const W = 1280;
export const H = 720;

export type SourceKind = "relay" | "webcam" | "mic" | "screen" | "image" | "text" | "color";

export type Source = {
  id: string;
  name: string;
  kind: SourceKind;
  /** relay : id du relais SYXTEE. */
  relayId?: string;
  /** image : data URL. */
  src?: string;
  /** text */
  text?: string;
  fontSize?: number;
  /** text et color */
  color?: string;
};

export type Item = { id: string; sourceId: string; visible: boolean; x: number; y: number; w: number; h: number };
/** Éléments du fond vers le dessus. */
export type Scene = { id: string; name: string; items: Item[] };
export type Speaker = { scene?: string; delayMs: number };
export type Settings = {
  /** Secours : si l'image d'un flux du programme se fige, bascule sur la scène de secours. Débit bas mais image fluide : rien ne change. */
  failover: { on: boolean; scene?: string; autoReturn: boolean; freezeSec: number };
  /** Podcast : flux synchronisés (retard par flux), changement de scène à la prise de parole. La latence n'est pas une priorité. */
  podcast: { on: boolean; auto: boolean; wide?: string; thresholdDb: number; holdSec: number; speakers: Record<string, Speaker> };
};
export type Project = { sources: Source[]; scenes: Scene[]; program: string; preview: string; settings?: Settings };

export const MAX_DELAY_MS = 10_000;

export const defaultSettings = (): Settings => ({
  failover: { on: false, autoReturn: true, freezeSec: 3 },
  podcast: { on: false, auto: true, thresholdDb: -42, holdSec: 2.5, speakers: {} },
});

export const uid = () => Math.random().toString(36).slice(2, 9);

export const hasVideo = (k: SourceKind) => k !== "mic";
export const hasAudio = (k: SourceKind) => k === "relay" || k === "webcam" || k === "mic" || k === "screen";

export const KIND_LABEL: Record<SourceKind, string> = {
  relay: "Flux SYXTEE",
  webcam: "Webcam",
  mic: "Micro",
  screen: "Capture d'écran",
  image: "Image",
  text: "Texte",
  color: "Couleur",
};

/** Boîte par défaut d'une nouvelle source dans la scène. */
export function defaultBox(s: Source): Pick<Item, "x" | "y" | "w" | "h"> {
  if (s.kind === "text") return { x: 80, y: 80, w: 640, h: (s.fontSize ?? 64) * 1.4 };
  if (s.kind === "color") return { x: 0, y: 0, w: W, h: H };
  if (s.kind === "image") return { x: 340, y: 160, w: 600, h: 400 };
  return { x: 0, y: 0, w: W, h: H };
}

export function initialProject(): Project {
  const scene: Scene = { id: uid(), name: "Scène 1", items: [] };
  return { sources: [], scenes: [scene], program: scene.id, preview: scene.id, settings: defaultSettings() };
}

const KEY = "syxtee.studio.v1";

export function loadProject(): Project {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Project;
      if (p.scenes?.length) {
        const d = defaultSettings();
        return { ...p, settings: { failover: { ...d.failover, ...p.settings?.failover }, podcast: { ...d.podcast, ...p.settings?.podcast, speakers: { ...p.settings?.podcast?.speakers } } } };
      }
    }
  } catch {}
  return initialProject();
}

export function saveProject(p: Project) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // quota dépassé (grosses images) : le projet reste en mémoire
  }
}
