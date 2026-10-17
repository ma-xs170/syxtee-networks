"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { recordTerms } from "@/lib/terms";

/** « Accepter et continuer » : enregistre la version des conditions acceptée par le compte. */
export async function acceptTermsAction() {
  const user = await requireUser("/dashboard");
  await recordTerms(user.id);
  revalidatePath("/dashboard", "layout");
}
