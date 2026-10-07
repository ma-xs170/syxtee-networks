import type { Metadata } from "next";
import Link from "next/link";
import { DashHeader, DashPage, Tile } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import EraseMeasures from "./EraseMeasures";

export const metadata: Metadata = { title: "Admin · Carte", robots: { index: false } };

// Carte communautaire : plus gros contributeurs sur 30 jours. Modération : effacer toutes les mesures d'un compte
// (le Core les retire puis recalcule les hexagones). Pas encore de signalement de mesures par les utilisateurs.

type Row = { user_id: string; support_id: string | null; first_name: string | null; last_name: string | null; measures: number; hexes: number; last_at: string };
const nf = new Intl.NumberFormat("fr-FR");
const day = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function AdminCartePage() {
  await requireAdmin("relays");
  const { data, error } = hasAdmin ? await createAdminClient().rpc("admin_top_contributors", { p_days: 30, p_limit: 100 }) : { data: [], error: null };
  if (error) console.error("admin_top_contributors", error.message);
  const rows = (data ?? []) as Row[];

  return (
    <DashPage>
      <DashHeader lead="Carte" hl="communautaire" sub="Contributeurs des 30 derniers jours. Une série suspecte (beaucoup de mesures sur peu d'hexagones) se modère ici." />
      <Tile>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Aucune mesure sur 30 jours.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  {["Compte", "Mesures", "Hexagones", "Dernière", ""].map((h) => (
                    <th key={h} className="py-2 pr-4 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.user_id}>
                    <td className="py-2.5 pr-4">
                      <Link href={`/admin/comptes/${r.user_id}`} className="underline-offset-4 hover:underline">
                        {[r.first_name, r.last_name].filter(Boolean).join(" ") || r.support_id || "compte"}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums">{nf.format(r.measures)}</td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums">{nf.format(r.hexes)}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-muted">{day(r.last_at)}</td>
                    <td className="py-2.5 text-right">
                      <EraseMeasures userId={r.user_id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tile>
    </DashPage>
  );
}
