import type { Metadata } from "next";
import Link from "next/link";
import { Column } from "@/components/dashboard/kit";
import { requireUser } from "@/lib/auth/dal";
import { fmtAgo } from "@/lib/dashboard-data";
import { listTickets, ticketCounts } from "@/lib/support";
import { categoryLabel } from "@/lib/support-categories";

export const metadata: Metadata = { title: "Support", robots: { index: false } };

const TABS = [
  { id: "en-cours", label: "En cours", state: "open" as const },
  { id: "resolus", label: "Résolus", state: "resolved" as const },
  { id: "tous", label: "Tous", state: "all" as const },
];

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ etat?: string }> }) {
  const [user, { etat }] = await Promise.all([requireUser("/dashboard/aide"), searchParams]);
  const tab = TABS.find((t) => t.id === etat) ?? TABS[0];
  const [tickets, counts] = await Promise.all([listTickets({ userId: user.id, state: tab.state }), ticketCounts(user.id)]);

  return (
    <Column>
      <header className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-3">
        <h1 className="dk-h1">Support</h1>
        <span className="inline-flex items-center gap-2 rounded-full border border-ok/30 bg-ok/10 px-3 py-1 text-xs font-medium text-ok">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-ok" />
          Rapide (généralement sous 24 h)
        </span>
      </header>

      <Link href="/dashboard/aide/nouveau" className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full btn-tonal px-6 text-sm font-medium transition-colors">
        <span aria-hidden="true">+</span> Nouvelle demande
      </Link>

      <h2 className="mb-4 mt-10 text-sm font-semibold">Mes demandes</h2>

      <nav aria-label="Filtrer les demandes" className="mb-6 flex w-max gap-1 rounded-full border border-line bg-surface p-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "en-cours" ? "/dashboard/aide" : `/dashboard/aide?etat=${t.id}`}
            aria-current={t.id === tab.id ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${t.id === tab.id ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"}`}
          >
            {t.label}
            {t.state === "resolved" && counts.resolved > 0 && <span className="ml-2 text-muted">{counts.resolved}</span>}
            {t.state === "open" && counts.open > 0 && <span className="ml-2 text-muted">{counts.open}</span>}
          </Link>
        ))}
      </nav>

      {tickets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line-strong p-10 text-center">
          <p className="text-sm text-muted">{tab.state === "resolved" ? "Aucune demande résolue." : "Aucune demande en cours."}</p>
          <p className="mt-2 text-sm text-muted">
            Une question ? Ouvre une demande, on te répond dans ton espace.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden tile !p-0">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/dashboard/aide/${t.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-foreground/[0.04]">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{t.subject}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {categoryLabel(t.category)} · {t.status === "resolved" ? "Résolu" : t.last_from === "staff" ? "Réponse de l'équipe" : "En attente de réponse"} · {fmtAgo(t.updated_at)}
                  </span>
                </span>
                {t.status === "open" && t.last_from === "staff" && <span className="shrink-0 rounded-full bg-ok/15 px-2.5 py-0.5 text-xs font-medium text-ok">Nouveau</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Column>
  );
}
