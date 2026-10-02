"use server";

import { after } from "next/server";
import { z } from "zod";
import { accessRequested } from "@/emails/templates";
import { allow, clientIp } from "@/lib/auth/rateLimit";
import { sendEmail } from "@/lib/email/send";
import { site } from "@/lib/site";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Formulaire public « Demander l'accès » : pas de compte requis. Limité par IP (3 par heure), champ piège anti-robots,
// une seule demande en attente par adresse. L'équipe est prévenue par email, le détail est dans /admin/acces.

export type AccessState = { ok?: boolean; error?: string };

const text = (label: string, max: number, min = 1) => z.string().trim().min(min, `${label} obligatoire.`).max(max, `${label} : ${max} caractères au plus.`);

const schema = z.object({
  first_name: text("Prénom", 60),
  last_name: text("Nom", 60),
  email: z.string().trim().toLowerCase().email("Adresse email invalide.").max(160),
  channel_url: text("Lien de ta chaîne", 200, 3),
  platform: z.enum(["twitch", "kick", "youtube", "tiktok", "autre"], { error: "Choisis ta plateforme." }),
  audience: z.string().trim().max(40).default(""),
  devices: z.string().trim().max(200).default(""),
  message: z.string().trim().max(1500, "Message : 1500 caractères au plus.").default(""),
});

export async function requestAccessAction(_prev: AccessState, form: FormData): Promise<AccessState> {
  // Champ piège : un humain ne le voit pas, un robot le remplit. Réponse « ok » pour ne rien apprendre au robot.
  if (String(form.get("website") ?? "") !== "") return { ok: true };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  if (!hasAdmin) return { error: "Demande impossible pour le moment." };
  if (!(await allow(`acces:${await clientIp()}`, 3, 3600))) return { error: "Trop de demandes depuis cette connexion. Réessaie dans une heure." };

  const db = createAdminClient();
  const d = parsed.data;
  const { count } = await db.from("access_requests").select("id", { count: "exact", head: true }).ilike("email", d.email).eq("status", "pending");
  if ((count ?? 0) > 0) return { ok: true };
  const { error } = await db.from("access_requests").insert(d);
  if (error) {
    console.error("access_requests", error.message);
    return { error: "Demande impossible pour le moment. Réessaie plus tard." };
  }
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  after(async () => {
    const mail = accessRequested({
      name: `${d.first_name} ${d.last_name}`,
      email: d.email,
      channel: d.channel_url,
      platform: d.platform,
      audience: d.audience,
      devices: d.devices,
      message: d.message,
      adminUrl: `${site.url}/admin/acces`,
    });
    for (const a of admins) await sendEmail(a, mail);
  });
  return { ok: true };
}
