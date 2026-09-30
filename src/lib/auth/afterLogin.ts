import "server-only";
import type { User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import { getTwitchUser } from "@/lib/twitch";
import { safeNext } from "./dal";

const httpsUrl = (v: unknown) => (typeof v === "string" && v.startsWith("https://") ? v : null);

/**
 * Après une connexion (lien magique ou OAuth) : synchronise le Twitch vérifié, reprend l'avatar du fournisseur
 * s'il n'y en a pas, puis choisit la page suivante (/bienvenue tant que le profil n'est pas complété).
 */
export async function afterLogin(user: User, next: string | null) {
  if (!hasAdmin) return safeNext(next);
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("avatar_url, twitch_id, onboarded_at, plan").eq("id", user.id).single();

  const patch: Record<string, string> = {};
  const twitch = user.identities?.find((i) => i.provider === "twitch");
  if (twitch) {
    const d = twitch.identity_data ?? {};
    const twitchId = String(d.provider_id ?? d.sub ?? twitch.id);
    if (profile?.twitch_id !== twitchId) {
      try {
        const tu = await getTwitchUser(twitchId);
        patch.twitch_id = twitchId;
        patch.twitch_login = tu?.login ?? String(d.slug ?? d.nickname ?? "").toLowerCase();
        patch.twitch_display_name = tu?.display_name ?? String(d.nickname ?? d.name ?? patch.twitch_login);
        if (!profile?.avatar_url && httpsUrl(tu?.profile_image_url)) patch.avatar_url = tu!.profile_image_url;
      } catch (e) {
        console.error("Synchro Twitch", e);
      }
    }
  }
  if (!profile?.avatar_url && !patch.avatar_url) {
    const fromProvider = httpsUrl(user.user_metadata?.avatar_url) ?? httpsUrl(user.user_metadata?.picture);
    if (fromProvider) patch.avatar_url = fromProvider;
  }
  // Admin : formule « admin » en base (le Core ne connaît pas ADMIN_EMAILS). Retiré de la liste : repasse en Gratuit.
  const admin_ = !!user.email_confirmed_at && isAdminEmail(user.email);
  if (admin_ && profile?.plan !== "admin") patch.plan = "admin";
  else if (!admin_ && profile?.plan === "admin") patch.plan = "free";

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from("profiles").update(patch).eq("id", user.id);
    if (error) console.error("Profil après connexion", error.message);
  }

  if (!profile?.onboarded_at) return next ? `/bienvenue?next=${encodeURIComponent(safeNext(next))}` : "/bienvenue";
  return safeNext(next);
}
