import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLink } from "@/components/dashboard/ui";
import { Badge } from "@/components/NavTools";
import PlanEditor from "./PlanEditor";

// Fiche d'un compte (admin) : en-tête d'identité, onglets soulignés, puis un Résumé en trois temps :
// quatre repères (formule, serveurs, dernier direct, assistance), puis serveurs et activité à gauche, informations et notes à droite.
// La modification de la formule s'ouvre depuis le bouton « Modifier » de la carte Formule. Les autres onglets arrivent en `children`.

export type SheetTab = "resume" | "profil" | "relais" | "compte" | "historique" | "securite";
export const SHEET_TABS: { id: SheetTab; label: string }[] = [
  { id: "resume", label: "Résumé" },
  { id: "profil", label: "Profil" },
  { id: "relais", label: "Serveurs et clés" },
  { id: "compte", label: "Identité et notes" },
  { id: "historique", label: "Historique" },
  { id: "securite", label: "Sécurité" },
];

export type SheetProps = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  supportId: string;
  managed: boolean;
  suspendedAt: string | null;
  planId: string;
  planName: string;
  planUntil: string | null;
  planNote: string | null;
  maxServers: number | null;
  createdAt: string | null;
  lastSignIn: string | null;
  presence: string;
  twitch: string | null;
  /** Pays du compte : nom, drapeau et fuseau (null : non renseigné). */
  country: { name: string; flag: string; timezone: string | null } | null;
  liveCount: number;
  servers: { id: string; name: string; protocol: string; live: boolean }[];
  lastLiveAt: string | null;
  tickets: { open: number; resolved: number };
  billing: { interval: string | null; status: string | null; periodEnd: string | null; renews: boolean; manual: boolean; customerId: string | null } | null;
  note: string | null;
  activity: { id: string | number; action: string; admin: string; at: string }[];
  tab: SheetTab;
  children?: ReactNode;
};

