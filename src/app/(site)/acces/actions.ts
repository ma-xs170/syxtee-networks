"use server";

import { after } from "next/server";
import { z } from "zod";
import { accessRequested } from "@/emails/templates";
import { allow, clientIp } from "@/lib/auth/rateLimit";
import { sendEmail } from "@/lib/email/send";
import { site } from "@/lib/site";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Formulaire public « Demander l'accès » : pas de compte requis. Antispam : champ piège, délai minimal de remplissage, limites par IP,
// par adresse et globale, adresses jetables refusées, liens dans le nom ou le message refusés, une seule demande en attente par adresse.
// Un robot reçoit toujours « ok » (il n'apprend rien). L'équipe est prévenue par email, le détail est dans /admin/acces.

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

/** Domaines d'adresses jetables les plus courants. */
const DISPOSABLE = new Set(["mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com", "yopmail.fr", "trashmail.com", "sharklasers.com", "getnada.com", "throwawaymail.com", "dispostable.com", "maildrop.cc", "fakeinbox.com", "mohmal.com", "emailondeck.com", "mintemail.com", "spamgourmet.com", "tempr.email", "discard.email"]);
const MIN_FILL_MS = 3_000;
const LINKS = /https?:\/\/|www\.|\.(ru|cn|xyz|top|click)\b/gi;

export async function requestAccessAction(_prev: AccessState, form: FormData): Promise<AccessState> {
  // Champ piège : un humain ne le voit pas, un robot le remplit. Réponse « ok » pour ne rien apprendre au robot.
  if (String(form.get("website") ?? "") !== "") return { ok: true };
  // Délai de remplissage : un formulaire envoyé en moins de 3 s, ou sans horodatage, est un robot.
  const filled = Date.now() - Number(form.get("t"));
  if (!Number.isFinite(filled) || filled < MIN_FILL_MS || filled > 7 * 86_400_000) return { ok: true };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  if (!hasAdmin) return { error: "Demande impossible pour le moment." };
  const d0 = parsed.data;
  if (DISPOSABLE.has(d0.email.split("@")[1] ?? "")) return { error: "Les adresses email jetables ne sont pas acceptées." };
  if (LINKS.test(`${d0.first_name} ${d0.last_name}`) || (d0.message.match(LINKS)?.length ?? 0) > 2) return { ok: true };
  if (!(await allow(`acces:${await clientIp()}`, 3, 3600))) return { error: "Trop de demandes depuis cette connexion. Réessaie dans une heure." };
  if (!(await allow(`acces-jour:${await clientIp()}`, 6, 86_400))) return { error: "Trop de demandes depuis cette connexion. Réessaie demain." };
  if (!(await allow(`acces-email:${d0.email}`, 2, 86_400))) return { ok: true };
  if (!(await allow("acces-global", 40, 3600))) return { error: "Beaucoup de demandes en ce moment. Réessaie dans un moment." };

  const db = createAdminClient();
  const d = parsed.data;
  const { count } = await db.from("access_requests").select("id", { count: "exact", head: true }).ilike("email", d.email).eq("status", "pending").is("deleted_at", null);
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
