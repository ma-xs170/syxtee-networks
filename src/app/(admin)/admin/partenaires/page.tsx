import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLink, DashHeader, DashPage, Tile } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin · Partenaires", robots: { index: false } };

// Admin : comptes en formule Partenaire, avec l'échéance et la note. Réservée à ADMIN_EMAILS (404 sinon).

type Row = { support_id: string; first_name: string | null; last_name: string | null; twitch_login: string | null; plan_until: string | null; plan_note: string | null };

/** Échéance dans moins de 7 jours (mise en avant). */
const endsSoon = (iso: string | null) => !!iso && Date.parse(iso) - Date.now() < 7 * 86_400_000;

const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" });

export default async function AdminPartenairesPage() {
  await requireAdmin();
  const { data } = hasAdmin
    ? await createAdminClient()
        .from("profiles")
        .select("support_id, first_name, last_name, twitch_login, plan_until, plan_note")
        .eq("plan", "partner")
        .order("plan_until", { ascending: true, nullsFirst: false })
        .limit(500)
    : { data: [] };
  const rows = (data ?? []) as Row[];

  return (
    <DashPage>
      <DashHeader lead="Admin" hl="Partenaires" sub={`${rows.length} compte${rows.length > 1 ? "s" : ""} en formule Partenaire.`}>
        <ArrowLink href="/admin/comptes">Comptes</ArrowLink>
      </DashHeader>
      <Tile>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Aucun partenaire. Attribue la formule depuis la fiche d&apos;un compte.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="font-mono text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="py-2 pr-4 font-normal">ID support</th>
                  <th className="py-2 pr-4 font-normal">Nom</th>
                  <th className="py-2 pr-4 font-normal">Twitch</th>
                  <th className="py-2 pr-4 font-normal">Expire</th>
                  <th className="py-2 font-normal">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const soon = endsSoon(r.plan_until);
                  return (
                    <tr key={r.support_id}>
                      <td className="py-2.5 pr-4 font-mono text-xs">
                        <Link href={`/admin/comptes?q=${r.support_id}`} className="underline-offset-4 hover:underline">
                          {r.support_id}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "?"}</td>
                      <td className="py-2.5 pr-4 text-muted">{r.twitch_login ? `@${r.twitch_login}` : ""}</td>
                      <td className={`py-2.5 pr-4 font-mono text-xs ${soon ? "text-foreground" : "text-muted"}`}>{r.plan_until ? day(r.plan_until) : "Sans fin"}</td>
                      <td className="py-2.5 text-muted">{r.plan_note ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tile>
    </DashPage>
  );
}
