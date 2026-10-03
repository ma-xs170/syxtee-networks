"use server";

import { requireUser } from "@/lib/auth/dal";
import { allow } from "@/lib/auth/rateLimit";
import { getPlan } from "@/lib/auth/plan";
import { can } from "@/lib/plans";
import { isAudioMode } from "@/lib/mix-audio";
import { createClient } from "@/lib/supabase/server";

// Mémorise le mode audio du commutateur (BROADCAST / PODCAST), le mix-minus et la réduction automatique, pour ce compte.
export async function saveAudioSettings(input: { mode: string; mixMinus: boolean; autoDuck: boolean }): Promise<{ ok: boolean }> {
  const user = await requireUser("/commutateur");
  if (!can(await getPlan(), "commutateur")) return { ok: false };
  if (!isAudioMode(input.mode)) return { ok: false };
  if (!(await allow(`mixsettings:${user.id}`, 30, 60))) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("mix_settings").upsert({ user_id: user.id, audio_mode: input.mode, mix_minus: !!input.mixMinus, auto_duck: !!input.autoDuck, updated_at: new Date().toISOString() });
  return { ok: !error };
}
