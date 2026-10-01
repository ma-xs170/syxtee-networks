import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashHeader, DashPage, Tile } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { listAccounts, type AccountFilter } from "@/lib/admin-data";
import { PLANS, type PlanId } from "@/lib/plans";
import { hasAdmin } from "@/lib/supabase/admin";
import { normalizeSupportId } from "@/lib/support-id";

export const metadata: Metadata = { title: "Admin · Comptes", robots: { index: false } };

// Comptes clients : recherche (email, prénom, nom, ID support), filtres, tri, pagination, export CSV.
// Réservée à l'admin (404 sinon, TOTP obligatoire). Un ID support exact ouvre directement la fiche.

const PER_PAGE = 50;
const field = "h-10 rounded-full border border-line bg-background px-4 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Paris" }) : "jamais");
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function AdminComptesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const filter: AccountFilter = {
    q: one(sp.q).trim().slice(0, 100),
    plan: one(sp.plan),
    status: one(sp.status),
    live: one(sp.live) === "1",
    sort: one(sp.sort) || "created",
    page: Math.max(1, Number(one(sp.page)) || 1),
    perPage: PER_PAGE,
  };
  const exact = filter.q ? normalizeSupportId(filter.q) : null;
  const { rows, total } = hasAdmin ? await listAccounts(exact ? { ...filter, q: exact } : filter) : { rows: [], total: 0 };
  if (exact && rows.length === 1) redirect(`/admin/comptes/${rows[0].id}`);

  const qs = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: filter.q, plan: filter.plan, status: filter.status, live: filter.live ? "1" : "", sort: filter.sort, page: filter.page, ...patch })) if (v) p.set(k, String(v));
    return p.toString();
  };
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <DashPage>
      <DashHeader lead="Comptes" hl="clients" sub={`${total} compte${total > 1 ? "s" : ""}${one(sp.supprime) ? " · compte supprimé" : ""}`}>
        <a href={`/api/admin/comptes?${qs({ page: "" })}`} className="text-sm underline-offset-4 hover:underline">
          Exporter en CSV
        </a>
      </DashHeader>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5">
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted">Recherche</span>
          <input name="q" defaultValue={filter.q} placeholder="Email, prénom, nom, SYX-…" className={`${field} w-72`} />
        </label>
        <label className="grid gap-1.5">
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted">Formule</span>
          <select name="plan" defaultValue={filter.plan} className={field}>
            <option value="">Toutes</option>
            {(Object.keys(PLANS) as PlanId[]).map((p) => (
              <option key={p} value={p}>
                {PLANS[p].name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted">Statut</span>
          <select name="status" defaultValue={filter.status} className={field}>
            <option value="">Tous</option>
            <option value="active">Actifs</option>
            <option value="suspended">Suspendus</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted">Tri</span>
          <select name="sort" defaultValue={filter.sort} className={field}>
            <option value="created">Inscription récente</option>
            <option value="last_sign_in">Dernière connexion</option>
            <option value="name">Nom</option>
          </select>
        </label>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" name="live" value="1" defaultChecked={filter.live} className="h-4 w-4 accent-accent" />
          En live
        </label>
        <button type="submit" className="h-10 whitespace-nowrap rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover">
          Filtrer
        </button>
      </form>

      <Tile>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Aucun compte pour ces critères.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="font-mono text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  {["ID support", "Nom", "Email", "Formule", "Statut", "Inscrit", "Connexion"].map((h) => (
                    <th key={h} className="py-2 pr-4 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line" data-sensitive>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-accent/[0.08]">
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      <Link href={`/admin/comptes/${r.id}`} className="underline-offset-4 hover:underline">
                        {r.support_id}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "?"}</td>
                    <td className="max-w-[240px] truncate py-2.5 pr-4 text-muted">{r.email}</td>
                    <td className="py-2.5 pr-4">{PLANS[r.plan as PlanId]?.name ?? r.plan}</td>
                    <td className="py-2.5 pr-4 text-muted">{r.suspended_at ? "Suspendu" : "Actif"}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-muted">{day(r.created_at)}</td>
                    <td className="py-2.5 font-mono text-xs text-muted">{day(r.last_sign_in_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <nav aria-label="Pages" className="mt-5 flex items-center justify-between text-sm">
            {filter.page! > 1 ? <Link href={`/admin/comptes?${qs({ page: filter.page! - 1 })}`}>← Précédente</Link> : <span />}
            <span className="font-mono text-xs text-muted">
              Page {filter.page} / {pages}
            </span>
            {filter.page! < pages ? <Link href={`/admin/comptes?${qs({ page: filter.page! + 1 })}`}>Suivante →</Link> : <span />}
          </nav>
        )}
      </Tile>
    </DashPage>
  );
}
