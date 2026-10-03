import type { TransitionKind } from "./Stage";
import type { LiveState } from "./DirectPanel";
import type { AudioSettings } from "@/lib/mix-audio";
import type { MixRelay } from "@/lib/mix-sim";

// Tout l'état de la régie, partagé entre la vue bureau et la vue mobile (la logique reste dans MixApp).
export type MixModel = {
  relays: MixRelay[];
  byId: (id: string) => MixRelay;
  program: string;
  preview: string;
  locked: boolean;
  slate: boolean;
  /** Durée du fondu du PROGRAMME (0 = CUT). */
  programMs: number;
  transition: TransitionKind;
  duration: number;
  clock: number;
  live: LiveState;
  liveSeconds: number;
  rec: boolean;
  recSeconds: number;
  master: number;
  masterMute: boolean;
  setTransition: (t: TransitionKind) => void;
  setDuration: (ms: number) => void;
  setMaster: (db: number) => void;
  toggleMasterMute: () => void;
  toPreview: (id: string) => void;
  toProgram: (id: string) => void;
  cut: () => void;
  auto: () => void;
  toggleLive: () => void;
  toggleRec: () => void;
  toggleSlate: () => void;
  shot: () => void;
  marker: () => void;
  patch: (id: string, p: Partial<Pick<MixRelay, "volume" | "mute" | "solo">>) => void;
  audio: AudioSettings;
  setAudio: (p: Partial<AudioSettings>) => void;
  listen: string | null;
  toggleListen: (id: string) => void;
  openSettings: (id: string) => void;
};
