import { isOn, type MixRelay } from "./mix-sim";

// Règles audio du commutateur (une seule source de vérité, utilisée par le mixeur et la barre du haut).
//
// BROADCAST (défaut, comme ATEM / OBS) : le son suit la vidéo. Seul le relais en PROGRAMME est dans le mix de sortie (direct, REC,
// lien RTMP). Un relais en APERÇU, ou ni l'un ni l'autre, est coupé AUTOMATIQUEMENT : c'est un état distinct du bouton M (coupure
// manuelle), le fader garde sa position. Au CUT le son bascule d'un coup, au FADE/MIX il fait un fondu enchaîné de même durée que l'image.
// PODCAST : le son ne suit plus la vidéo. Tout micro non coupé à la main reste ouvert, quelle que soit la caméra en APERÇU ou PROGRAMME.
// Dans les deux modes : un relais hors ligne est toujours coupé. Écouter (PFL) est local au navigateur : jamais dans la sortie.

export type AudioMode = "broadcast" | "podcast";
export const isAudioMode = (v: unknown): v is AudioMode => v === "broadcast" || v === "podcast";

export type AudioSettings = { mode: AudioMode; mixMinus: boolean; autoDuck: boolean };
export const DEFAULT_AUDIO: AudioSettings = { mode: "broadcast", mixMinus: false, autoDuck: false };

export type Gate = {
  /** Le micro est dans le mix de sortie. */
  open: boolean;
  label: string;
  tone: "onair" | "preview" | "open" | "muted" | "off";
};

const isIn = (set: string | string[], id: string) => (Array.isArray(set) ? set.includes(id) : set === id);

export function gateOf(r: MixRelay, o: { mode: AudioMode; program: string | string[]; preview: string | string[]; slate: boolean; soloOn: boolean }): Gate {
  if (!isOn(r)) return { open: false, label: "HORS LIGNE", tone: "off" };
  if (r.mute) return { open: false, label: o.mode === "podcast" ? "FERMÉ" : "MUTE", tone: "muted" };
  if (o.soloOn && !r.solo) return { open: false, label: "SOLO AILLEURS", tone: "muted" };
  if (o.mode === "podcast") return { open: true, label: "OUVERT", tone: "open" };
  // BROADCAST : le slate (BRB) ne laisse passer aucun son.
  if (o.slate) return { open: false, label: "COUPÉ · SLATE", tone: "muted" };
  if (isIn(o.program, r.id)) return { open: true, label: "ON AIR", tone: "onair" };
  if (isIn(o.preview, r.id)) return { open: false, label: "COUPÉ · APERÇU", tone: "preview" };
  return { open: false, label: "COUPÉ", tone: "muted" };
}
