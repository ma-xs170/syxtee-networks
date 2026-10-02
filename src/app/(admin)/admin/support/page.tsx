import type { Metadata } from "next";
import Link from "next/link";
import { DashPage } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { fmtAgo } from "@/lib/dashboard-data";
import { listTickets, whoIs } from "@/lib/support";

export const metadata: Metadata = { title: "Admin · Support", robots: { index: false } };

// Boîte de réception du support : les demandes en attente d'une réponse de l'équipe d'abord.

const TABS = [
  { id: "attente", label: "À répondre" },
  { id: "ouverts", label: "Ouvertes" },
  { id: "resolus", label: "Résolues" },
] as const;

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ etat?: string }> }) {
  await requireAdmin();
  const { etat } = await searchParams;
  const tab = TABS.find((t) => t.id === etat) ?? TABS[0];
  const all = await listTickets({ state: "all", limit: 300 });
  const rows = all.filter((t) => (tab.id === "resolus" ? t.status === "resolved" : tab.id === "ouverts" ? t.status === "open" : t.status === "open" && t.last_from === "user"));
  const names = await whoIs(rows.map((t) => t.user_id));
  const count = (id: (typeof TABS)[number]["id"]) => all.filter((t) => (id === "resolus" ? t.status === "resolved" : id === "ouverts" ? t.status === "open" : t.status === "open" && t.last_from === "user")).length;

  return (
    <DashPage>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">Support</h1>
      <nav aria-label="Filtrer" className="mb-6 flex gap-6 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "attente" ? "/admin/support" : `/admin/support?etat=${t.id}`}
            aria-current={t.id === tab.id ? "page" : undefined}
            className={`-mb-px border-b-2 pb-3 text-sm transition-colors ${t.id === tab.id ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {t.label}
            <span className="ml-2 tabular-nums text-muted">{count(t.id)}</span>
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">Rien dans cette liste.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {rows.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/support/${t.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-foreground/[0.04]">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{t.subject}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {names.get(t.user_id) ?? "Compte"} · {t.status === "resolved" ? "Résolu" : t.last_from === "user" ? "Attend ta réponse" : "Réponse envoyée"} · {fmtAgo(t.updated_at)}
                  </span>
                </span>
                {t.status === "open" && t.last_from === "user" && <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-on-accent">À répondre</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashPage>
  );
}