const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }) : "jamais");
const ago = (iso: string | null | undefined) => {
  if (!iso) return "Jamais";
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 3600) return `il y a ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return `il y a ${Math.round(s / 86400)} j`;
};

function Metric({ label, value, sub, children }: { label: string; value: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
      {children}
    </div>
  );
}

export default function AccountSheet(p: SheetProps) {
  const initials = p.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const used = p.servers.length;
  const pct = p.maxServers ? Math.min(100, Math.round((used / p.maxServers) * 100)) : 0;
  const href = (t: SheetTab) => `/admin/comptes/${p.id}${t === "resume" ? "" : `?onglet=${t}`}`;
  const info: [string, string][] = [
    ["ID support", p.supportId],
    ["Inscrit le", day(p.createdAt)],
    ["Dernière connexion", day(p.lastSignIn)],
    ["Présence", p.presence],
    ["Pays", p.country ? `${p.country.flag} ${p.country.name}` : "non renseigné"],
    ["Twitch", p.twitch ? `@${p.twitch}` : "non lié"],
  ];

  return (
    <>
      <div className="mb-6">
        <ArrowLink href="/admin/comptes">Tous les comptes</ArrowLink>
      </div>

      {/* En-tête : identité à gauche, repères d'état à droite */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 items-center gap-5">
          {p.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatarUrl} alt="" width={64} height={64} className="size-16 shrink-0 rounded-2xl border border-line-strong object-cover" />
          ) : (
            <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-2xl border border-line-strong bg-surface-2 font-mono text-lg font-semibold">{initials}</span>
          )}
          <div className="min-w-0">
            <h1 className="h-page truncate">{p.name}</h1>
            <p className="mt-1 truncate text-sm text-muted" data-sensitive>{p.email}{p.country ? ` · ${p.country.flag} ${p.country.name}` : ""}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{`Formule ${p.planName}`}</Badge>
          <Badge>{p.suspendedAt ? `Suspendu le ${day(p.suspendedAt)}` : "Actif"}</Badge>
          {p.managed && <Badge>Compte géré</Badge>}
          {p.liveCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded border border-live/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground">
              <span className="live-dot" aria-hidden="true" />
              En direct
            </span>
          )}
        </div>
      </header>

      <nav aria-label="Sections du compte" className="mb-8 flex gap-7 overflow-x-auto border-b border-line">
        {SHEET_TABS.map((t) => (
          <Link key={t.id} href={href(t.id)} aria-current={t.id === p.tab ? "page" : undefined} className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm transition-colors ${t.id === p.tab ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground"}`}>
            {t.label}
          </Link>
        ))}
      </nav>

      {p.tab !== "resume" ? (
        p.children
      ) : (
        <div className="space-y-8">
          {/* 1. Quatre repères */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Formule" value={p.planName} sub={p.planUntil ? `Jusqu'au ${day(p.planUntil)}` : p.planId === "free" ? "Sans service" : "Sans échéance"}>
              <PlanEditor userId={p.id} plan={p.planId} until={p.planUntil} note={p.planNote} />
            </Metric>
            <Metric label="Serveurs actifs" value={<span className="font-mono tabular-nums">{used}<span className="text-base font-normal text-muted"> / {p.maxServers ?? "∞"}</span></span>} sub={p.liveCount > 0 ? `${p.liveCount} en direct` : "Aucun en direct"}>
              {p.maxServers ? (
                <span className="mt-3 block h-1 overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
                  <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${pct}%` }} />
                </span>
              ) : null}
            </Metric>
            <Metric label="Dernier direct" value={ago(p.lastLiveAt)} sub={p.lastLiveAt ? day(p.lastLiveAt) : "Aucun direct enregistré"} />
            <Metric label="Assistance" value={<span className="font-mono tabular-nums">{p.tickets.open}<span className="text-base font-normal text-muted"> ouverte{p.tickets.open > 1 ? "s" : ""}</span></span>} sub={`${p.tickets.resolved} résolue${p.tickets.resolved > 1 ? "s" : ""}`} />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* 2a. Serveurs et activité */}
            <div className="min-w-0 space-y-8">
              <section aria-labelledby="serveurs" className="rounded-2xl border border-line bg-surface">
                <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                  <h2 id="serveurs" className="text-sm font-semibold">Serveurs</h2>
                  <ArrowLink href={href("relais")}>Gérer</ArrowLink>
                </div>
                {p.servers.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted">Aucun serveur actif.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {p.servers.slice(0, 6).map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${r.live ? "bg-live" : "bg-foreground/25"}`} />
                          <span className="truncate font-medium">{r.name}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          {r.live && <span className="text-xs text-live">En direct</span>}
                          <span className="font-mono text-xs uppercase text-muted">{r.protocol}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="activite">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 id="activite" className="text-sm font-semibold">Activité récente</h2>
                  <ArrowLink href={href("historique")}>Tout voir</ArrowLink>
                </div>
                {p.activity.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-muted">Aucune action enregistrée.</p>
                ) : (
                  <ol className="space-y-5 border-l border-line pl-6">
                    {p.activity.map((l) => (
                      <li key={l.id} className="relative">
                        <span aria-hidden="true" className="absolute -left-[30px] top-1.5 size-2.5 rounded-full border border-line-strong bg-background" />
                        <p className="font-mono text-xs">{l.action}</p>
                        <p className="mt-0.5 text-xs text-muted">{l.admin} · {day(l.at)}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>

            {/* 2b. Informations, abonnement et note */}
            <aside className="min-w-0 space-y-8">
              <section aria-labelledby="infos" className="rounded-2xl border border-line bg-surface p-5">
                <h2 id="infos" className="text-sm font-semibold">Informations</h2>
                <dl className="mt-3 divide-y divide-line text-sm">
                  {info.map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                      <dt className="shrink-0 text-muted">{k}</dt>
                      <dd className="min-w-0 truncate text-right font-medium" data-sensitive>{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section aria-labelledby="abo" className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="abo" className="text-sm font-semibold">Abonnement</h2>
                  {p.billing?.customerId && (
                    <a href={`https://dashboard.stripe.com/customers/${p.billing.customerId}`} target="_blank" rel="noreferrer" className="text-xs text-muted underline underline-offset-4 hover:text-foreground">Stripe ↗</a>
                  )}
                </div>
                {!p.billing?.status ? (
                  <p className="mt-3 text-sm text-muted">Aucun abonnement Stripe.</p>
                ) : (
                  <div className="mt-3 grid gap-1 text-sm">
                    <p>{p.billing.interval === "year" ? "Annuel" : "Mensuel"} · <span className="font-mono text-xs uppercase">{p.billing.status}</span></p>
                    {p.billing.periodEnd && <p className="text-muted">{`${p.billing.renews ? "Prochain prélèvement le" : "Fin le"} ${day(p.billing.periodEnd)}`}</p>}
                    {p.billing.renews && p.billing.manual && (
                      <p role="alert" className="mt-2 text-bad">Formule {p.planName} attribuée à la main, mais l&apos;abonnement Stripe continue : résilie-le dans Stripe.</p>
                    )}
                  </div>
                )}
              </section>

              {p.note && (
                <section aria-labelledby="note" className="rounded-2xl border border-line bg-surface p-5">
                  <h2 id="note" className="text-sm font-semibold">Note interne</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{p.note}</p>
                </section>
              )}

              <div className="grid gap-2">
                <a href={`mailto:${p.email}`} className="btn btn-secondary w-full">Écrire au client</a>
                <Link href={href("securite")} className="btn btn-secondary w-full">Mot de passe et sécurité</Link>
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
