import type { Metadata } from "next";
import Link from "next/link";
import { DashPage } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { fmtAgo } from "@/lib/dashboard-data";
import { listTickets, ticketCounts } from "@/lib/support";

export const metadata: Metadata = { title: "Support", robots: { index: false } };

const TABS = [
  { id: "en-cours", label: "En cours", state: "open" as const },
  { id: "resolus", label: "Résolus", state: "resolved" as const },
  { id: "tous", label: "Tous", state: "all" as const },
];

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ etat?: string }> }) {
  const user = await requireUser("/dashboard/support");
  const { etat } = await searchParams;
  const tab = TABS.find((t) => t.id === etat) ?? TABS[0];
  const [tickets, counts] = await Promise.all([listTickets({ userId: user.id, state: tab.state }), ticketCounts(user.id)]);

  return (
    <DashPage>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Support</h1>
        <Link href="/dashboard/support/nouveau" className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover">
          <span aria-hidden="true">+</span> Nouvelle demande
        </Link>
      </div>

      <nav aria-label="Filtrer les demandes" className="mb-6 flex gap-6 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "en-cours" ? "/dashboard/support" : `/dashboard/support?etat=${t.id}`}
            aria-current={t.id === tab.id ? "page" : undefined}
            className={`-mb-px border-b-2 pb-3 text-sm transition-colors ${t.id === tab.id ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {t.label}
            {t.state === "resolved" && counts.resolved > 0 && <span className="ml-2 text-muted">{counts.resolved}</span>}
            {t.state === "open" && counts.open > 0 && <span className="ml-2 text-muted">{counts.open}</span>}
          </Link>
        ))}
      </nav>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center">
          <p className="text-sm text-muted">{tab.state === "resolved" ? "Aucune demande résolue." : "Aucune demande en cours."}</p>
          <p className="mt-2 text-sm text-muted">
            Une question ? Lis d&apos;abord la{" "}
            <Link href="/docs" className="text-foreground underline underline-offset-4">
              documentation
            </Link>
            , puis ouvre une demande si besoin.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/dashboard/support/${t.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-foreground/[0.04]">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{t.subject}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {t.status === "resolved" ? "Résolu" : t.last_from === "staff" ? "Réponse de l'équipe" : "En attente de réponse"} · {fmtAgo(t.updated_at)}
                  </span>
                </span>
                {t.status === "open" && t.last_from === "staff" && <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-on-accent">Nouveau</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashPage>
  );
}
