import type { Metadata } from "next";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import CodesForm from "./CodesUI";

export const metadata: Metadata = { title: "Admin · Encodeurs", robots: { index: false } };

type Row = { code: string; months: number; created_at: string; order_ref: string | null; buyer_id: string | null; used_by: string | null; used_at: string | null };
const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" });

// Codes d'activation de l'Encodeur : un code = un compte, une seule fois. Les achats en boutique créent leur code tout seuls (webhook).
export default async function AdminEncodeursPage() {
  await requireAdmin("accounts");
  const { data } = hasAdmin ? await createAdminClient().from("encoder_activation_codes").select("code, months, created_at, order_ref, buyer_id, used_by, used_at").order("created_at", { ascending: false }).limit(300) : { data: [] };
  const rows = (data ?? []) as Row[];
  const used = rows.filter((r) => r.used_by).length;
  return (
    <DashPage>
      <DashHeader lead="Codes" hl="d'activation" sub={`${rows.length} code${rows.length > 1 ? "s" : ""}, dont ${used} utilisé${used > 1 ? "s" : ""}.`} />
      <div className="grid gap-4">
        <Tile>
          <TileLabel>Générer des codes</TileLabel>
          <div className="mt-5"><CodesForm /></div>
        </Tile>
        <Tile>
          <TileLabel>Tous les codes</TileLabel>
          {rows.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Aucun code pour l&apos;instant.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead><tr className="text-muted"><th className="pb-3 font-normal">Code</th><th className="pb-3 font-normal">Mois</th><th className="pb-3 font-normal">Créé le</th><th className="pb-3 font-normal">Origine</th><th className="pb-3 text-right font-normal">État</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.code} className="border-t border-line">
                      <td className="py-3 font-mono tabular-nums">{r.code}</td>
                      <td className="py-3 tabular-nums">{r.months}</td>
                      <td className="py-3 text-muted">{day(r.created_at)}</td>
                      <td className="py-3 text-muted">{r.buyer_id ? "Commande boutique" : r.order_ref ?? "Équipe"}</td>
                      <td className="py-3 text-right">{r.used_by ? <span className="text-muted">Utilisé le {r.used_at ? day(r.used_at) : ""}</span> : <span className="text-ok">Libre</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tile>
      </div>
    </DashPage>
  );
}
