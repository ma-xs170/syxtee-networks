import { presenceOf } from "@/lib/presence";
import type { Metadata } from "next";
import Link from "next/link";
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
import { hasCore, listRelays, type RelayView } from "@/lib/core";
import { CreateRelayForm, DeleteForm, IdentityForm, KeysForms, NoteForm, RelayRow, ResetLinkForm, SetPasswordForm, SuspendForm } from "../AdminForms";
import PlanForms from "../PlanForms";

export const metadata: Metadata = { title: "Admin · Compte", robots: { index: false } };

const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }) : "jamais";

const TABS = [
  { id: "resume", label: "Résumé" },
  { id: "relais", label: "Serveurs et clés" },
  { id: "compte", label: "Identité et notes" },
  { id: "historique", label: "Historique" },
  { id: "securite", label: "Sécurité" },
] as const;

export default async function AdminAccountPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ onglet?: string }> }) {
  const admin = await requireAdmin("accounts");
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
  // Onglet Relais : liste du Core (URLs, enregistrement), seule source complète. Sans Core, la liste de la base sert de repli en lecture.
  let coreRelays: RelayView[] | null = null;
  if (tab === "relais" && hasCore) coreRelays = await listRelays(id).catch(() => null);
  // Consultation d'un compte : tracée (données personnelles).
  await audit(admin.email!, "account.view", id, null, null);
  const liveIds = new Set(live.filter((l) => l.user_id === id).map((l) => l.relay_id));
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Sans nom";

  const plan = PLANS[p.plan as PlanId]?.name ?? p.plan;
  const active = (relays ?? []).filter((r) => !r.archived);
  const facts: [string, string][] = [
    ["Inscrit le", day(p.created_at)],
    ["Présence", presenceOf(p.last_seen_at, u.user.last_sign_in_at).label],
    ["Dernière connexion", day(u.user.last_sign_in_at)],
    ["Relais", `${active.length} actif${active.length > 1 ? "s" : ""}${liveIds.size ? ` · ${liveIds.size} en direct` : ""}`],
    ["Twitch", p.twitch_login ? `@${p.twitch_login}` : "non lié"],
  ];

  // Fiche compte : en-tête et repères toujours visibles, puis un onglet par sujet (adresse ?onglet=) pour ne montrer qu'une chose à la fois.
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const managed = (u.user.email ?? "").endsWith("@comptes.syxtee-networks.fr");
  const last = (log ?? []).slice(0, 4);
  return (
    <DashPage>
      <div className="mb-6">
        <ArrowLink href="/admin/comptes">Tous les comptes</ArrowLink>
      </div>

      {/* En-tête : identité à gauche, repères d'état à droite */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 items-center gap-5">
          {p.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar_url} alt="" width={64} height={64} className="size-16 shrink-0 rounded-2xl border border-line-strong object-cover" />
          ) : (
            <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-2xl border border-line-strong bg-surface-2 font-mono text-lg font-semibold">{initials}</span>
          )}
          <div className="min-w-0">
            <h1 className="h-page truncate">{name}</h1>
            <p className="mt-1 truncate text-sm text-muted" data-sensitive>{u.user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{`Formule ${plan}`}</Badge>
          <Badge>{p.suspended_at ? `Suspendu le ${day(p.suspended_at)}` : "Actif"}</Badge>
          {managed && <Badge>Compte géré</Badge>}
          {p.plan_until && <Badge>{`Jusqu'au ${day(p.plan_until)}`}</Badge>}
          {liveIds.size > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded border border-live/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground">
              <span className="live-dot" aria-hidden="true" />
              En direct
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
      <nav aria-label="Sections du compte" className="mb-8 flex gap-7 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/comptes/${id}${t.id === "resume" ? "" : `?onglet=${t.id}`}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm transition-colors ${t.id === tab ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "resume" && (
        <div className="space-y-10">
          <section aria-labelledby="formule">
            <h2 id="formule" className="text-sm font-semibold">Formule</h2>
            <p className="mt-1 text-sm text-muted">Change la formule, fixe une échéance ou offre des jours.</p>
            <div className="mt-5">
              <PlanForms key={`${p.plan}:${p.plan_until}`} userId={id} plan={p.plan} until={p.plan_until} note={p.plan_note} />
            </div>
          </section>

          <section aria-labelledby="abo" className="border-t border-line pt-8">
            <div className="flex items-center justify-between gap-4">
              <h2 id="abo" className="text-sm font-semibold">Abonnement</h2>
              {p.stripe_customer_id && (
                <a href={`https://dashboard.stripe.com/customers/${p.stripe_customer_id}`} target="_blank" rel="noreferrer" className="text-xs text-muted underline underline-offset-4 hover:text-foreground">
                  Ouvrir dans Stripe ↗
                </a>
              )}
            </div>
            {!p.billing_status ? (
              <p className="mt-3 text-sm text-muted">Aucun abonnement Stripe.</p>
            ) : (
              <div className="mt-3 grid gap-1 text-sm">
                <p>
                  {p.billing_interval === "year" ? "Annuel" : "Mensuel"} · <span className="font-mono text-xs uppercase">{p.billing_status}</span>
                </p>
                {p.billing_period_end && <p className="text-muted">{`${renews(p) ? "Prochain prélèvement le" : "Fin le"} ${day(p.billing_period_end)}`}</p>}
                {renews(p) && ["partner", "beta", "admin"].includes(p.plan) && (
                  <p role="alert" className="mt-2 text-bad">
                    Formule {plan} attribuée à la main, mais l&apos;abonnement Stripe continue : résilie-le dans Stripe pour qu&apos;il ne paie pas pour rien.
                  </p>
                )}
              </div>
            )}
          </section>

          <section aria-labelledby="serveurs" className="border-t border-line pt-8">
            <div className="flex items-center justify-between gap-4">
              <h2 id="serveurs" className="text-sm font-semibold">Serveurs <span className="ml-1 font-normal text-muted">{active.length}</span></h2>
              <ArrowLink href={`/admin/comptes/${id}?onglet=relais`}>Gérer</ArrowLink>
            </div>
            {active.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aucun serveur actif.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
                {active.slice(0, 6).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${liveIds.has(r.id) ? "bg-live" : "bg-muted"}`} />
                      <span className="truncate font-medium">{r.name}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs uppercase text-muted">{r.protocol}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="dernieres" className="border-t border-line pt-8">
            <div className="flex items-center justify-between gap-4">
              <h2 id="dernieres" className="text-sm font-semibold">Activité récente</h2>
              <ArrowLink href={`/admin/comptes/${id}?onglet=historique`}>Tout voir</ArrowLink>
            </div>
            {last.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aucune action enregistrée.</p>
            ) : (
              <ol className="mt-4 space-y-4 border-l border-line pl-5">
                {last.map((l) => (
                  <li key={l.id} className="relative">
                    <span aria-hidden="true" className="absolute -left-[25px] top-1.5 size-2 rounded-full border border-line-strong bg-background" />
                    <p className="font-mono text-xs">{l.action}</p>
                    <p className="mt-0.5 text-xs text-muted">{l.admin_email} · {day(l.at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}

      {tab === "relais" && (
        <div className="grid max-w-3xl gap-4">
<Tile aria-labelledby="relais">
            <TileLabel id="relais">{`Relais · ${coreRelays ? coreRelays.filter((r) => !r.archived).length : active.length}`}</TileLabel>
            {!coreRelays ? (
              <p className="mt-4 text-sm text-muted">Le serveur relais ne répond pas : les actions sont indisponibles pour le moment.</p>
            ) : (
              <>
                {!coreRelays.length ? (
                  <p className="mt-4 text-sm text-muted">Aucun relais sur ce compte.</p>
                ) : (
                  <ul className="mt-4 grid gap-3">
                    {coreRelays.map((r) => (
                      <RelayRow key={`${r.id}:${r.name}:${r.archived}:${r.record}`} userId={id} relay={r} lastLive={day(r.last_live_at)} />
                    ))}
                  </ul>
                )}
                <div className="mt-6 border-t border-line pt-5">
                  <p className="mb-3 text-xs text-muted">Nouveau relais</p>
                  <CreateRelayForm userId={id} />
                </div>
              </>
            )}
            <div className="mt-6 border-t border-line pt-5">
              <p className="mb-3 text-xs text-muted">Clés de stream (tous les relais du compte)</p>
              <KeysForms userId={id} />
            </div>
          </Tile>

        </div>
      )}

      {tab === "compte" && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
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
        <section aria-labelledby="mdp" className="mb-6 max-w-3xl rounded-2xl border border-line p-5 sm:p-6">
          <h2 id="mdp" className="text-sm font-semibold">
            Mot de passe
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm text-muted">Le client reçoit un e-mail avec un lien pour choisir lui-même son mot de passe.</p>
              <ResetLinkForm userId={id} />
            </div>
            <div>
              <p className="mb-3 text-sm text-muted">Tu choisis le mot de passe. Le client est prévenu par e-mail.</p>
              <SetPasswordForm userId={id} />
            </div>
          </div>
        </section>
      )}

      {tab === "securite" && (
        <section aria-labelledby="sensible" className="max-w-3xl rounded-2xl border border-bad/30 p-5 sm:p-6">
          <h2 id="sensible" className="text-sm font-semibold text-bad">
            Zone sensible
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm text-muted">{p.suspended_at ? "Le compte est suspendu : aucun flux possible." : "Suspendre coupe tous les flux du compte."}</p>
              <SuspendForm userId={id} suspended={!!p.suspended_at} />
            </div>
            <DeleteForm userId={id} supportId={p.support_id} />
          </div>
        </section>
      )}
      </div>

      {/* Colonne de droite : repères et actions rapides, toujours visibles */}
      <aside className="space-y-8 lg:sticky lg:top-6 lg:self-start">
        <section aria-labelledby="repere">
          <h2 id="repere" className="text-sm font-semibold">Compte</h2>
          <dl className="mt-4 divide-y divide-line text-sm">
            {[
              ["ID support", p.support_id],
              ...facts,
              ["Formule", plan],
              ...(p.plan_until ? ([["Expire le", day(p.plan_until)]] as [string, string][]) : []),
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 truncate text-right font-medium" data-sensitive>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="actions">
          <h2 id="actions" className="text-sm font-semibold">Actions rapides</h2>
          <div className="mt-4 grid gap-2">
            <a href={`mailto:${u.user.email}`} className="btn btn-secondary w-full">Écrire au client</a>
            <Link href={`/admin/comptes/${id}?onglet=securite`} className="btn btn-secondary w-full">Mot de passe et sécurité</Link>
            <Link href={`/admin/comptes/${id}?onglet=relais`} className="btn btn-secondary w-full">Serveurs et clés</Link>
          </div>
        </section>
      </aside>
      </div>
    </DashPage>
  );
}
