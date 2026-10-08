"use server";

import { after } from "next/server";
import { z } from "zod";
import { quoteRequested } from "@/emails/templates";
import { allow, clientIp } from "@/lib/auth/rateLimit";
import { sendEmail } from "@/lib/email/send";

// Formulaire public « Contacter » : demande de devis gratuit pour un live IRL en mobilité. Pas de compte requis.
// Antispam comme « Demander l'accès » : champ piège, délai minimal, limites par IP et par adresse, adresses jetables et liens refusés.
// La demande est envoyée par e-mail aux administrateurs (ADMIN_EMAILS). Un robot reçoit toujours « ok ».

export type ContactState = { ok?: boolean; error?: string };

const EVENT_TYPES = ["Marathon ou semi-marathon", "Course à pied ou trail", "Course cycliste", "Manifestation publique", "Festival ou concert", "Événement sportif", "Reportage ou tournage en mobilité", "Autre"] as const;
const DURATIONS = ["Moins de 2 h", "2 à 4 h", "4 à 8 h", "Plus de 8 h", "Plusieurs jours"] as const;
const NEEDS = ["Plusieurs caméras", "Bonding 4G / 5G", "Liaison satellite", "Contrôle à distance d'OBS", "Multistream", "Équipe sur place"];

const text = (label: string, max: number, min = 1) => z.string().trim().min(min, `${label} obligatoire.`).max(max, `${label} : ${max} caractères au plus.`);

const schema = z.object({
  name: text("Nom", 80),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(160),
  phone: z.string().trim().max(30).default(""),
  channel: z.string().trim().max(200).default(""),
  event_type: z.enum(EVENT_TYPES, { error: "Choisis le type d'événement." }),
  location: text("Lieu ou ville", 120),
  date: z.string().trim().max(60).default(""),
  duration: z.string().trim().max(40).default(""),
  audience: z.string().trim().max(60).default(""),
  message: text("Description du projet", 2000, 10),
  consent: z.literal("on", { error: "Accepte que tes données soient utilisées pour te recontacter." }),
});

const DISPOSABLE = new Set(["mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com", "yopmail.fr", "trashmail.com", "sharklasers.com", "getnada.com", "throwawaymail.com", "dispostable.com", "maildrop.cc", "fakeinbox.com", "mohmal.com", "emailondeck.com", "mintemail.com", "spamgourmet.com", "tempr.email", "discard.email"]);
const MIN_FILL_MS = 5_000;
const LINKS = /https?:\/\/|www\.|\.(ru|cn|xyz|top|click)\b/gi;

export async function contactAction(_prev: ContactState, form: FormData): Promise<ContactState> {
  if (String(form.get("website") ?? "") !== "") return { ok: true };
  const filled = Date.now() - Number(form.get("t"));
  if (!Number.isFinite(filled) || filled < MIN_FILL_MS || filled > 7 * 86_400_000) return { ok: true };
  const needs = form.getAll("needs").map(String).filter((n) => NEEDS.includes(n));
  const parsed = schema.safeParse({ ...Object.fromEntries(form), consent: form.get("consent") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const d = parsed.data;
  if (d.duration && !(DURATIONS as readonly string[]).includes(d.duration)) return { error: "Durée invalide." };
  if (DISPOSABLE.has(d.email.split("@")[1] ?? "")) return { error: "Les adresses e-mail jetables ne sont pas acceptées." };
  if (LINKS.test(d.name) || (d.message.match(LINKS)?.length ?? 0) > 2) return { ok: true };
  if (!(await allow(`contact:${await clientIp()}`, 3, 3600))) return { error: "Trop de demandes depuis cette connexion. Réessaie dans une heure." };
  if (!(await allow(`contact-jour:${await clientIp()}`, 6, 86_400))) return { error: "Trop de demandes depuis cette connexion. Réessaie demain." };
  if (!(await allow(`contact-email:${d.email}`, 3, 86_400))) return { ok: true };
  if (!(await allow("contact-global", 60, 3600))) return { error: "Beaucoup de demandes en ce moment. Réessaie dans un moment." };

  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (admins.length === 0) {
    console.error("contact : ADMIN_EMAILS vide, demande de devis non transmise");
    return { error: "Envoi impossible pour le moment. Réessaie plus tard." };
  }
  after(async () => {
    const mail = quoteRequested({ ...d, needs });
    for (const a of admins) await sendEmail(a, mail);
  });
  return { ok: true };
}
