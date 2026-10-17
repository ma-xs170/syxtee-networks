import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { limitOr429 } from "@/lib/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// Développeurs : clés d'API (lecture seule, stockées hachées) et webhooks (envoyés par le Core, voir core/src/webhooks.ts).

export const MAX_KEYS = 5;
export const MAX_WEBHOOKS = 5;
export const WEBHOOK_EVENTS = ["live.started", "live.ended"] as const;

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** Nouvelle clé : « sx_ » + 32 octets aléatoires. La clé en clair n'est montrée qu'une fois ; seul son hachage est gardé. */
export function newApiKey() {
  const key = `sx_${randomBytes(32).toString("hex")}`;
  return { key, prefix: key.slice(0, 9), hash: sha(key) };
}

/** Utilisateur d'une clé d'API (en-tête Authorization: Bearer sx_…) ; une `Response` 401/429 sinon. */
export async function apiKeyUser(request: Request): Promise<{ userId: string; keyId: string } | Response> {
  const bearer = /^Bearer (sx_[0-9a-f]{64})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  const fail = () => Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store", "WWW-Authenticate": "Bearer" } });
  if (!bearer) return fail();
  const db = createAdminClient();
  const { data } = await db.from("api_keys").select("id, user_id").eq("key_hash", sha(bearer)).is("revoked_at", null).maybeSingle();
  if (!data) return fail();
  const limited = await limitOr429(`apikey:${data.id}`, 60, 60);
  if (limited) return limited;
  void db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return { userId: data.user_id as string, keyId: data.id as string };
}

/** Adresse interne (boucle locale, réseau privé, lien local, métadonnées cloud). */
export function isInternalIp(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(v) === 4) {
    const [a, b] = v.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (v.startsWith("::ffff:")) return isInternalIp(v.slice(7));
  return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
}

/** Message d'erreur si l'adresse d'un webhook est refusée (https obligatoire, jamais une adresse interne), sinon null. */
export async function webhookUrlError(raw: string): Promise<string | null> {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return "Adresse invalide.";
  }
  if (u.protocol !== "https:") return "L'adresse doit commencer par https://.";
  if (u.username || u.password) return "Pas d'identifiants dans l'adresse.";
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return "Adresse interne refusée.";
  const addrs = isIP(host) ? [host] : await lookup(host, { all: true }).then((r) => r.map((a) => a.address)).catch(() => []);
  if (addrs.length === 0) return "Ce nom de domaine ne répond pas.";
  if (addrs.some(isInternalIp)) return "Adresse interne refusée.";
  return null;
}

export function signBody(secret: string, body: string, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
}

export const newWebhookSecret = () => `whsec_${randomBytes(24).toString("hex")}`;
