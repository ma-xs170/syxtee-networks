import type { Metadata } from "next";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { isManagedEmail } from "@/lib/managed";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import ManagedUI, { type ManagedRow } from "./ManagedUI";

export const metadata: Metadata = { title: "Admin · Comptes gérés", robots: { index: false } };

// Comptes créés par l'équipe : identifiant et mot de passe temporaires à copier, durée indéfinie ou éphémère,
// première connexion guidée (nouveau mot de passe, puis adresse e-mail). Réservée à la permission « Comptes clients ».
export default async function ManagedPage() {
  await requireAdmin("accounts");
  let rows: ManagedRow[] = [];
  if (hasAdmin) {
    const db = createAdminClient();
    const { data } = await db.from("managed_accounts").select("user_id, login, created_at, expires_at, must_change_password, email_required, note").order("created_at", { ascending: false }).limit(200);
    const ids = (data ?? []).map((m) => m.user_id as string);
    const { data: profiles } = ids.length ? await db.from("profiles").select("id, first_name, last_name, plan, last_seen_at").in("id", ids) : { data: [] };
    const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));
    const emails = await Promise.all(ids.map((id) => db.auth.admin.getUserById(id).then((x) => x.data.user?.email ?? null)));
    rows = (data ?? []).map((m, i) => {
      const p = byId.get(m.user_id as string);
      const email = emails[i];
      return {
        userId: m.user_id as string,
        login: m.login as string,
        name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || (m.login as string),
        plan: (p?.plan as string) ?? "free",
        createdAt: m.created_at as string,
        expiresAt: (m.expires_at as string | null) ?? null,
        mustChange: !!m.must_change_password,
        emailRequired: !!m.email_required,
        email: email && !isManagedEmail(email) ? email : null,
        lastSeen: (p?.last_seen_at as string | null) ?? null,
        note: (m.note as string | null) ?? null,
      };
    });
  }
  return (
    <DashPage>
      <DashHeader lead="Comptes" hl="gérés" sub="Crée un compte avec identifiant et mot de passe, à durée indéfinie ou qui se supprime tout seul." />
      <ManagedUI rows={rows} loginUrl="/connexion" />
    </DashPage>
  );
}
