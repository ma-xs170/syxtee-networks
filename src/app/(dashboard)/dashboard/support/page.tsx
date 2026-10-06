import type { Metadata } from "next";
import Link from "next/link";
import { DashPage } from "@/components/dashboard/ui";
import { DiscordTicketButton, SupportId } from "@/components/SupportId";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { fmtAgo } from "@/lib/dashboard-data";
import { listTickets, ticketCounts } from "@/lib/support";

export const metadata: Metadata = { title: "Support", robots: { index: false } };

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
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Support</h1>
      <p className="mt-2 max-w-[65ch] text-sm text-muted">Choisis comment nous écrire. Pour une question de la documentation, lis d&apos;abord la <Link href="/docs" className="text-foreground underline underline-offset-4">documentation</Link>.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <section aria-labelledby="canal-discord" className="flex flex-col rounded-2xl border border-line-strong bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="canal-discord" className="text-lg font-semibold tracking-tight">
              Discord
            </h2>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-on-accent">Recommandé</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">Le plus rapide : l&apos;équipe et la communauté répondent sur le serveur. Donne ton ID support dans le ticket pour qu&apos;on retrouve ton compte.</p>
          {profile?.support_id && (
            <div className="mt-5">
              <SupportId id={profile.support_id} />
            </div>
          )}
          <div className="mt-auto pt-5">{profile?.support_id ? <DiscordTicketButton id={profile.support_id} /> : null}</div>
        </section>

        <section aria-labelledby="canal-chat" className="flex flex-col rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <h2 id="canal-chat" className="text-lg font-semibold tracking-tight">
            Support (chat)
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">Une demande écrite, suivie ici même : tu retrouves la réponse de l&apos;équipe dans la liste ci-dessous, sans passer par Discord.</p>
          <div className="mt-auto pt-5">
            <Link href="/dashboard/support/nouveau" className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full border border-line-strong px-5 text-sm font-medium transition-colors hover:bg-foreground/10">
              <span aria-hidden="true">+</span> Nouvelle demande
            </Link>
          </div>
        </section>
      </div>

      <h2 className="mb-4 mt-12 text-sm font-semibold">Mes demandes</h2>

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
