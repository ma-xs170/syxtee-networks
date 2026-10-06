import type { Metadata } from "next";
import { DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin · Équipe", robots: { index: false } };

// Équipe : les comptes admin. La liste vient de la variable ADMIN_EMAILS (Vercel), jamais écrite dans le code : pour
// ajouter un admin, ajoute son adresse (séparée par une virgule) puis redéploie. Il doit activer la double authentification.

export default async function AdminTeamPage() {
  await requireAdmin();
  const emails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const { data } = hasAdmin
    ? await createAdminClient().from("profiles").select("support_id, first_name, last_name, twitch_display_name").eq("role", "admin").limit(50)
    : { data: [] };

  return (
    <DashPage>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">Équipe</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Tile>
          <TileLabel>Admins</TileLabel>
          <ul className="mt-4 divide-y divide-line">
            {emails.map((e) => {
              const [local, domain] = e.split("@");
              return (
                <li key={e} className="py-3 text-sm">
                  <span data-sensitive>{`${local.slice(0, 2)}•••@${domain}`}</span>
                </li>
              );
            })}
            {emails.length === 0 && <li className="py-3 text-sm text-muted">Aucun admin configuré.</li>}
          </ul>
          {(data ?? []).length > 0 && (
            <p className="mt-4 text-xs text-muted">
              {(data ?? []).length} compte{(data ?? []).length > 1 ? "s" : ""} avec le rôle admin en base.
            </p>
          )}
        </Tile>
        <Tile>
          <TileLabel>Ajouter un admin</TileLabel>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted">
            <li>
              Dans Vercel, ouvre <span className="text-foreground">Settings, Environment Variables</span> et ajoute l&apos;adresse du nouvel admin à{" "}
              <code className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs text-foreground">ADMIN_EMAILS</code>, séparée par une virgule.
            </li>
            <li>Redéploie le site.</li>
            <li>La personne se connecte avec cette adresse, vérifiée, puis active la double authentification (TOTP) sur la page qui s&apos;ouvre.</li>
            <li>Elle voit alors cet espace, répond au support et sa réponse est journalisée avec son adresse.</li>
          </ol>
        </Tile>
      </div>
    </DashPage>
  );
}
