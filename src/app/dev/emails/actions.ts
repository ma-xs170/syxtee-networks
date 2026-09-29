"use server";

import { requireAdmin } from "@/lib/admin";
import { getUser } from "@/lib/auth/dal";
import { samples } from "@/emails/templates";
import { hasEmail, sendEmail } from "@/lib/email/send";

export type TestState = { ok?: string; error?: string };

/** Envoie un exemple (ou tous) à l'adresse de la personne connectée. Admin, ou n'importe quel compte en local. */
export async function sendTest(_prev: TestState, formData: FormData): Promise<TestState> {
  const user = process.env.NODE_ENV === "development" ? await getUser() : await requireAdmin();
  if (!user?.email) return { error: "Connecte-toi pour recevoir les tests." };
  if (!hasEmail) return { error: "RESEND_API_KEY absente : aucun envoi possible." };
  const key = String(formData.get("key") ?? "");
  const list = samples().filter((s) => key === "all" || s.key === key);
  if (!list.length) return { error: "Modèle inconnu." };
  let ok = 0;
  for (const s of list) {
    if (await sendEmail(user.email, { ...s.email, subject: `[Test] ${s.email.subject}` })) ok++;
  }
  return ok === list.length ? { ok: `${ok} email${ok > 1 ? "s" : ""} envoyé${ok > 1 ? "s" : ""} à ${user.email}.` } : { error: `${list.length - ok} envoi(s) en échec (voir les logs).` };
}
