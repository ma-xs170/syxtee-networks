import type { Metadata } from "next";
import Link from "next/link";
import { DashPage } from "@/components/dashboard/ui";
import { SupportId } from "@/components/SupportId";
import { site } from "@/lib/site";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { fmtAgo } from "@/lib/dashboard-data";
import { listTickets, ticketCounts } from "@/lib/support";
import { categoryLabel } from "@/lib/support-categories";

export const metadata: Metadata = { title: "Assistance", robots: { index: false } };

const TABS = [
  { id: "en-cours", label: "En cours", state: "open" as const },
  { id: "resolus", label: "Résolus", state: "resolved" as const },
  { id: "tous", label: "Tous", state: "all" as const },
];

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ etat?: string }> }) {
  const [user, { etat }] = await Promise.all([requireUser("/dashboard/support"), searchParams]);
  const tab = TABS.find((t) => t.id === etat) ?? TABS[0];
  const [profile, tickets, counts] = await Promise.all([getProfile(), listTickets({ userId: user.id, state: tab.state }), ticketCounts(user.id)]);

  return (
    <DashPage>
      <h1 className="h-page">Assis<em>tance</em></h1>
      <p className="mt-2 max-w-[65ch] text-sm text-muted">C&apos;est ici qu&apos;on règle tes soucis. Lis d&apos;abord la <Link href="/docs" className="text-foreground underline underline-offset-4">documentation</Link>, puis écris-nous : on te répond dans ton espace.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="canal-chat" className="bento-cell flex flex-col p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="canal-chat" className="text-xl font-semibold tracking-tight">
              Écrire à l&apos;équipe
            </h2>
            <span className="inline-flex items-center gap-2 rounded-full border border-ok/30 bg-ok/10 px-3 py-1 text-xs font-medium text-ok">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-ok" />
              Rapide (généralement sous 24 h)
            </span>
          </div>
          <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-muted">
            Décris ton problème, ajoute une capture si besoin. Un agent prend ta demande en charge, et tu suis la conversation ici. Tu es prévenu par une notification et par e-mail à chaque réponse.
          </p>
          <ul className="mt-5 grid gap-2 text-sm text-muted sm:grid-cols-2">
            {["Une demande par sujet", "Photos acceptées", "Réponse dans ton espace", "Historique conservé"].map((x) => (
              <li key={x} className="flex gap-2.5"><span aria-hidden="true" className="text-foreground">+</span>{x}</li>
            ))}
          </ul>
          <div className="mt-auto pt-6">
            <Link href="/dashboard/support/nouveau" className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover">
              <span aria-hidden="true">+</span> Nouvelle demande
            </Link>
          </div>
        </section>

        <section aria-labelledby="canal-discord" className="bento-cell flex flex-col p-5 sm:p-6">
          <h2 id="canal-discord" className="text-lg font-semibold tracking-tight">
            Communauté
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">Le Discord est le lieu de rencontre des streamers SYXTEE : échanger, partager ses astuces, suivre les nouveautés. Ce n&apos;est pas le support.</p>
          {profile?.support_id && (
            <div className="mt-5">
              <p className="mb-2 text-xs text-muted">Ton ID support, pour qu&apos;on retrouve ton compte</p>
              <SupportId id={profile.support_id} />
            </div>
          )}
          <div className="mt-auto pt-5">
            <a href={site.discord} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-line-strong px-5 text-sm font-medium transition-colors hover:bg-foreground/[0.08]">
              Rejoindre la communauté <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      </div>

      <h2 className="mb-4 mt-12 text-sm font-semibold">Mes demandes</h2>

      <nav aria-label="Filtrer les demandes" className="mb-6 flex w-max gap-1 rounded-full border border-line bg-surface p-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "en-cours" ? "/dashboard/support" : `/dashboard/support?etat=${t.id}`}
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
            Une question ? Lis d&apos;abord la{" "}
            <Link href="/docs" className="text-foreground underline underline-offset-4">
              documentation
            </Link>
            , puis ouvre une demande si besoin.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden tile !p-0">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/dashboard/support/${t.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-foreground/[0.04]">
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
    </DashPage>
  );
}
