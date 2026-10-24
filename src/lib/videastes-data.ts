import "server-only";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import type { PriceUnit } from "@/lib/videaste";

// Lecture publique de l'annuaire : uniquement les fiches publiées, avec la photo de l'avatar. Jamais l'identifiant ni l'e-mail du compte.

export type PublicCard = { id: string; name: string; region: string; country: string; priceFrom: number | null; priceTo: number | null; priceUnit: PriceUnit; bio: string; specialties: string[]; photo: string; updatedAt: string };

type Row = { user_id: string; public_id: string; display_name: string; region: string; country: string; price_from: number | null; price_to: number | null; price_unit: PriceUnit; bio: string; specialties: string[]; updated_at: string };
const COLUMNS = "user_id, public_id, display_name, region, country, price_from, price_to, price_unit, bio, specialties, updated_at";

async function withPhotos(rows: Row[]): Promise<PublicCard[]> {
  if (!rows.length) return [];
  const { data } = await createAdminClient().from("profiles").select("id, avatar_url").in("id", rows.map((r) => r.user_id));
  const photo = new Map(((data ?? []) as { id: string; avatar_url: string | null }[]).map((p) => [p.id, p.avatar_url]));
  return rows.flatMap((r) => {
    const url = photo.get(r.user_id);
    // Sans photo, pas de fiche publique : l'annuaire montre des visages.
    return url ? [{ id: r.public_id, name: r.display_name, region: r.region, country: r.country, priceFrom: r.price_from, priceTo: r.price_to, priceUnit: r.price_unit, bio: r.bio, specialties: r.specialties, photo: url, updatedAt: r.updated_at }] : [];
  });
}

export async function listPublished(filter: { country?: string; q?: string } = {}): Promise<PublicCard[]> {
  if (!hasAdmin) return [];
  let q = createAdminClient().from("videographer_cards").select(COLUMNS).eq("status", "published").order("updated_at", { ascending: false }).limit(200);
  if (filter.country && /^[A-Z]{2}$/.test(filter.country)) q = q.eq("country", filter.country);
  const { data, error } = await q;
  if (error) return [];
  const cards = await withPhotos((data ?? []) as Row[]);
  const needle = filter.q?.trim().toLowerCase();
  return needle ? cards.filter((c) => `${c.name} ${c.region} ${c.specialties.join(" ")}`.toLowerCase().includes(needle)) : cards;
}

export async function getPublished(publicId: string): Promise<PublicCard | null> {
  if (!hasAdmin || !/^[0-9a-f-]{36}$/i.test(publicId)) return null;
  const { data } = await createAdminClient().from("videographer_cards").select(COLUMNS).eq("status", "published").eq("public_id", publicId).maybeSingle();
  return data ? ((await withPhotos([data as Row]))[0] ?? null) : null;
}

/** Comptes de vidéastes dont la fiche est publiée : leurs demandes de support passent en premier. Sans la migration 0066, personne n'est prioritaire. */
export async function priorityUsers(userIds: string[]): Promise<Set<string>> {
  if (!hasAdmin || userIds.length === 0) return new Set();
  const { data, error } = await createAdminClient().from("videographer_cards").select("user_id").eq("status", "published").in("user_id", [...new Set(userIds)]);
  return error ? new Set() : new Set(((data ?? []) as { user_id: string }[]).map((r) => r.user_id));
}
