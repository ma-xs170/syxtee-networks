import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabase, supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { timedFetch } from "@/lib/supabase/fetch";
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

type Row = { username: string; first_name?: string | null; partner?: boolean | null; avatar_url: string | null; twitch_id: string | null; twitch_login: string | null; twitch_display_name: string | null; kick_name?: string | null; youtube_name?: string | null; youtube_id?: string | null; youtube_handle?: string | null };

/** Lien de chaîne Twitch collé par l'équipe (twitch.tv/x, @x ou x) vers le pseudo. Les autres plateformes ne sont pas affichées. */
export function parseChannelLink(input: string): { platform: "twitch"; login: string } | null {
  const v = input.trim();
  if (!v) return null;
  const bare = /^@?([A-Za-z0-9_]{2,40})$/.exec(v);
  if (bare) return { platform: "twitch", login: bare[1].toLowerCase() };
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`); } catch { return null; }
  const host = u.hostname.replace(/^(www|m)\./, "").toLowerCase();
  const seg = u.pathname.split("/").filter(Boolean);
  return host === "twitch.tv" && seg[0] && /^[A-Za-z0-9_]{2,40}$/.test(seg[0]) ? { platform: "twitch", login: seg[0].toLowerCase() } : null;
}

const channelUrl = (login: string) => `https://twitch.tv/${login}`;

/** Chaînes ajoutées à la main (approuvées), avec avatar et statut live pour Twitch. */
async function getFeatured(supabase: SupabaseClient): Promise<HomeStreamer[]> {
  // Colonne avatar_url (0059) : si la migration n'est pas encore passée, on relit sans elle.
  const q = (cols: string) => supabase.from("featured_channels").select(cols).eq("platform", "twitch").order("created_at", { ascending: true }).limit(100);
  let res = await q("platform, login, avatar_url");
  if (res.error) res = await q("platform, login");
  const rows = (res.data ?? []) as unknown as { platform: Channel["platform"]; login: string; avatar_url?: string | null }[];
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
    return { handle, firstName: null, partner: false, url: channelUrl(r.login), avatar: r.avatar_url || (u?.profile_image_url ?? null), live: u && live.get(u.id) ? { viewers: live.get(u.id)!.viewers } : null, channels: [{ platform: "twitch" as const, handle, url: channelUrl(r.login) }] };
  });
}

/** Streamers de l'accueil : comptes consentants (Twitch vérifié) puis chaînes ajoutées par l'équipe ; live d'abord. Ne lève jamais. */
export async function getHomeStreamers(): Promise<HomeStreamer[]> {
  if (!hasSupabase) return [];
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false }, global: { fetch: timedFetch(8_000) } });
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
  // Avatar de repli : photo Twitch quand le compte n'a pas de photo à lui.
  const needAvatar = rows.flatMap((r) => (!r.avatar_url && r.twitch_login ? [r.twitch_login.toLowerCase()] : []));
  let twitchUsers = new Map<string, { profile_image_url?: string }>();
  try {
    twitchUsers = await getTwitchUsersByLogin(needAvatar);
  } catch (e) {
    console.error("Twitch avatars", e);
  }
  const accounts = rows.flatMap((r) => {
    const channels: Channel[] = [];
    if (r.twitch_login) channels.push({ platform: "twitch", handle: r.twitch_display_name || r.twitch_login, url: `https://twitch.tv/${r.twitch_login}` });
    // YouTube : pseudo saisi (@pseudo) en priorité, sinon la chaîne reliée au Multichat.
    const yt = r.youtube_handle?.trim();
    if (yt) channels.push({ platform: "youtube", handle: yt, url: `https://www.youtube.com/@${yt}` });
    else if (r.youtube_id && r.youtube_name) channels.push({ platform: "youtube", handle: r.youtube_name, url: `https://www.youtube.com/channel/${r.youtube_id}` });
    if (channels.length === 0) return [];
    const main = channels[0];
    return [{
      handle: main.handle,
      firstName: r.first_name?.trim() || null,
      partner: r.partner === true,
      url: main.url,
      avatar: r.avatar_url || (r.twitch_login ? twitchUsers.get(r.twitch_login.toLowerCase())?.profile_image_url ?? null : null),
      live: r.twitch_id && live.get(r.twitch_id) ? { viewers: live.get(r.twitch_id)!.viewers } : null,
      channels,
    } satisfies HomeStreamer];
  });
  // Une chaîne déjà présente via un compte n'est pas répétée.
  const taken = new Set(accounts.flatMap((a) => a.channels.map((c) => `${c.platform}:${c.url.toLowerCase()}`)));
  const extra = featured.filter((f) => !taken.has(`${f.channels[0].platform}:${f.channels[0].url.toLowerCase()}`));
  return [...accounts, ...extra].sort((a, b) => (b.live?.viewers ?? -1) - (a.live?.viewers ?? -1) || a.handle.localeCompare(b.handle));
}
