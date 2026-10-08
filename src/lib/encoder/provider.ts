import type { ConnId, Encoder, EncodingSettings, SceneId, StreamStats } from "./types";
import type { MockEncoderEngine } from "./mockEngine";

/**
 * Couche de données du produit SYXTEE Encodeur. L'interface est la même pour la démo publique et le dashboard client :
 * seule l'implémentation change (mock aujourd'hui, Supabase + temps réel plus tard).
 */
export interface EncoderProvider {
  getEncoders(): Promise<Encoder[]>;
  getStats(id: string): Promise<StreamStats>;
  /** Abonnement aux statistiques en direct ; renvoie la fonction de désabonnement. */
  subscribeStats(id: string, cb: (s: StreamStats) => void): () => void;
  setConnectionEnabled(id: string, connId: ConnId, on: boolean): Promise<void>;
  startStream(id: string): Promise<void>;
  stopStream(id: string): Promise<void>;
  setEncoding(id: string, settings: Partial<EncodingSettings>): Promise<void>;
  setDestination(id: string, destId: string, connected: boolean): Promise<void>;
  switchScene(id: string, scene: SceneId): Promise<void>;
  reboot(id: string): Promise<void>;
  /** Lie un boîtier au compte avec son code à 6 caractères (réutilise le flux link_devices). */
  pair(code: string): Promise<Encoder>;
  /** Moteur d'état riche utilisé par les écrans (pages, toasts, journal) : propre au mock, absent des vrais backends tant qu'ils ne le fournissent pas. */
  engine(id: string): MockEncoderEngine;
}

export type EncoderBackend = "mock" | "supabase";
export const encoderBackend = (): EncoderBackend => (process.env.NEXT_PUBLIC_ENCODER_BACKEND === "supabase" ? "supabase" : "mock");
