import type { NextRequest } from "next/server";
import { appUser, privateJson, readJson } from "@/lib/auth/app-api";
import { saveNames, saveProfile } from "@/lib/auth/profileActions";

const FIELDS = ["bio", "country", "timezone", "twitch", "kick", "youtube", "tiktok", "instagram", "x"] as const;

// GET /api/app/profile : profil complet du compte.
export async function GET() {
  const u = await appUser();
  if (u instanceof Response) return u;
  const p = u.profile;
  return privateJson({
    email: u.email,
    first_name: p.first_name, last_name: p.last_name, username: p.username, avatar_url: p.avatar_url,
    bio: p.bio, country: p.country, timezone: p.timezone ?? null,
    twitch: p.twitch ?? p.twitch_login, kick: p.kick, youtube: p.youtube, tiktok: p.tiktok, instagram: p.instagram, x: p.x,
    show_on_site: p.show_on_site, show_first_name: !!p.show_first_name,
    support_id: p.support_id ?? null,
  });
}

// PATCH /api/app/profile { first_name?, last_name?, bio?, country?, twitch?, kick?, youtube?, tiktok?, instagram?, x?, show_on_site?, show_first_name? }
// Mêmes validations que la page Profil du site. Le mot de passe et l'e-mail se changent sur le site.
export async function PATCH(request: NextRequest) {
  const u = await appUser();
  if (u instanceof Response) return u;
  const b = (await readJson(request)) as Record<string, unknown> | null;
  if (!b) return privateJson({ error: "Corps invalide." }, { status: 400 });
  if ("first_name" in b || "last_name" in b) {
    const f = new FormData();
    f.set("first_name", String(b.first_name ?? u.profile.first_name ?? ""));
    f.set("last_name", String(b.last_name ?? u.profile.last_name ?? ""));
    const r = await saveNames({}, f);
    if (r.error) return privateJson({ error: r.error }, { status: 400 });
  }
  if (FIELDS.some((k) => k in b) || "show_on_site" in b || "show_first_name" in b) {
    const p = u.profile;
    const f = new FormData();
    const cur: Record<string, unknown> = { bio: p.bio, country: p.country, timezone: p.timezone, twitch: p.twitch ?? "", kick: p.kick, youtube: p.youtube, tiktok: p.tiktok, instagram: p.instagram, x: p.x };
    for (const k of FIELDS) f.set(k, String(k in b ? (b[k] ?? "") : (cur[k] ?? "")));
    if ("show_on_site" in b ? b.show_on_site : p.show_on_site) f.set("show_on_site", "on");
    if ("show_first_name" in b ? b.show_first_name : p.show_first_name) f.set("show_first_name", "on");
    const r = await saveProfile("compte", {}, f);
    if (r.error) return privateJson({ error: r.error }, { status: 400 });
  }
  return privateJson({ ok: true });
}
