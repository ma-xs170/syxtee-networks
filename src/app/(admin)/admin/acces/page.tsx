import type { Metadata } from "next";
import Link from "next/link";
import { DashPage } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { listRequests, type AccessRequest } from "@/lib/access";
import { fmtAgo } from "@/lib/dashboard-data";
import { decideAccessAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Demandes d'accès", robots: { index: false } };

// Demandes d'accès envoyées depuis /acces : le détail complet, puis Approuver (email avec bouton de création de compte,
// accès Partenaire automatique) ou Refuser.

const TABS = [
  { id: "attente", label: "En attente", status: "pending" as const },
  { id: "approuvees", label: "Approuvées", status: "approved" as const },
  { id: "refusees", label: "Refusées", status: "refused" as const },
];

const PLATFORM: Record<AccessRequest["platform"], string> = { twitch: "Twitch", kick: "Kick", youtube: "YouTube", tiktok: "TikTok", autre: "Autre" };
const href = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="mt-0.5 break-words text-sm">{v || "Non précisé"}</dd>
    </div>
  );
}

export default async function AdminAccessPage({ searchParams }: { searchParams: Promise<{ etat?: string }> }) {
  await requireAdmin();
  const { etat } = await searchParams;
  const tab = TABS.find((t) => t.id === etat) ?? TABS[0];
  const all = await listRequests();
  const rows = all.filter((r) => r.status === tab.status);

  return (
    <DashPage>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">Demandes d&apos;accès</h1>
      <nav aria-label="Filtrer" className="mb-6 flex gap-6 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "attente" ? "/admin/acces" : `/admin/acces?etat=${t.id}`}
            aria-current={t.id === tab.id ? "page" : undefined}
            className={`-mb-px border-b-2 pb-3 text-sm transition-colors ${t.id === tab.id ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {t.label}
            <span className="ml-2 tabular-nums text-muted">{all.filter((r) => r.status === t.status).length}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">Aucune demande dans cette liste.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold tracking-tight">
                    {r.first_name} {r.last_name}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {r.email} · {fmtAgo(r.created_at)}
                  </p>
                </div>
                {r.status === "pending" ? (
                  <form action={decideAccessAction} className="flex gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" name="decision" value="refused" className="h-10 whitespace-nowrap rounded-lg border border-line-strong px-4 text-sm transition-colors hover:bg-foreground/10">
                      Refuser
                    </button>
                    <button type="submit" name="decision" value="approved" className="h-10 whitespace-nowrap rounded-lg bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover">
                      Approuver
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-muted">
                    {r.status === "approved" ? "Approuvée" : "Refusée"}
                    {r.decided_by ? ` par ${r.decided_by}` : ""}
                    {r.status === "approved" && (r.redeemed_at ? " · compte créé, accès actif" : " · compte pas encore créé")}
                  </p>
                )}
              </div>
              <dl className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted">Chaîne</dt>
                  <dd className="mt-0.5 break-words text-sm">
                    <a href={href(r.channel_url)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                      {r.channel_url}
                    </a>
                  </dd>
                </div>
                <Row k="Plateforme" v={PLATFORM[r.platform]} />
                <Row k="Audience" v={r.audience} />
                <Row k="Matériel" v={r.devices} />
              </dl>
              {r.message && <p className="mt-5 whitespace-pre-wrap rounded-xl border border-line bg-background p-4 text-sm leading-relaxed">{r.message}</p>}
            </li>
          ))}
        </ul>
      )}
    </DashPage>
  );
}
