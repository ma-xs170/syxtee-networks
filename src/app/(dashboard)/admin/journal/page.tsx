import type { Metadata } from "next";
import Link from "next/link";
import { DashHeader, DashPage, Tile } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin · Journal", robots: { index: false } };

// Journal d'audit, en lecture seule (la table refuse toute modification ou suppression, même avec la clé secrète).

const PER_PAGE = 100;
type Row = { id: number; at: string; admin_email: string; action: string; target_user: string | null; before: unknown; after: unknown };
const day = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Paris" });
const json = (v: unknown) => (v == null ? "" : JSON.stringify(v));

export default async function AdminJournalPage({ searchParams }: { searchParams: Promise<{ action?: string; compte?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const action = (sp.action ?? "").trim().slice(0, 60);
  const compte = /^[0-9a-f-]{36}$/.test(sp.compte ?? "") ? sp.compte! : "";
  let rows: Row[] = [];
  let total = 0;
  if (hasAdmin) {
    let q = createAdminClient()
      .from("admin_audit")
      .select("id, at, admin_email, action, target_user, before, after", { count: "exact" })
      .order("at", { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    if (action) q = q.ilike("action", `${action}%`);
    if (compte) q = q.eq("target_user", compte);
    const { data, count } = await q;
    rows = (data ?? []) as Row[];
    total = count ?? 0;
  }
  const link = (p: number) => `/admin/journal?${new URLSearchParams({ ...(action ? { action } : {}), ...(compte ? { compte } : {}), page: String(p) })}`;

  return (
    <DashPage>
      <DashHeader lead="Journal" hl="d'audit" sub="Chaque action admin : date, admin, cible, avant et après. Lecture seule." />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5">
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted">Action</span>
          <input name="action" defaultValue={action} placeholder="plan., account., keys.…" className="h-10 w-64 rounded-full border border-line bg-black px-4 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60" />
        </label>
        {compte && <input type="hidden" name="compte" value={compte} />}
        <button type="submit" className="h-10 whitespace-nowrap rounded-full bg-white px-5 text-sm font-medium text-black hover:bg-neutral-200">
          Filtrer
        </button>
      </form>
      <Tile>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Aucune entrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="font-mono text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  {["Date", "Admin", "Action", "Cible", "Avant", "Après"].map((h) => (
                    <th key={h} className="py-2 pr-4 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-xs text-muted">{day(r.at)}</td>
                    <td className="py-2.5 pr-4 text-xs">{r.admin_email}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">{r.action}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {r.target_user ? (
                        <Link href={`/admin/comptes/${r.target_user}`} className="underline-offset-4 hover:underline">
                          {r.target_user.slice(0, 8)}
                        </Link>
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="max-w-[260px] break-all py-2.5 pr-4 font-mono text-[11px] text-muted">{json(r.before)}</td>
                    <td className="max-w-[260px] break-all py-2.5 font-mono text-[11px] text-muted">{json(r.after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > PER_PAGE && (
          <nav aria-label="Pages" className="mt-5 flex items-center justify-between text-sm">
            {page > 1 ? <Link href={link(page - 1)}>← Plus récent</Link> : <span />}
            <span className="font-mono text-xs text-muted">
              {total} entrées · page {page}
            </span>
            {page * PER_PAGE < total ? <Link href={link(page + 1)}>Plus ancien →</Link> : <span />}
          </nav>
        )}
      </Tile>
    </DashPage>
  );
}
