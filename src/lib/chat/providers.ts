import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt, hasChatKey } from "./crypto";

// Écrire dans le chat avec son propre compte : OAuth Twitch, Kick et YouTube, jetons chiffrés en base (0030_chat_connections.sql),
// envoi par l'API de chaque plateforme. Variables : TWITCH_CLIENT_ID/SECRET, KICK_CLIENT_ID/SECRET, GOOGLE_CLIENT_ID/SECRET, CHAT_TOKEN_KEY.
// L'adresse de retour à déclarer dans chaque application : https://<site>/api/chat/callback/<twitch|kick|youtube>.

export type Platform = "twitch" | "kick" | "youtube";
export const PLATFORMS: Platform[] = ["twitch", "kick", "youtube"];
export const isPlatform = (v: string): v is Platform => (PLATFORMS as string[]).includes(v);

type Def = { id: string; secret: string; auth: string; token: string; scope: string; pkce: boolean; extra?: Record<string, string> };
const env = (k: string) => (process.env[k] ?? "").trim();

const DEFS: Record<Platform, Def> = {
  twitch: {
    id: env("TWITCH_CLIENT_ID"),
    secret: env("TWITCH_CLIENT_SECRET"),
    auth: "https://id.twitch.tv/oauth2/authorize",
    token: "https://id.twitch.tv/oauth2/token",
    scope: "user:write:chat",
    pkce: false,
    extra: { force_verify: "true" },
  },
  kick: {
    id: env("KICK_CLIENT_ID"),
    secret: env("KICK_CLIENT_SECRET"),
    auth: "https://id.kick.com/oauth/authorize",
    token: "https://id.kick.com/oauth/token",
    scope: "user:read chat:write",
    pkce: true,
  },
  youtube: {
    id: env("GOOGLE_CLIENT_ID"),
    secret: env("GOOGLE_CLIENT_SECRET"),
    auth: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/youtube.force-ssl",
    pkce: false,
    extra: { access_type: "offline", prompt: "consent" },
  },
};

export const configured = (p: Platform) => hasChatKey && DEFS[p].id !== "" && DEFS[p].secret !== "";

export function authorizeUrl(p: Platform, redirectUri: string, state: string, challenge?: string) {
  const d = DEFS[p];
  const q = new URLSearchParams({ client_id: d.id, redirect_uri: redirectUri, response_type: "code", scope: d.scope, state, ...d.extra });
  if (d.pkce && challenge) {
    q.set("code_challenge", challenge);
    q.set("code_challenge_method", "S256");
  }
  return `${d.auth}?${q}`;
}

type Tokens = { access_token: string; refresh_token?: string; expires_in?: number; scope?: string };

