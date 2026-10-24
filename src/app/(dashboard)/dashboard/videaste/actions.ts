"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { allow } from "@/lib/auth/rateLimit";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import { cardProblems, parseSpecialties, PRICE_UNITS, type CardStatus } from "@/lib/videaste";
import { reviewPhoto } from "@/lib/videaste-review";

// Fiche vidéaste : compte gratuit de type « vidéaste », fiche relue automatiquement avant publication.

export type VideasteState = { error?: string; ok?: string; status?: CardStatus };
const PATH = "/dashboard/videaste";

const price = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().int().min(0).max(100000).nullable());
const schema = z.object({
  displayName: z.string().trim().min(2, "Le nom doit faire au moins 2 caractères.").max(60),
  region: z.string().trim().min(2, "Indique ta région.").max(80),
  country: z.string().regex(/^[A-Z]{2}$/, "Choisis un pays."),
  priceFrom: price,
  priceTo: price,
  priceUnit: z.enum(Object.keys(PRICE_UNITS) as [keyof typeof PRICE_UNITS, ...(keyof typeof PRICE_UNITS)[]]),
  bio: z.string().trim().max(500, "500 caractères au plus."),
  specialties: z.string().max(300),
});

/** Passe le compte en « vidéaste » (gratuit, rien d'autre ne change : mêmes connexions, aperçus et statistiques qu'un compte gratuit). */
export async function becomeVideasteAction(): Promise<VideasteState> {
  const user = await requireUser(PATH);
  if (!hasAdmin) return { error: "Indisponible pour le moment." };
  const { error } = await createAdminClient().from("profiles").update({ account_type: "videaste" }).eq("id", user.id);
  if (error) return { error: "Impossible d'activer le compte vidéaste. Réessaie dans un instant." };
  revalidatePath(PATH);
  return { ok: "Compte vidéaste activé." };
}

export async function saveCardAction(_prev: VideasteState, f: FormData): Promise<VideasteState> {
  const user = await requireUser(PATH);
  if (!hasAdmin) return { error: "Indisponible pour le moment." };
  const parsed = schema.safeParse(Object.fromEntries(f));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Fiche invalide." };
  if (!(await allow(`videaste:${user.id}`, 8, 86_400))) return { error: "Trop d'envois aujourd'hui. Réessaie demain." };

  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("account_type, avatar_url").eq("id", user.id).single();
  const p = profile as { account_type: string; avatar_url: string | null } | null;
  if (p?.account_type !== "videaste") return { error: "Active d'abord ton compte vidéaste." };
  if (!p.avatar_url) return { error: "Ajoute d'abord ta photo (Compte, Avatar) : l'annuaire montre ton visage." };

  const card = { ...parsed.data, specialties: parseSpecialties(parsed.data.specialties) };
  const problems = cardProblems(card);
  let status: CardStatus = "published";
  let note: string | null = null;
  if (problems.length) {
    status = "rejected";
    note = problems.join(" ");
  } else {
    const photo = await reviewPhoto(p.avatar_url);
    if (photo.verdict === "bad") {
      status = "rejected";
      note = photo.reason;
    } else if (photo.verdict === "unsure") {
      status = "pending";
    }
  }

  const { error } = await db.from("videographer_cards").upsert({
    user_id: user.id,
    display_name: card.displayName,
    region: card.region,
    country: card.country,
    price_from: card.priceFrom,
    price_to: card.priceTo,
    price_unit: card.priceUnit,
    bio: card.bio,
    specialties: card.specialties,
    status,
    review_note: note,
    reviewed_at: status === "pending" ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("saveCardAction", error.message);
    return { error: "Enregistrement impossible. Réessaie dans un instant." };
  }
  revalidatePath(PATH);
  if (status === "published") return { ok: "Ta fiche est publiée dans l'annuaire.", status };
  if (status === "pending") return { ok: "Fiche enregistrée : elle sera relue par l'équipe avant publication.", status };
  return { error: note ?? "Fiche refusée.", status };
}

/** Retire la fiche de l'annuaire (elle reste enregistrée en brouillon). */
export async function unpublishCardAction(): Promise<VideasteState> {
  const user = await requireUser(PATH);
  if (!hasAdmin) return { error: "Indisponible pour le moment." };
  const { error } = await createAdminClient().from("videographer_cards").update({ status: "draft", updated_at: new Date().toISOString() }).eq("user_id", user.id);
  if (error) return { error: "Impossible de retirer la fiche. Réessaie dans un instant." };
  revalidatePath(PATH);
  return { ok: "Ta fiche n'est plus dans l'annuaire." };
}
