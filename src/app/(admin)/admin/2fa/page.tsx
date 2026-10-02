import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminAal, requireAdminIdentity } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import TwoFactor from "./TwoFactor";

export const metadata: Metadata = { title: "Admin · Double authentification", robots: { index: false } };

// Entrée de l'espace admin : code TOTP obligatoire (404 pour un compte normal, comme toutes les pages /admin).
export default async function AdminTwoFactorPage() {
  await requireAdminIdentity();
  if ((await adminAal()).current === "aal2") redirect("/admin");
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const verified = data?.totp?.find((f) => f.status === "verified") ?? null;

  return (
    <div className="mx-auto w-full max-w-[420px] px-4 py-16">
      <h1 className="text-center text-3xl font-semibold tracking-tight">Double authentification</h1>
      <p className="mt-3 text-center text-sm text-foreground/60">L&apos;espace admin demande un code à chaque nouvelle session.</p>
      <div className="mt-10">
        <TwoFactor factorId={verified?.id ?? null} />
      </div>
    </div>
  );
}
