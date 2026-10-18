import type { Metadata } from "next";
import { DashHeader, DashPage, Tile } from "@/components/admin/kit";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin · Erreurs", robots: { index: false } };

// Journal des erreurs du site : une ligne par erreur distincte (serveur, action, route, navigateur) avec son compteur.
// Alimenté par instrumentation.ts et /api/log-error ; 30 jours gardés. Le « code » est celui que le visiteur voit sur la page d'erreur.

type Row = { id: number; source: string; message: string; digest: string | null; path: string | null; method: string | null; count: number; first_at: string; last_at: string };
const day = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Paris" });

export default async function AdminErreursPage() {
  await requireAdmin("security");
  let rows: Row[] = [];
  let failed = false;
  if (hasAdmin) {
    const { data, error } = await createAdminClient().from("error_logs").select("id, source, message, digest, path, method, count, first_at, last_at").order("last_at", { ascending: false }).limit(200);
    if (error) failed = true;
    rows = (data ?? []) as Row[];
  }

  return (
    <DashPage>
      <DashHeader lead="Erreurs" hl="du site" sub="Chaque erreur distincte avec son nombre d'occurrences. 30 jours gardés. Le code est celui affiché au visiteur." />
      <Tile>
        {failed ? (
          <p className="text-sm text-bad">Table error_logs introuvable : applique la migration 0054_garde_fous.sql.</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">Aucune erreur enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  {["Dernière", "Origine", "Page", "Message", "Code", "Fois"].map((h) => (
                    <th key={h} className="py-2 pr-4 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-xs text-muted">{day(r.last_at)}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">{r.source}</td>
                    <td className="max-w-[220px] break-all py-2.5 pr-4 font-mono text-xs">{r.method ? `${r.method} ` : ""}{r.path ?? ""}</td>
                    <td className="max-w-[360px] break-words py-2.5 pr-4 text-xs">{r.message}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-muted">{r.digest ?? ""}</td>
                    <td className="py-2.5 font-mono text-xs">{r.count}</td>
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
