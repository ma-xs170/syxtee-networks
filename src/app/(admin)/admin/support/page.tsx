import type { Metadata } from "next";
import Link from "next/link";
import { DashPage } from "@/components/dashboard/ui";
import { requireStaff } from "@/lib/admin";
import { staffCards } from "@/lib/staff-data";
import { fmtAgo } from "@/lib/dashboard-data";
import { listTickets, whoIs } from "@/lib/support";
import { categoryLabel, isCategory, SUPPORT_CATEGORIES } from "@/lib/support-categories";

export const metadata: Metadata = { title: "Admin · Support", robots: { index: false } };

// Boîte de réception du support : les demandes en attente d'une réponse de l'équipe d'abord.

const TABS = [
  { id: "attente", label: "À répondre" },
  { id: "ouverts", label: "Ouvertes" },
  { id: "resolus", label: "Résolues" },
] as const;

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ etat?: string; categorie?: string }> }) {
  const { user: me } = await requireStaff("support");
  const { etat, categorie } = await searchParams;
  const tab = TABS.find((t) => t.id === etat) ?? TABS[0];
  const cat = isCategory(categorie) ? categorie : null;
  // Une catégorie à la fois (menu de gauche) : « Tous » les regroupe, chaque catégorie reste séparée.
  const every = await listTickets({ state: "all", limit: 300 });
  const all = every.filter((t) => !cat || t.category === cat);
  const waiting = (c: string | null) => every.filter((t) => (!c || t.category === c) && t.status === "open" && t.last_from === "user").length;
  const catHref = (c: string | null) => `/admin/support${[c ? `categorie=${c}` : "", tab.id !== "attente" ? `etat=${tab.id}` : ""].filter(Boolean).length ? `?${[c ? `categorie=${c}` : "", tab.id !== "attente" ? `etat=${tab.id}` : ""].filter(Boolean).join("&")}` : ""}`;
  const qs = (e: string) => `?${[cat ? `categorie=${cat}` : "", e ? `etat=${e}` : ""].filter(Boolean).join("&")}`;
  const rows = all.filter((t) => (tab.id === "resolus" ? t.status === "resolved" : tab.id === "ouverts" ? t.status === "open" : t.status === "open" && t.last_from === "user"));
  const [names, agents] = await Promise.all([whoIs(rows.map((t) => t.user_id)), staffCards(rows.map((t) => t.assigned_to).filter((x): x is string => !!x))]);
  const count = (id: (typeof TABS)[number]["id"]) => all.filter((t) => (id === "resolus" ? t.status === "resolved" : id === "ouverts" ? t.status === "open" : t.status === "open" && t.last_from === "user")).length;

  return (
    <DashPage>
      <h1 className="h-page mb-6">Support</h1>
      <nav aria-label="Catégories" className="mb-6 flex flex-wrap gap-2">
        {[{ id: null as string | null, label: "Toutes" }, ...SUPPORT_CATEGORIES].map((c) => {
          const on = (cat ?? null) === c.id;
          const n = waiting(c.id);
          return (
            <Link key={c.id ?? "all"} href={catHref(c.id)} aria-current={on ? "page" : undefined} className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${on ? "border-foreground/40 bg-foreground/[0.1] text-foreground" : "border-line text-muted hover:text-foreground"}`}>
              {c.label}
              {n > 0 && <span className="rounded-full bg-accent px-1.5 text-[11px] font-medium tabular-nums text-on-accent">{n}</span>}
            </Link>
          );
        })}
      </nav>
      <nav aria-label="Filtrer" className="mb-6 flex gap-6 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/support${qs(t.id === "attente" ? "" : t.id)}`}
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
        <ul className="divide-y divide-line overflow-hidden tile">
          {rows.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/support/${t.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-foreground/[0.04]">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{t.subject}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {names.get(t.user_id) ?? "Compte"} · {categoryLabel(t.category)} · {t.status === "resolved" ? "Résolu" : t.last_from === "user" ? "Attend ta réponse" : "Réponse envoyée"} · {t.assigned_to ? (t.assigned_to === me.id ? "Pris par toi" : `Pris par ${agents.get(t.assigned_to)?.firstName ?? "un agent"}`) : "Sans agent"} · {fmtAgo(t.updated_at)}
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
