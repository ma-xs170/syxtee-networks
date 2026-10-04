"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { accessApproved } from "@/emails/templates";
import { requireAdmin } from "@/lib/admin";
import { getRequest } from "@/lib/access";
import { sendEmailResult } from "@/lib/email/send";
import { audit } from "@/lib/plan-admin";
import { createAdminClient } from "@/lib/supabase/admin";

// Demandes d'accès : approuver (email « tu as été approuvé » avec un bouton vers la création de compte) ou refuser.
// L'accès Partenaire est attribué au compte qui se crée avec la même adresse, une fois vérifiée (lib/access.ts).

export async function decideAccessAction(form: FormData) {
  const admin = await requireAdmin();
  const input = z.object({ id: z.uuid(), decision: z.enum(["approved", "refused"]) }).safeParse({ id: form.get("id"), decision: form.get("decision") });
  if (!input.success) return;
  const req = await getRequest(input.data.id);
  if (!req || req.status !== "pending") return;
  const { error } = await createAdminClient()
    .from("access_requests")
    .update({ status: input.data.decision, decided_at: new Date().toISOString(), decided_by: admin.email })
    .eq("id", req.id);
  if (error) return console.error("access_requests", error.message);
  const mail = input.data.decision === "approved" ? await sendEmailResult(req.email, accessApproved({ firstName: req.first_name, email: req.email })) : null;
  await audit(admin.email!, `access.${input.data.decision}`, null, null, { request: req.id, email: req.email, ...(mail && !mail.ok ? { email_failed: mail.reason } : {}) });
  revalidatePath("/admin/acces");
  // Un email raté ne doit plus passer inaperçu : l'admin le voit et peut le renvoyer.
  if (mail) redirect(`/admin/acces?etat=approuvees&${mail.ok ? `mail=ok&to=${encodeURIComponent(req.email)}` : `mail=ko&to=${encodeURIComponent(req.email)}&r=${encodeURIComponent(mail.reason)}`}`);
}

/** Renvoie l'email d'approbation (demande approuvée dont le compte n'est pas encore créé). */
export async function resendAccessEmailAction(form: FormData) {
  const admin = await requireAdmin();
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return;
  const req = await getRequest(id.data);
  if (!req || req.status !== "approved" || req.redeemed_at) return;
  const mail = await sendEmailResult(req.email, accessApproved({ firstName: req.first_name, email: req.email }));
  await audit(admin.email!, "access.resend", null, null, { request: req.id, email: req.email, ...(mail.ok ? {} : { email_failed: mail.reason }) });
  redirect(`/admin/acces?etat=approuvees&${mail.ok ? `mail=ok&to=${encodeURIComponent(req.email)}` : `mail=ko&to=${encodeURIComponent(req.email)}&r=${encodeURIComponent(mail.reason)}`}`);
}
