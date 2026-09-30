import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLink, DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { liveNow } from "@/lib/admin-data";
import { audit } from "@/lib/plan-admin";
import { PLANS, type PlanId } from "@/lib/plans";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import { CutButton, DeleteForm, IdentityForm, KeysForms, NoteForm, SuspendForm } from "../AdminForms";
import PlanForms from "../PlanForms";

export const metadata: Metadata = { title: "Admin · Compte", robots: { index: false } };

const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }) : "jamais";

export default async function AdminAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!hasAdmin || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = createAdminClient();
  const [{ data: p }, { data: u }, { data: relays }, { data: notes }, { data: log }, live] = await Promise.all([
    db.from("profiles").select("*").eq("id", id).maybeSingle(),
    db.auth.admin.getUserById(id),
    db.from("relays").select("id, name, protocol, server, mode, archived, created_at, last_live_at").eq("user_id", id).order("created_at"),
    db.from("admin_notes").select("id, author, body, at").eq("user_id", id).order("at", { ascending: false }).limit(50),
    db.from("admin_audit").select("id, at, admin_email, action").eq("target_user", id).order("at", { ascending: false }).limit(30),
    liveNow(),
  ]);
  if (!p || !u.user) notFound();
  // Consultation d'un compte : tracée (données personnelles).
  await audit(admin.email!, "account.view", id, null, null);
  const liveIds = new Set(live.filter((l) => l.user_id === id).map((l) => l.relay_id));
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Sans nom";

  const rows: [string, string][] = [
    ["ID support", p.support_id],
    ["Email", u.user.email ?? "?"],
    ["Formule", `${PLANS[p.plan as PlanId]?.name ?? p.plan}${p.plan_until ? ` jusqu'au ${day(p.plan_until)}` : ""}`],
    ["Statut", p.suspended_at ? `Suspendu le ${day(p.suspended_at)}` : "Actif"],
    ["Twitch", p.twitch_login ? `@${p.twitch_login}` : "non lié"],
    ["Inscrit le", day(p.created_at)],
    ["Dernière connexion", day(u.user.last_sign_in_at)],
    ["ID interne", id],
  ];

  return (
    <DashPage>
      <DashHeader lead="Compte" hl={name} sub={u.user.email ?? undefined}>
        <ArrowLink href="/admin/comptes">Tous les comptes</ArrowLink>
      </DashHeader>
      <div className="grid gap-4 lg:grid-cols-2">
        <Tile>
          <TileLabel>Profil</TileLabel>
          <dl className="mt-4 divide-y divide-line text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-2.5">
                <dt className="font-mono text-xs uppercase tracking-[0.12em] text-muted">{k}</dt>
                <dd className="min-w-0 break-all font-mono text-xs" data-sensitive>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </Tile>
        <Tile>
          <TileLabel>Identité</TileLabel>
          <div className="mt-4">
            <IdentityForm userId={id} first={p.first_name ?? ""} last={p.last_name ?? ""} email={u.user.email ?? ""} />
          </div>
        </Tile>

        <Tile className="lg:col-span-2">
          <TileLabel>Formule</TileLabel>
          <div className="mt-4 max-w-2xl">
            <PlanForms key={`${p.plan}:${p.plan_until}`} userId={id} plan={p.plan} until={p.plan_until} note={p.plan_note} />
          </div>
        </Tile>

        <Tile className="lg:col-span-2">
          <TileLabel>Relais · {relays?.length ?? 0}</TileLabel>
          {!relays?.length ? (
            <p className="mt-4 text-sm text-muted">Aucun relais.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {relays.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <span className="flex items-center gap-3">
                    {liveIds.has(r.id) && <span className="h-2 w-2 rounded-full bg-live" aria-label="En direct" />}
                    {r.name}
                    <span className="font-mono text-xs uppercase text-muted">
                      {r.protocol} · {r.server}
                      {r.archived ? " · archivé" : ""}
                    </span>
                  </span>
                  {!r.archived && <CutButton userId={id} relayId={r.id} />}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 border-t border-line pt-5">
            <KeysForms userId={id} />
          </div>
        </Tile>

        <Tile>
          <TileLabel>Notes internes</TileLabel>
          <div className="mt-4">
            <NoteForm userId={id} />
          </div>
          <ul className="mt-5 space-y-4">
            {(notes ?? []).map((n) => (
              <li key={n.id} className="text-sm">
                <p className="whitespace-pre-wrap">{n.body}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {n.author} · {day(n.at)}
                </p>
              </li>
            ))}
          </ul>
        </Tile>
        <Tile>
          <TileLabel>Historique admin</TileLabel>
          <ul className="mt-4 divide-y divide-line">
            {(log ?? []).map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-3 py-2 text-sm">
                <span className="font-mono text-xs">{l.action}</span>
                <span className="font-mono text-xs text-muted">
                  {l.admin_email} · {day(l.at)}
                </span>
              </li>
            ))}
          </ul>
        </Tile>

        <Tile className="lg:col-span-2">
          <TileLabel>Zone sensible</TileLabel>
          <div className="mt-4 grid gap-8 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm text-muted">{p.suspended_at ? "Le compte est suspendu : aucun flux possible." : "Suspendre coupe tous les flux du compte."}</p>
              <SuspendForm userId={id} suspended={!!p.suspended_at} />
            </div>
            <DeleteForm userId={id} supportId={p.support_id} />
          </div>
        </Tile>
      </div>
    </DashPage>
  );
}
