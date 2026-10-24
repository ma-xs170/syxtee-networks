"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { allow } from "@/lib/auth/rateLimit";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Contact d'un vidéaste : le message passe par SYXTEE (l'e-mail du vidéaste n'est jamais montré) et arrive dans son espace.

export type ContactState = { error?: string; ok?: string };

const schema = z.object({
  cardId: z.string().regex(/^[0-9a-f-]{36}$/i),
  name: z.string().trim().min(2, "Indique ton nom.").max(80),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(160),
  message: z.string().trim().min(20, "Ton message est trop court (20 caractères au moins).").max(1500, "1 500 caractères au plus."),
  website: z.string().max(0).optional(), // piège à robots : un humain ne remplit jamais ce champ caché
});

export async function contactAction(_prev: ContactState, f: FormData): Promise<ContactState> {
  const parsed = schema.safeParse(Object.fromEntries(f));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Message invalide." };
  if (!hasAdmin) return { error: "Le contact n'est pas disponible pour le moment." };
  const { cardId, name, email, message } = parsed.data;
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "inconnu";
  if (!(await allow(`vmsg:${ip}`, 4, 3600))) return { error: "Trop de messages envoyés. Réessaie plus tard." };

  const db = createAdminClient();
  const { data: card } = await db.from("videographer_cards").select("user_id, display_name").eq("public_id", cardId).eq("status", "published").maybeSingle();
  if (!card) return { error: "Cette fiche n'est plus disponible." };
  const c = card as { user_id: string; display_name: string };
  if (!(await allow(`vmsg-card:${c.user_id}`, 20, 86_400))) return { error: "Ce vidéaste a reçu beaucoup de messages aujourd'hui. Réessaie demain." };

  const { error } = await db.from("videographer_messages").insert({ card_user_id: c.user_id, from_name: name, from_email: email, body: message });
  if (error) {
    console.error("contactAction", error.message);
    return { error: "Envoi impossible. Réessaie dans un instant." };
  }
  // Prévient le vidéaste dans son espace (la cloche) ; le message complet est dans « Ma fiche vidéaste ».
  await db.from("notifications").insert({ user_id: c.user_id, title: "Nouveau message d'annuaire", body: `${name} t'a écrit. Il est dans Ma fiche vidéaste.`.slice(0, 500) });
  return { ok: `Message envoyé à ${c.display_name}. Il te répondra par e-mail.` };
}
