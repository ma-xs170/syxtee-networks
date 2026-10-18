import type { Metadata } from "next";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/admin/kit";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import AddChannel from "./AddChannel";
import { removeChannelAction, toggleChannelAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Chaînes", robots: { index: false } };

// Admin : chaînes affichées sur l'accueil (« Ils streament avec SYXTEE. »). Un lien ajouté ici est approuvé et visible aussitôt (accueil rafraîchi sous 5 min).
type Row = { id: string; platform: "twitch" | "kick" | "youtube"; login: string; approved: boolean; added_by: string | null; created_at: string };
const btn = "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-line-strong px-3 text-sm transition-colors hover:bg-foreground/10";

export default async function AdminChainesPage() {
  await requireAdmin("partners");
  const { data } = hasAdmin ? await createAdminClient().from("featured_channels").select("*").order("created_at", { ascending: false }).limit(300) : { data: [] };
  const rows = (data ?? []) as Row[];
  return (
    <DashPage>
      <DashHeader kicker="Clients" lead="Chaînes" sub="Les chaînes ajoutées ici s'affichent sur la page principale, sous « Ils streament avec SYXTEE. »." />
      <Tile className="mb-6">
        <TileLabel>Ajouter une chaîne</TileLabel>
        <div className="mt-4"><AddChannel /></div>
        <p className="mt-3 text-xs text-muted">Chaînes Twitch uniquement. La chaîne est approuvée tout de suite ; tu peux la masquer ou la retirer ci-dessous.</p>
      </Tile>
      <Tile>
        <TileLabel>{`${rows.length} chaîne${rows.length > 1 ? "s" : ""}`}</TileLabel>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Aucune chaîne ajoutée à la main.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm">Twitch · @{r.login}</p>
                  <p className="text-xs text-muted">{r.approved ? "Visible sur l'accueil" : "Masquée"}{r.added_by ? ` · ajoutée par ${r.added_by}` : ""}</p>
                </div>
                <div className="flex gap-2">
                  <form action={toggleChannelAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="approved" value={String(!r.approved)} />
                    <button type="submit" className={btn}>{r.approved ? "Masquer" : "Approuver"}</button>
                  </form>
                  <form action={removeChannelAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className={btn}>Retirer</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tile>
    </DashPage>
  );
}
