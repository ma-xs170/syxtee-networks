import { mockProvider } from "./mockProvider";
import { encoderBackend, type EncoderProvider } from "./provider";
import { supabaseProvider } from "./supabaseProvider";

/** Fournisseur de données de l'Encodeur : mock par défaut, Supabase quand NEXT_PUBLIC_ENCODER_BACKEND=supabase. */
export const getProvider = (): EncoderProvider => (encoderBackend() === "supabase" ? supabaseProvider : mockProvider);
export { mockProvider };
export type { EncoderProvider };
