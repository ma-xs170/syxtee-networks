import type { Metadata } from "next";
import Link from "next/link";
import { DashPage } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { fmtAgo } from "@/lib/dashboard-data";
import { listQuotes, type QuoteStatus } from "@/lib/quotes";
import { deleteQuoteAction, setQuoteStatusAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Demandes de devis", robots: { index: false } };

// Demandes de devis envoyées depuis /contact : le détail complet du projet, puis « Marquer répondue », « Clore » ou « Rouvrir ».
// La réponse se fait par e-mail (bouton « Répondre »), l'état se règle ici.

const TABS: { id: string; label: string; status: QuoteStatus }[] = [
  { id: "nouvelles", label: "Nouvelles", status: "new" },
  { id: "repondues", label: "Répondues", status: "answered" },
  { id: "closes", label: "Closes", status: "closed" },
];

const btn = "h-9 whitespace-nowrap rounded-full border border-line-strong px-4 text-sm transition-colors hover:bg-foreground/[0.08]";
const day = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{v || <span className="font-normal text-muted">Non précisé</span>}</dd>
    </div>
  );
}

const href = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

export default async function AdminQuotesPage({ searchParams }: { searchParams: Promise<{ etat?: string }> }) {
  await requireAdmin("access");
  const { etat } = await searchParams;
  const tab = TABS.find((t) => t.id === etat) ?? TABS[0];
  const all = await listQuotes();
  const rows = all.filter((q) => q.status === tab.status);

  return (
    <DashPage>
      <h1 className="h-page mb-6">Demandes de <em>devis</em></h1>
      <nav aria-label="Filtrer" className="mb-8 flex gap-7 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <Link key={t.id} href={t.id === "nouvelles" ? "/admin/devis" : `/admin/devis?etat=${t.id}`} aria-current={t.id === tab.id ? "page" : undefined} className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm transition-colors ${t.id === tab.id ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground"}`}>
            {t.label}
            <span className="ml-2 tabular-nums text-muted">{all.filter((q) => q.status === t.status).length}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">Aucune demande dans cette liste.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((q) => (
            <li key={q.id} className="rounded-2xl border border-line bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold tracking-tight">{q.name}</p>
                    <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs">{q.event_type}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted" data-sensitive>
                    {q.email}
                    {q.phone ? ` · ${q.phone}` : ""} · {fmtAgo(q.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a href={`mailto:${q.email}?subject=${encodeURIComponent(`Votre demande de devis : ${q.event_type}`)}`} className={`${btn} inline-flex items-center border-transparent bg-accent font-medium text-on-accent hover:bg-accent-hover`}>
                    Répondre
                  </a>
                  <form action={setQuoteStatusAction} className="flex gap-2">
                    <input type="hidden" name="id" value={q.id} />
                    {q.status === "new" && (
                      <button type="submit" name="status" value="answered" className={btn}>
                        Marquer répondue
                      </button>
                    )}
                    {q.status !== "closed" && (
                      <button type="submit" name="status" value="closed" className={btn}>
                        Clore
                      </button>
                    )}
                    {q.status !== "new" && (
                      <button type="submit" name="status" value="new" className={btn}>
                        Rouvrir
                      </button>
                    )}
                  </form>
                  <form action={deleteQuoteAction}>
                    <input type="hidden" name="id" value={q.id} />
                    <button type="submit" aria-label={`Supprimer la demande de ${q.name}`} className="h-9 rounded-full px-3 text-sm text-muted transition-colors hover:bg-foreground/[0.08] hover:text-bad">
                      Supprimer
                    </button>
                  </form>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 p-5 sm:p-6 lg:grid-cols-4">
                <Fact k="Lieu" v={q.location} />
                <Fact k="Date prévue" v={q.event_date} />
                <Fact k="Durée du direct" v={q.duration} />
                <Fact k="Audience attendue" v={q.audience} />
                <div className="min-w-0">
                  <dt className="text-xs text-muted">Chaîne</dt>
                  <dd className="mt-1 break-words text-sm font-medium">
                    {q.channel ? (
                      <a href={href(q.channel)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                        {q.channel}
                      </a>
                    ) : (
                      <span className="font-normal text-muted">Non précisé</span>
                    )}
                  </dd>
                </div>
                <div className="col-span-2 min-w-0 lg:col-span-3">
                  <dt className="text-xs text-muted">Besoins</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-2">
                    {q.needs.length === 0 ? <span className="text-sm text-muted">Non précisé</span> : q.needs.map((n) => <span key={n} className="rounded-full border border-line px-3 py-1 text-xs">{n}</span>)}
                  </dd>
                </div>
              </dl>
              <div className="border-t border-line p-5 sm:p-6">
                <p className="text-xs text-muted">Description du projet</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{q.message}</p>
                {q.handled_at && (
                  <p className="mt-4 text-xs text-muted">
                    {q.status === "answered" ? "Répondue" : "Close"} le {day(q.handled_at)}
                    {q.handled_by ? ` par ${q.handled_by}` : ""}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashPage>
  );
}