async function tokenRequest(p: Platform, params: Record<string, string>): Promise<Tokens> {
  const d = DEFS[p];
  const res = await fetch(d.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: d.id, client_secret: d.secret, ...params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${p} jeton ${res.status}`);
  return (await res.json()) as Tokens;
}

export const exchangeCode = (p: Platform, code: string, redirectUri: string, verifier?: string) =>
  tokenRequest(p, { grant_type: "authorization_code", code, redirect_uri: redirectUri, ...(verifier ? { code_verifier: verifier } : {}) });

async function getJson<T>(url: string, token: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...headers }, cache: "no-store" });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return (await res.json()) as T;
}

/** Qui est le compte qui vient de se connecter. */
export async function identify(p: Platform, token: string): Promise<{ id: string; name: string }> {
  if (p === "twitch") {
    const r = await getJson<{ data: { id: string; display_name: string }[] }>("https://api.twitch.tv/helix/users", token, { "Client-Id": DEFS.twitch.id });
    return { id: r.data[0].id, name: r.data[0].display_name };
  }
  if (p === "kick") {
    const r = await getJson<{ data: { user_id: number; name: string }[] }>("https://api.kick.com/public/v1/users", token);
    return { id: String(r.data[0].user_id), name: r.data[0].name };
  }
  const r = await getJson<{ items: { id: string; snippet: { title: string } }[] }>("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", token);
  if (!r.items?.[0]) throw new Error("Aucune chaîne YouTube sur ce compte Google");
  return { id: r.items[0].id, name: r.items[0].snippet.title };
}

export async function saveConnection(userId: string, p: Platform, tokens: Tokens, who: { id: string; name: string }) {
  const { error } = await createAdminClient()
    .from("chat_connections")
    .upsert({
      user_id: userId,
      platform: p,
      account_id: who.id,
      account_name: who.name,
      access_token: encrypt(tokens.access_token),
      refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
      scope: tokens.scope ?? DEFS[p].scope,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(error.message);
}

/** Comptes reliés de l'utilisateur (sans les jetons). */
export async function listConnections(userId: string): Promise<Partial<Record<Platform, string>>> {
  const { data } = await createAdminClient().from("chat_connections").select("platform, account_name").eq("user_id", userId);
  return Object.fromEntries((data ?? []).map((r) => [r.platform, r.account_name]));
}

export async function removeConnection(userId: string, p: Platform) {
  await createAdminClient().from("chat_connections").delete().eq("user_id", userId).eq("platform", p);
}

/** Jeton valide : renouvelé s'il expire dans moins d'une minute. */
async function accessToken(userId: string, p: Platform) {
  const db = createAdminClient();
  const { data } = await db.from("chat_connections").select("access_token, refresh_token, expires_at, account_id").eq("user_id", userId).eq("platform", p).maybeSingle();
  if (!data) throw new ChatError("not_connected", 401);
  const exp = data.expires_at ? new Date(data.expires_at).getTime() : Infinity;
  if (exp > Date.now() + 60_000) return { token: decrypt(data.access_token), accountId: data.account_id as string };
  if (!data.refresh_token) throw new ChatError("expired", 401);
  try {
    const t = await tokenRequest(p, { grant_type: "refresh_token", refresh_token: decrypt(data.refresh_token) });
    await db
      .from("chat_connections")
      .update({
        access_token: encrypt(t.access_token),
        refresh_token: t.refresh_token ? encrypt(t.refresh_token) : data.refresh_token,
        expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("platform", p);
    return { token: t.access_token, accountId: data.account_id as string };
  } catch {
    throw new ChatError("expired", 401);
  }
}

export class ChatError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}

async function post(url: string, token: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), cache: "no-store" });
  if (res.status === 401) throw new ChatError("expired", 401);
  if (res.status === 403) throw new ChatError("forbidden", 403);
  if (!res.ok) throw new ChatError("send_failed", 502);
  return res;
}

const MAX = { twitch: 500, kick: 500, youtube: 200 } as const;

/** Envoie `text` dans le chat de `channel` (pseudo Twitch, pseudo Kick ou identifiant de vidéo YouTube) avec le compte relié. */
export async function sendMessage(userId: string, p: Platform, channel: string, text: string) {
  const msg = text.trim();
  if (!msg) throw new ChatError("empty");
  if (msg.length > MAX[p]) throw new ChatError("too_long");
  const { token, accountId } = await accessToken(userId, p);

  if (p === "twitch") {
    const h = { "Client-Id": DEFS.twitch.id };
    const u = await getJson<{ data: { id: string }[] }>(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(channel)}`, token, h);
    if (!u.data[0]) throw new ChatError("channel_not_found", 404);
    const res = await post("https://api.twitch.tv/helix/chat/messages", token, { broadcaster_id: u.data[0].id, sender_id: accountId, message: msg }, h);
    const r = (await res.json()) as { data?: { is_sent: boolean }[] };
    if (r.data?.[0] && !r.data[0].is_sent) throw new ChatError("rejected", 422);
    return;
  }

  if (p === "kick") {
    const c = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(channel)}`, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; SYXTEE-Multichat)" }, signal: AbortSignal.timeout(6000) });
    if (c.status === 404) throw new ChatError("channel_not_found", 404);
    if (!c.ok) throw new ChatError("kick_unavailable", 502);
    const broadcaster = ((await c.json()) as { user_id?: number }).user_id;
    if (typeof broadcaster !== "number") throw new ChatError("kick_unavailable", 502);
    await post("https://api.kick.com/public/v1/chat", token, { broadcaster_user_id: broadcaster, content: msg, type: "user" });
    return;
  }

  const v = await getJson<{ items: { liveStreamingDetails?: { activeLiveChatId?: string } }[] }>(
    `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${encodeURIComponent(channel)}`,
    token,
  );
  const liveChatId = v.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
  if (!liveChatId) throw new ChatError("no_live_chat", 404);
  await post("https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet", token, { snippet: { liveChatId, type: "textMessageEvent", textMessageDetails: { messageText: msg } } });
}
