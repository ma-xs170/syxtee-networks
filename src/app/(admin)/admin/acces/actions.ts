"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { accessApproved } from "@/emails/templates";
import { requireAdmin } from "@/lib/admin";
import { getRequest } from "@/lib/access";
import { sendEmail } from "@/lib/email/send";
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
  if (input.data.decision === "approved") await sendEmail(req.email, accessApproved({ firstName: req.first_name, email: req.email }));
  await audit(admin.email!, `access.${input.data.decision}`, null, null, { request: req.id, email: req.email });
  revalidatePath("/admin/acces");
}
