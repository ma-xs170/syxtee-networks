import "server-only";
import { render } from "@react-email/components";
import { Resend } from "resend";
import type { Email } from "@/emails/templates";

// Envoi via Resend. Expéditeur : EMAIL_FROM (ex. « SYXTEE <connexion@syxtee.fr> » une fois le domaine vérifié).
// Sans domaine, l'expéditeur de test de Resend ne livre qu'à l'adresse du compte Resend.
// Sans RESEND_API_KEY (dev, tests) : rien n'est envoyé, l'email est seulement journalisé.

export const hasEmail = !!process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "SYXTEE <onboarding@resend.dev>";

let client: Resend | null = null;

export async function renderEmail(email: Email) {
  const [html, text] = await Promise.all([render(email.element), render(email.element, { plainText: true })]);
  return { subject: email.subject, html, text };
}

/** Envoie un email ; renvoie false en cas d'échec (jamais d'exception : un email raté ne casse pas le parcours). */
export async function sendEmail(to: string, email: Email): Promise<boolean> {
  try {
    const { subject, html, text } = await renderEmail(email);
    if (!hasEmail) {
      console.info(`[email non envoyé : RESEND_API_KEY absente] ${to} · ${subject}`);
      return false;
    }
    client ??= new Resend(process.env.RESEND_API_KEY);
    const { error } = await client.emails.send({ from: FROM, to, subject, html, text });
    if (error) {
      console.error("Resend", error.name, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("sendEmail", e);
    return false;
  }
}
