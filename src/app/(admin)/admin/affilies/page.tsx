import type { Metadata } from "next";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { isManagedEmail } from "@/lib/managed";
import { AFFILIATE_COLUMNS, affiliateUrl, type Affiliate } from "@/lib/affiliates";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import InviteAffiliate from "./InviteAffiliate";
import { removeAffiliateAction, resendAffiliateAction, toggleAffiliateAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Affiliés", robots: { index: false } };

// Admin : Affiliés > Liste. Invitation par e-mail ; l'affilié retrouve son lien et le kit dans son dashboard (menu « Affilié »).
const btn = "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-line-strong px-3 text-sm transition-colors hover:bg-foreground/10";
const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Paris" });

export default async function AdminAffiliesPage() {
  await requireAdmin("partners");
  const { data } = hasAdmin ? await createAdminClient().from("affiliates").select(AFFILIATE_COLUMNS).order("created_at", { ascending: false }).limit(300) : { data: [] };
  const rows = (data ?? []) as Affiliate[];
  return (
    <DashPage>
      <DashHeader lead="Affiliés" hl="Liste" sub="Invite un streamer : il reçoit son lien à partager et le kit par e-mail, et retrouve tout dans l'espace « Affilié » de son dashboard." />
      <Tile className="mb-6">
        <TileLabel>Envoyer une invitation</TileLabel>
        <div className="mt-4"><InviteAffiliate /></div>
        <p className="mt-3 text-xs text-muted">Le pseudo et le nom d&apos;URL se déduisent de l&apos;adresse s&apos;ils sont vides ; l&apos;affilié peut les changer ensuite.</p>
      </Tile>
      <Tile>
        <TileLabel>{`${rows.length} affilié${rows.length > 1 ? "s" : ""}`}</TileLabel>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Aucun affilié pour l&apos;instant.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.display_name} <span className="font-normal text-muted" data-sensitive>· {isManagedEmail(r.email) ? `identifiant ${r.email.split("@")[0]}` : r.email}</span></p>
                  <p className="truncate font-mono text-xs text-muted">{affiliateUrl(r.slug)}</p>
                  <p className="text-xs text-muted">
                    {r.active ? (r.user_id ? "Compte relié" : "Invitation en attente de connexion") : "Désactivé"} · {r.clicks} clic{r.clicks > 1 ? "s" : ""} · invité le {day(r.created_at)}{r.invited_by ? ` par ${r.invited_by}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isManagedEmail(r.email) && (
                    <form action={resendAffiliateAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className={btn}>Renvoyer l&apos;e-mail</button>
                    </form>
                  )}
                  <form action={toggleAffiliateAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="active" value={String(!r.active)} />
                    <button type="submit" className={btn}>{r.active ? "Désactiver" : "Réactiver"}</button>
                  </form>
                  <form action={removeAffiliateAction}>
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
