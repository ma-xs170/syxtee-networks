import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLink, DashHeader, DashPage, SectionTabs, Tile, TileLabel } from "@/components/dashboard/ui";
import { Badge } from "@/components/NavTools";
import { SupportId } from "@/components/SupportId";
import { requireAdmin } from "@/lib/admin";
import { liveNow } from "@/lib/admin-data";
import { audit } from "@/lib/plan-admin";
import { renews } from "@/lib/billing";
import { PLANS, type PlanId } from "@/lib/plans";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import { CutButton, DeleteForm, IdentityForm, KeysForms, NoteForm, SuspendForm } from "../AdminForms";
import PlanForms from "../PlanForms";

export const metadata: Metadata = { title: "Admin · Compte", robots: { index: false } };

const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }) : "jamais";

const TABS = [
  { id: "resume", label: "Résumé" },
  { id: "relais", label: "Relais et clés" },
  { id: "compte", label: "Identité et notes" },
  { id: "historique", label: "Historique" },
  { id: "securite", label: "Zone sensible" },
] as const;

export default async function AdminAccountPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ onglet?: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { onglet } = await searchParams;
  const tab = TABS.find((t) => t.id === onglet)?.id ?? "resume";
  if (!hasAdmin || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = createAdminClient();
  const [{ data: p }, { data: u }, { data: relays }, { data: notes }, { data: log }, live] = await Promise.all([
    db.from("profiles").select("*").eq("id", id).maybeSingle(),
    db.auth.admin.getUserById(id),
    db.from("relays").select("id, name, protocol, server, mode, archived, created_at, last_live_at").eq("user_id", id).order("created_at"),
    db.from("admin_notes").select("id, author, body, at").eq("user_id", id).order("at", { ascending: false }).limit(50),
    db.from("admin_audit").select("id, at, admin_email, action").eq("target_user", id).order("at", { ascending: false }).limit(50),
    liveNow(),
  ]);
  if (!p || !u.user) notFound();
  // Consultation d'un compte : tracée (données personnelles).
  await audit(admin.email!, "account.view", id, null, null);
  const liveIds = new Set(live.filter((l) => l.user_id === id).map((l) => l.relay_id));
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Sans nom";

  const plan = PLANS[p.plan as PlanId]?.name ?? p.plan;
  const active = (relays ?? []).filter((r) => !r.archived);
  const archived = (relays ?? []).filter((r) => r.archived);
  const facts: [string, string][] = [
    ["Inscrit le", day(p.created_at)],
    ["Dernière connexion", day(u.user.last_sign_in_at)],
    ["Relais", `${active.length} actif${active.length > 1 ? "s" : ""}${liveIds.size ? ` · ${liveIds.size} en direct` : ""}`],
    ["Twitch", p.twitch_login ? `@${p.twitch_login}` : "non lié"],
  ];

  // Fiche compte : en-tête et repères toujours visibles, puis un onglet par sujet (adresse ?onglet=) pour ne montrer qu'une chose à la fois.
  return (
    <DashPage>
      <DashHeader lead="Compte" hl={name} sub={u.user.email ?? undefined}>
        <ArrowLink href="/admin/comptes">Tous les comptes</ArrowLink>
      </DashHeader>

      <div className="-mt-4 mb-6 flex flex-wrap items-center gap-2">
        <Badge>{`Formule ${plan}`}</Badge>
        <Badge>{p.suspended_at ? `Suspendu le ${day(p.suspended_at)}` : "Actif"}</Badge>
        {p.plan_until && <Badge>{`Jusqu'au ${day(p.plan_until)}`}</Badge>}
        {liveIds.size > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded border border-live/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground">
            <span className="live-dot" aria-hidden="true" />
            En direct
          </span>
        )}
      </div>

      <dl className="mb-8 grid grid-cols-2 gap-x-6 gap-y-5 rounded-2xl border border-line p-5 sm:p-6 lg:grid-cols-4">
        {facts.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="mt-1.5 truncate text-sm" data-sensitive>
              {v}
            </dd>
          </div>
        ))}
      </dl>

      <SectionTabs label="Sections du compte" current={`/admin/comptes/${id}${tab === "resume" ? "" : `?onglet=${tab}`}`} tabs={TABS.map((t) => ({ label: t.label, href: `/admin/comptes/${id}${t.id === "resume" ? "" : `?onglet=${t.id}`}` }))} />

      {tab === "resume" && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Tile aria-labelledby="formule">
            <TileLabel id="formule">Formule</TileLabel>
            <div className="mt-4">
              <PlanForms key={`${p.plan}:${p.plan_until}`} userId={id} plan={p.plan} until={p.plan_until} note={p.plan_note} />
            </div>
          </Tile>

          <Tile aria-labelledby="abo">
            <TileLabel
              id="abo"
              right={
                p.stripe_customer_id ? (
                  <a href={`https://dashboard.stripe.com/customers/${p.stripe_customer_id}`} target="_blank" rel="noreferrer" className="text-xs text-muted underline underline-offset-4 hover:text-foreground">
                    Stripe ↗
                  </a>
                ) : undefined
              }
            >
              Abonnement
            </TileLabel>
            {!p.billing_status ? (
              <p className="mt-4 text-sm text-muted">Aucun abonnement Stripe.</p>
            ) : (
              <div className="mt-4 grid gap-1 text-sm">
                <p>
                  {p.billing_interval === "year" ? "Annuel" : "Mensuel"} · <span className="font-mono text-xs uppercase">{p.billing_status}</span>
                </p>
                {p.billing_period_end && (
                  <p className="text-muted">{`${renews(p) ? "Prochain prélèvement le" : "Fin le"} ${day(p.billing_period_end)}`}</p>
                )}
                {renews(p) && ["partner", "beta", "admin"].includes(p.plan) && (
                  <p role="alert" className="mt-2 text-red-300">
                    Formule {plan} attribuée à la main, mais l&apos;abonnement Stripe continue : résilie-le dans Stripe pour qu&apos;il ne paie pas pour rien.
                  </p>
                )}
              </div>
            )}
          </Tile>

        </div>
      )}

      {tab === "relais" && (
        <div className="grid max-w-3xl gap-4">
          <Tile aria-labelledby="relais">
            <TileLabel id="relais">{`Relais · ${active.length}`}</TileLabel>
            {!active.length ? (
              <p className="mt-4 text-sm text-muted">Aucun relais actif.</p>
            ) : (
              <ul className="mt-4 grid gap-2">
                {active.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm">
                        {liveIds.has(r.id) && <span className="live-dot" aria-label="En direct" />}
                        <span className="truncate">{r.name}</span>
                      </p>
                      <p className="mt-0.5 font-mono text-xs uppercase text-muted">
                        {r.protocol} · {r.server} · dernier direct {day(r.last_live_at)}
                      </p>
                    </div>
                    <CutButton userId={id} relayId={r.id} />
                  </li>
                ))}
              </ul>
            )}
            {archived.length > 0 && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted hover:text-foreground">{`${archived.length} relais archivé${archived.length > 1 ? "s" : ""}`}</summary>
                <ul className="mt-2 grid gap-1 pl-4 text-muted">
                  {archived.map((r) => (
                    <li key={r.id}>
                      {r.name} <span className="font-mono text-xs uppercase">{r.protocol}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="mt-6 border-t border-line pt-5">
              <p className="mb-3 text-xs text-muted">Clés de stream</p>
              <KeysForms userId={id} />
            </div>
          </Tile>

        </div>
      )}

      {tab === "compte" && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
          <Tile aria-labelledby="identite">
            <TileLabel id="identite">Identité</TileLabel>
            <div className="mt-4">
              <IdentityForm userId={id} first={p.first_name ?? ""} last={p.last_name ?? ""} email={u.user.email ?? ""} />
            </div>
          </Tile>
          <Tile aria-labelledby="ids">
            <TileLabel id="ids">Identifiants</TileLabel>
            <div className="mt-4 grid gap-3 text-sm">
              <SupportId id={p.support_id} compact />
              <p className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono uppercase tracking-[0.1em] text-muted">ID interne</span>
                <span className="break-all font-mono" data-sensitive>
                  {id}
                </span>
              </p>
            </div>
          </Tile>
          </div>
          <Tile aria-labelledby="notes">
            <TileLabel id="notes">{`Notes internes · ${notes?.length ?? 0}`}</TileLabel>
            <div className="mt-4">
              <NoteForm userId={id} />
            </div>
            {!!notes?.length && (
              <ul className="mt-5 grid gap-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-xl border border-line px-4 py-3 text-sm">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-2 font-mono text-xs text-muted">
                      {n.author} · {day(n.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Tile>

        </div>
      )}

      {tab === "historique" && (
        <div className="max-w-3xl">
          <Tile aria-labelledby="historique">
            <TileLabel id="historique">Historique admin</TileLabel>
            {!log?.length ? (
              <p className="mt-4 text-sm text-muted">Aucune action sur ce compte.</p>
            ) : (
              <ol className="mt-4 grid gap-3">
                {log.map((l) => (
                  <li key={l.id} className="text-sm">
                    <p className="font-mono text-xs">{l.action}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted">
                      {l.admin_email} · {day(l.at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-4">
              <ArrowLink href={`/admin/journal?compte=${id}`}>Tout le journal</ArrowLink>
            </div>
          </Tile>

        </div>
      )}

      {tab === "securite" && (
        <section aria-labelledby="sensible" className="max-w-3xl rounded-2xl border border-red-400/30 p-5 sm:p-6">
          <h2 id="sensible" className="text-sm font-semibold text-red-300">
            Zone sensible
          </h2>
          <div className="mt-5 grid gap-8 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm text-muted">{p.suspended_at ? "Le compte est suspendu : aucun flux possible." : "Suspendre coupe tous les flux du compte."}</p>
              <SuspendForm userId={id} suspended={!!p.suspended_at} />
            </div>
            <DeleteForm userId={id} supportId={p.support_id} />
          </div>
        </section>
      )}
    </DashPage>
  );
}
