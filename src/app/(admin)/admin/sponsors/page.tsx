import type { Metadata } from "next";
import { DashPage } from "@/components/admin/kit";
import { requireAdmin } from "@/lib/admin";
import { fmtAgo } from "@/lib/dashboard-data";
import { listApplications, listCampaigns, SPONSOR_CATEGORIES } from "@/lib/sponsors";
import { assignCampaignAction, createCampaignAction, deleteCampaignAction, setApplicationAction, toggleCampaignAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Sponsors", robots: { index: false } };

const btn = "h-9 whitespace-nowrap rounded-full border border-line-strong px-4 text-sm transition-colors hover:bg-foreground/[0.08]";
const field = "h-10 w-full rounded-lg border border-line bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";
const LABELS = { pending: "En attente", approved: "Acceptée", rejected: "Refusée" } as const;

export default async function AdminSponsorsPage() {
  await requireAdmin("partners");
  const [apps, campaigns] = await Promise.all([listApplications(), listCampaigns()]);

  return (
    <DashPage>
      <h1 className="h-page mb-8">Réseau de <em>sponsors</em></h1>

      <h2 className="mb-4 text-lg font-semibold tracking-tight">Candidatures <span className="tabular-nums text-muted">{apps.length}</span></h2>
      {apps.length === 0 ? (
        <p className="mb-10 rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">Aucune candidature.</p>
      ) : (
        <ul className="mb-10 space-y-3">
          {apps.map((a) => (
            <li key={a.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold" data-sensitive>{a.email}</p>
                  <p className="mt-1 text-xs text-muted">{LABELS[a.status]} · {fmtAgo(a.created_at)}{a.handled_by ? ` · ${a.handled_by}` : ""}</p>
                </div>
                <form action={setApplicationAction} className="flex gap-2">
                  <input type="hidden" name="id" value={a.id} />
                  {a.status !== "approved" && <button name="status" value="approved" className={btn}>Accepter</button>}
                  {a.status !== "rejected" && <button name="status" value="rejected" className={btn}>Refuser</button>}
                  {a.status !== "pending" && <button name="status" value="pending" className={btn}>Remettre en attente</button>}
                </form>
              </div>
              {a.categories.length > 0 && <p className="mt-3 flex flex-wrap gap-2">{a.categories.map((c) => <span key={c} className="rounded-full border border-line px-3 py-1 text-xs">{c}</span>)}</p>}
              {a.message && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{a.message}</p>}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-4 text-lg font-semibold tracking-tight">Campagnes <span className="tabular-nums text-muted">{campaigns.length}</span></h2>
      <form action={createCampaignAction} className="mb-6 grid gap-3 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
        <input name="brand" required maxLength={80} placeholder="Marque" aria-label="Marque" className={field} />
        <select name="category" aria-label="Catégorie" className={field} defaultValue="">
          <option value="">Catégorie</option>
          {SPONSOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input name="link" maxLength={300} placeholder="Lien https://…" aria-label="Lien" className={field} />
        <input name="code" maxLength={40} placeholder="Code de parrainage" aria-label="Code" className={field} />
        <input name="pinned_message" maxLength={300} placeholder="Message épinglé dans le chat" aria-label="Message épinglé" className={`${field} sm:col-span-2`} />
        <div className="sm:col-span-2"><button type="submit" className={`${btn} border-transparent btn-tonal font-medium`}>Créer la campagne</button></div>
      </form>

      {campaigns.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">Aucune campagne.</p>
      ) : (
        <ul className="space-y-3">
          {campaigns.map((c) => (
            <li key={c.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{c.brand} <span className="ml-2 font-mono text-[11px] uppercase tracking-wider text-muted">{c.category || "Sans catégorie"}</span></p>
                  <p className="mt-1 text-xs text-muted">{c.active ? "Active" : "Coupée"} · {c.streamers.length} streamer{c.streamers.length > 1 ? "s" : ""}{c.streamers.length ? ` : ${c.streamers.join(", ")}` : ""}</p>
                  {c.pinned_message && <p className="mt-2 text-sm">{c.pinned_message}</p>}
                </div>
                <div className="flex gap-2">
                  <form action={toggleCampaignAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button name="active" value={c.active ? "false" : "true"} className={btn}>{c.active ? "Couper" : "Réactiver"}</button>
                  </form>
                  <form action={deleteCampaignAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button aria-label={`Supprimer la campagne ${c.brand}`} className="h-9 rounded-full px-3 text-sm text-muted transition-colors hover:bg-foreground/[0.08] hover:text-bad">Supprimer</button>
                  </form>
                </div>
              </div>
              <form action={assignCampaignAction} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input name="email" required type="email" placeholder="E-mail d'un streamer accepté" aria-label="E-mail du streamer" className={`${field} max-w-xs`} />
                <button type="submit" className={btn}>Attribuer</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </DashPage>
  );
}
