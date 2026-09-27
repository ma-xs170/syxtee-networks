import "server-only";

// API Twitch Helix, jeton applicatif (Client Credentials). Clés dans les variables d'environnement uniquement.
// TWITCH_API_BASE / TWITCH_AUTH_BASE : remplacées par un faux serveur Twitch pendant les tests e2e.
const API = process.env.TWITCH_API_BASE || "https://api.twitch.tv/helix";
const AUTH = process.env.TWITCH_AUTH_BASE || "https://id.twitch.tv/oauth2";
const clientId = process.env.TWITCH_CLIENT_ID ?? "";
const clientSecret = process.env.TWITCH_CLIENT_SECRET ?? "";
export const hasTwitch = clientId !== "" && clientSecret !== "";

let token: { value: string; expires: number } | null = null;

async function appToken(force = false) {
  if (!force && token && token.expires > Date.now() + 60_000) return token.value;
  const res = await fetch(`${AUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Twitch token ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return token.value;
}

async function helix<T>(path: string, revalidate: number, retry = true): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Client-Id": clientId, Authorization: `Bearer ${await appToken(!retry)}` },
    next: { revalidate },
  });
  if (res.status === 401 && retry) return helix(path, revalidate, false);
  if (!res.ok) throw new Error(`Twitch ${path.split("?")[0]} ${res.status}`);
  return (await res.json()) as T;
}

const chunks = <T,>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

export type LiveStream = { userId: string; viewers: number; title: string };

/** Chaînes en live parmi `ids` (par lots de 100, cache 60 s). */
export async function getLiveStreams(ids: string[]): Promise<Map<string, LiveStream>> {
  const live = new Map<string, LiveStream>();
  if (!hasTwitch || ids.length === 0) return live;
  for (const batch of chunks(ids, 100)) {
    const q = batch.map((id) => `user_id=${encodeURIComponent(id)}`).join("&");
    const { data } = await helix<{ data: { user_id: string; viewer_count: number; title: string; type: string }[] }>(`/streams?first=100&${q}`, 60);
    for (const s of data) if (s.type === "live") live.set(s.user_id, { userId: s.user_id, viewers: s.viewer_count, title: s.title });
  }
  return live;
}

export type TwitchUser = { id: string; login: string; display_name: string; profile_image_url: string };

export async function getTwitchUser(id: string): Promise<TwitchUser | null> {
  if (!hasTwitch) return null;
  const { data } = await helix<{ data: TwitchUser[] }>(`/users?id=${encodeURIComponent(id)}`, 0);
  return data[0] ?? null;
}
