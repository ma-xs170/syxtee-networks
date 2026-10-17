import "server-only";
import { cache } from "react";
import { z } from "zod";
import { getUser } from "@/lib/auth/dal";
import { site } from "@/lib/site";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Programme affilié (migration 0053_affiliates.sql). L'équipe invite une adresse depuis /admin/affilies ; la personne retrouve son espace
// « Affilié » dans le dashboard (lien public /s/<slug>, pseudo affiché, kit à télécharger). Tout passe par le serveur (clé secrète).

/** Colonnes de la table affiliates, dans l'ordre du type Affiliate. */
export const AFFILIATE_COLUMNS = "id, created_at, user_id, email, slug, display_name, active, invited_by, seen_at, clicks";

export type Affiliate = {
  id: string;
  created_at: string;
  user_id: string | null;
  email: string;
  slug: string;
  display_name: string;
  active: boolean;
  invited_by: string | null;
  seen_at: string | null;
  clicks: number;
};

/** Kit à télécharger : logos et visuels du dossier STREAMER KIT, en zip. */
export const KIT_PATH = "/kit/syxtee-streamer-kit.zip";
export const kitUrl = `${site.url}${KIT_PATH}`;

export const affiliateUrl = (slug: string) => `${site.url}/s/${slug}`;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9_-]{2,29}$/, "Nom d'URL : 3 à 30 caractères (lettres, chiffres, tiret, tiret bas).");

export const displayNameSchema = z.string().trim().min(1, "Donne un pseudo.").max(40, "Pseudo : 40 caractères au plus.");

/** Texte libre vers un nom d'URL valide (accents retirés), ou "" s'il ne reste rien d'utilisable. */
export function slugify(input: string) {
  const s = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 30);
  return s.length >= 3 ? s : "";
}

/** Premier nom d'URL libre à partir d'une base (ajoute un nombre si besoin). */
export async function freeSlug(base: string) {
  const root = slugify(base) || "streamer";
  const db = createAdminClient();
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root.slice(0, 30 - String(i + 1).length)}${i + 1}`;
    const { data } = await db.from("affiliates").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${root.slice(0, 22)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Affilié du compte connecté. Une invitation faite par adresse est rattachée au compte à sa première visite (e-mail vérifié). */
export const getMyAffiliate = cache(async (): Promise<Affiliate | null> => {
  const user = await getUser();
  if (!user || !hasAdmin) return null;
  const db = createAdminClient();
  const { data } = await db.from("affiliates").select(AFFILIATE_COLUMNS).eq("user_id", user.id).maybeSingle<Affiliate>();
  if (data) return data.active ? data : null;
  if (!user.email || !user.email_confirmed_at) return null;
  const { data: byMail } = await db.from("affiliates").select(AFFILIATE_COLUMNS).eq("email", user.email.toLowerCase()).is("user_id", null).eq("active", true).maybeSingle<Affiliate>();
  if (!byMail) return null;
  const { data: claimed } = await db.from("affiliates").update({ user_id: user.id }).eq("id", byMail.id).is("user_id", null).select(AFFILIATE_COLUMNS).maybeSingle<Affiliate>();
  return claimed ?? null;
});

/** Données de la page publique : affilié actif, photo de profil (compte, sinon avatar Twitch). Null si le lien n'existe pas. */
export async function getPublicAffiliate(slug: string): Promise<{ displayName: string; slug: string; avatar: string | null; twitch: string | null } | null> {
  if (!hasAdmin || !slugSchema.safeParse(slug).success) return null;
  const db = createAdminClient();
  const { data } = await db.from("affiliates").select("slug, display_name, user_id").eq("slug", slug.toLowerCase()).eq("active", true).maybeSingle();
  if (!data) return null;
  let avatar: string | null = null;
  let twitch: string | null = null;
  if (data.user_id) {
    const { data: p } = await db.from("profiles").select("avatar_url, twitch_login, twitch").eq("id", data.user_id).maybeSingle();
    avatar = (p?.avatar_url as string | null) ?? null;
    twitch = ((p?.twitch_login as string | null) || (p?.twitch as string | null)) ?? null;
  }
  return { displayName: data.display_name as string, slug: data.slug as string, avatar, twitch };
}
