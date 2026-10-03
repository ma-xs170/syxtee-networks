import "server-only";
import { createClient } from "@supabase/supabase-js";
import { hasSupabase, supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { getLiveStreams } from "@/lib/twitch";

export type Channel = { platform: "twitch" | "kick" | "youtube"; handle: string; url: string };

export type HomeStreamer = {
  handle: string;
  /** Prénom, seulement si la personne a coché « Afficher mon prénom sur le site ». */
  firstName: string | null;
  /** Formule Partenaire en cours (badge). */
  partner: boolean;
  url: string;
  avatar: string | null;
  live: { viewers: number } | null;
  /** Chaînes vérifiées : Twitch (connexion), Kick et YouTube (comptes reliés au Multichat). */
  channels: Channel[];
};

type Row = { username: string; first_name?: string | null; partner?: boolean | null; avatar_url: string | null; twitch_id: string | null; twitch_login: string; twitch_display_name: string | null; kick_name?: string | null; youtube_name?: string | null; youtube_id?: string | null; youtube_handle?: string | null };

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
    live = await getLiveStreams(rows.flatMap((r) => (r.twitch_id ? [r.twitch_id] : [])));
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
      live: r.twitch_id && live.get(r.twitch_id) ? { viewers: live.get(r.twitch_id)!.viewers } : null,
      channels: [
        { platform: "twitch" as const, handle: r.twitch_display_name || r.twitch_login, url: `https://twitch.tv/${r.twitch_login}` },
        ...(r.kick_name ? [{ platform: "kick" as const, handle: r.kick_name, url: `https://kick.com/${r.kick_name.replace(/_/g, "-").toLowerCase()}` }] : []),
        // YouTube : chaîne vérifiée (compte relié) si elle existe, sinon le pseudo saisi à l'inscription.
        ...(r.youtube_name && r.youtube_id
          ? [{ platform: "youtube" as const, handle: r.youtube_name, url: `https://www.youtube.com/channel/${r.youtube_id}` }]
          : r.youtube_handle
            ? [{ platform: "youtube" as const, handle: r.youtube_handle, url: `https://www.youtube.com/@${r.youtube_handle}` }]
            : []),
      ],
    }))
    .sort((a, b) => (b.live?.viewers ?? -1) - (a.live?.viewers ?? -1) || a.handle.localeCompare(b.handle));
}
