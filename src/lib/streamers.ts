import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabase, supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { getLiveStreams, getTwitchUsersByLogin } from "@/lib/twitch";

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

/** Lien de chaîne collé par l'équipe (twitch.tv/x, kick.com/x, youtube.com/@x ou /channel/…) vers plateforme et pseudo. */
export function parseChannelLink(input: string): { platform: Channel["platform"]; login: string } | null {
  const v = input.trim();
  if (!v) return null;
  const bare = /^@?([A-Za-z0-9_]{2,40})$/.exec(v);
  if (bare) return { platform: "twitch", login: bare[1].toLowerCase() };
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`); } catch { return null; }
  const host = u.hostname.replace(/^(www|m)\./, "").toLowerCase();
  const seg = u.pathname.split("/").filter(Boolean);
  if (host === "twitch.tv" && seg[0] && /^[A-Za-z0-9_]{2,40}$/.test(seg[0])) return { platform: "twitch", login: seg[0].toLowerCase() };
  if (host === "kick.com" && seg[0] && /^[A-Za-z0-9_-]{2,40}$/.test(seg[0])) return { platform: "kick", login: seg[0].toLowerCase() };
  if (host === "youtube.com") {
    if (seg[0]?.startsWith("@")) return { platform: "youtube", login: seg[0].slice(1) };
    if (seg[0] === "channel" && seg[1]) return { platform: "youtube", login: seg[1] };
  }
  return null;
}

const channelUrl = (platform: Channel["platform"], login: string) =>
  platform === "twitch" ? `https://twitch.tv/${login}` : platform === "kick" ? `https://kick.com/${login.replace(/_/g, "-")}` : login.startsWith("UC") && login.length > 20 ? `https://www.youtube.com/channel/${login}` : `https://www.youtube.com/@${login}`;

/** Chaînes ajoutées à la main (approuvées), avec avatar et statut live pour Twitch. */
async function getFeatured(supabase: SupabaseClient): Promise<HomeStreamer[]> {
  const { data } = await supabase.from("featured_channels").select("platform, login").order("created_at", { ascending: true }).limit(100);
  const rows = (data ?? []) as { platform: Channel["platform"]; login: string }[];
  if (rows.length === 0) return [];
  let users = new Map<string, Awaited<ReturnType<typeof getTwitchUsersByLogin>> extends Map<string, infer U> ? U : never>();
  let live = new Map<string, { viewers: number }>();
  try {
    users = await getTwitchUsersByLogin(rows.filter((r) => r.platform === "twitch").map((r) => r.login));
    live = await getLiveStreams([...users.values()].map((u) => u.id));
  } catch (e) {
    console.error("featured_channels Twitch", e);
  }
  return rows.map((r) => {
    const u = r.platform === "twitch" ? users.get(r.login.toLowerCase()) : undefined;
    const handle = u?.display_name || r.login;
    return { handle, firstName: null, partner: false, url: channelUrl(r.platform, r.login), avatar: u?.profile_image_url ?? null, live: u && live.get(u.id) ? { viewers: live.get(u.id)!.viewers } : null, channels: [{ platform: r.platform, handle, url: channelUrl(r.platform, r.login) }] };
  });
}

/** Streamers de l'accueil : comptes consentants (Twitch vérifié) puis chaînes ajoutées par l'équipe ; live d'abord. Ne lève jamais. */
export async function getHomeStreamers(): Promise<HomeStreamer[]> {
  if (!hasSupabase) return [];
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("public_streamers").select("*").limit(300);
  if (error || !data) {
    if (error) console.error("public_streamers", error.message);
    return [];
  }
  const rows = data as Row[];
  const featured = await getFeatured(supabase).catch((e) => { console.error("featured_channels", e); return [] as HomeStreamer[]; });
  let live = new Map<string, { viewers: number }>();
  try {
    live = await getLiveStreams(rows.flatMap((r) => (r.twitch_id ? [r.twitch_id] : [])));
  } catch (e) {
    console.error("Twitch streams", e);
  }
  const accounts = rows
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
    }));
  // Une chaîne déjà présente via un compte n'est pas répétée.
  const taken = new Set(accounts.flatMap((a) => a.channels.map((c) => `${c.platform}:${c.url.toLowerCase()}`)));
  const extra = featured.filter((f) => !taken.has(`${f.channels[0].platform}:${f.channels[0].url.toLowerCase()}`));
  return [...accounts, ...extra].sort((a, b) => (b.live?.viewers ?? -1) - (a.live?.viewers ?? -1) || a.handle.localeCompare(b.handle));
}
