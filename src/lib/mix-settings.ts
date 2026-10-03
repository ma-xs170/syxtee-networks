import "server-only";
import { DEFAULT_AUDIO, isAudioMode, type AudioSettings } from "@/lib/mix-audio";
import { createClient } from "@/lib/supabase/server";

/** Réglages audio du commutateur du compte connecté (0031_mix_settings.sql). Table absente ou vide : valeurs par défaut. */
export async function getMixSettings(userId: string): Promise<AudioSettings> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("mix_settings").select("audio_mode, mix_minus, auto_duck").eq("user_id", userId).maybeSingle();
    if (error || !data) return DEFAULT_AUDIO;
    return { mode: isAudioMode(data.audio_mode) ? data.audio_mode : "broadcast", mixMinus: !!data.mix_minus, autoDuck: !!data.auto_duck };
  } catch {
    return DEFAULT_AUDIO;
  }
}
