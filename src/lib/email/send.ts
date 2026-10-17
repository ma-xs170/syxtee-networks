import "server-only";
import { render } from "@react-email/components";
import { Resend } from "resend";
import type { Email } from "@/emails/templates";
import { allow } from "@/lib/auth/rateLimit";
import { budget } from "@/lib/guard";

// Envoi via Resend. Expéditeur : EMAIL_FROM (ex. « SYXTEE <connexion@syxtee.fr> » une fois le domaine vérifié).
// Sans domaine, l'expéditeur de test de Resend ne livre qu'à l'adresse du compte Resend.
// Sans RESEND_API_KEY (dev, tests) : rien n'est envoyé, l'email est seulement journalisé.

export const hasEmail = !!process.env.RESEND_API_KEY;

/** Pour l'admin : ce que le serveur voit réellement (jamais la valeur de la clé). */
function envDiagnostic() {
  const names = Object.keys(process.env).filter((k) => /resend|email_from/i.test(k));
  return `environnement ${process.env.NODE_ENV}, variables vues : ${names.length ? names.map((k) => `${k} (${(process.env[k] ?? "").length} car.)`).join(", ") : "aucune"}`;
}
const FROM = process.env.EMAIL_FROM || "SYXTEE <onboarding@resend.dev>";
/** Expéditeur réellement utilisé (pour le diagnostic de l'admin). */
export const senderAddress = FROM;

let client: Resend | null = null;

export async function renderEmail(email: Email) {
  const [html, text] = await Promise.all([render(email.element), render(email.element, { plainText: true })]);
  return { subject: email.subject, html, text };
}

export type SendResult = { ok: true } | { ok: false; reason: string };

/** Envoie un email et dit pourquoi il a échoué (pour l'admin) ; ne lève jamais d'exception. */
export async function sendEmailResult(to: string, email: Email): Promise<SendResult> {
  try {
    const { subject, html, text } = await renderEmail(email);
    if (!hasEmail) {
      console.info(`[email non envoyé : RESEND_API_KEY absente] ${to} · ${subject}`);
      return { ok: false, reason: `RESEND_API_KEY absente sur Vercel - ${envDiagnostic()}` };
    }
    // Plafonds : 8 e-mails par heure et par destinataire, 2 000 par jour au total (protège le quota Resend et la réputation du domaine).
    if (!(await allow(`mail:${to.toLowerCase()}`, 8, 3600))) return { ok: false, reason: "trop d'e-mails envoyés à cette adresse (8 par heure)" };
    if (!(await budget("resend", 2000))) return { ok: false, reason: "plafond de 2 000 e-mails par jour atteint" };
    client ??= new Resend(process.env.RESEND_API_KEY);
    // Resend n'a pas de délai propre : sans cette limite, une panne chez eux bloquerait l'action (inscription, contact) indéfiniment.
    const { error } = await Promise.race([
      client.emails.send({ from: FROM, to, subject, html, text }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Resend : délai de 10 s dépassé")), 10_000)),
    ]);
    if (error) {
      console.error("Resend", error.name, error.message);
      const testSender = /own email|verify a domain|testing emails/i.test(error.message);
      return { ok: false, reason: testSender ? "Resend n'envoie qu'à ton adresse tant que le domaine n'est pas vérifié (EMAIL_FROM)" : `Resend : ${error.message}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("sendEmail", e);
    return { ok: false, reason: "erreur d'envoi inattendue" };
  }
}

/** Envoie un email ; renvoie false en cas d'échec (jamais d'exception : un email raté ne casse pas le parcours). */
export async function sendEmail(to: string, email: Email): Promise<boolean> {
  return (await sendEmailResult(to, email)).ok;
}
