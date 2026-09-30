import "server-only";
import { createClient } from "@supabase/supabase-js";
import { hasSupabase, supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { getLiveStreams } from "@/lib/twitch";

export type HomeStreamer = {
  handle: string;
  /** Prénom, seulement si la personne a coché « Afficher mon prénom sur le site ». */
  firstName: string | null;
  /** Formule Partenaire en cours (badge). */
  partner: boolean;
  url: string;
  avatar: string | null;
  live: { viewers: number } | null;
};

type Row = { username: string; first_name?: string | null; partner?: boolean | null; avatar_url: string | null; twitch_id: string; twitch_login: string; twitch_display_name: string | null };

/** Streamers de l'accueil (consentement + Twitch vérifié), chaînes en live d'abord. Ne lève jamais. */
export async function getHomeStreamers(): Promise<HomeStreamer[]> {
  if (!hasSupabase) return [];
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("public_streamers").select("*").limit(300);
  if (error || !data) {
    if (error) console.error("public_streamers", error.message);
    return [];
  }
  const rows = data as Row[];
  let live = new Map<string, { viewers: number }>();
  try {
    live = await getLiveStreams(rows.map((r) => r.twitch_id));
  } catch (e) {
    console.error("Twitch streams", e);
  }
  return rows
    .map((r) => ({
      handle: r.twitch_display_name || r.twitch_login,
      firstName: r.first_name?.trim() || null,
      partner: r.partner === true,
      url: `https://twitch.tv/${r.twitch_login}`,
      avatar: r.avatar_url,
      live: live.get(r.twitch_id) ? { viewers: live.get(r.twitch_id)!.viewers } : null,
    }))
    .sort((a, b) => (b.live?.viewers ?? -1) - (a.live?.viewers ?? -1) || a.handle.localeCompare(b.handle));
}
