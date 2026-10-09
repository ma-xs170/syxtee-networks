"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createInviteAction, revokeInviteAction, type InviteState } from "@/app/(dashboard)/dashboard/invitations/actions";
import { inviteMemberAction, leaveWorkspaceAction, removeMemberAction, revokeMemberInviteAction, setMemberRoleAction } from "@/app/(dashboard)/dashboard/espaces/actions";
import type { Invite, InviteLevel } from "@/lib/core";
import type { WorkspaceInviteRow, WorkspaceMember } from "@/lib/workspace";
import { Check, UserPlus, X } from "@/components/icons";
import { useLinkDevices } from "./useLinkDevices";
import { Card, Fact, Pill, RowMenu, TabsNav } from "./panel";

// Équipe. Quatre onglets (?onglet=) : Membres, Invitations, Permissions, Espace. Toute personne invitée passe par un compte : l'invitation part
// par email et elle crée un compte ou se connecte avec cette adresse. Même mise en page que la page d'un serveur : cartes à en-tête et synthèse « En bref ».

const LEVELS: { id: InviteLevel; title: string; text: string }[] = [
  { id: "view", title: "Voir", text: "Aperçu, scènes, sources et niveaux audio. Rien ne peut être modifié." },
  { id: "scenes", title: "Scènes et son", text: "Change de scène, affiche ou masque une source, règle le son. Pas de direct ni d'enregistrement." },
  { id: "full", title: "Tout piloter", text: "Comme toi : direct, enregistrement, profils. À réserver aux personnes de confiance." },
];
const levelName = (l: InviteLevel) => LEVELS.find((x) => x.id === l)?.title ?? l;
const ROLE_NAME: Record<string, string> = { owner: "Propriétaire", admin: "Administrateur", member: "Membre" };
const DURATIONS: { v: number; label: string }[] = [
  { v: 24, label: "24 heures" },
  { v: 168, label: "7 jours" },
  { v: 720, label: "30 jours" },
  { v: 0, label: "Jusqu'à ce que je la retire" },
];
// Matrice des droits des invités : [libellé, voir, scènes et son, tout piloter]
const RIGHTS: [string, boolean, boolean, boolean][] = [
  ["Voir l'aperçu, les scènes et les sources", true, true, true],
  ["Voir les niveaux audio et l'état du direct", true, true, true],
  ["Changer de scène, passer en Mode studio", false, true, true],
  ["Afficher ou masquer une source", false, true, true],
  ["Régler le son (volume, muet, écoute)", false, true, true],
  ["Démarrer et arrêter le direct", false, false, true],
  ["Démarrer et arrêter l'enregistrement", false, false, true],
  ["Changer de profil ou de collection de scènes", false, false, true],
];
// Droits des rôles d'un espace : [libellé, membre, administrateur, propriétaire]
const ROLE_RIGHTS: [string, boolean, boolean, boolean][] = [
  ["Voir et piloter les OBS de l'espace", true, true, true],
  ["Voir les flux, les statistiques et l'historique", true, true, true],
  ["Créer, modifier et supprimer des flux", false, true, true],
  ["Inviter et retirer des membres", false, true, true],
  ["Retirer un administrateur, changer les rôles", false, false, true],
];
const field = "h-11 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground placeholder:text-muted focus:border-foreground/60 focus:outline-none";
const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const dateTime = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export type Owner = { name: string; email: string; avatar: string | null; since: string | null };
export type TeamInfo = { name: string; role: "owner" | "admin" | "member"; meId: string; members: WorkspaceMember[]; pending: WorkspaceInviteRow[] };

const TABS = [
  { id: "membres", label: "Membres" },
  { id: "invitations", label: "Invitations" },
  { id: "permissions", label: "Permissions" },
  { id: "espace", label: "Espace" },
] as const;
const chip = "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-line-strong px-4 text-sm font-medium transition-colors hover:bg-foreground/[0.08] disabled:opacity-60";

/** `max` : invités OBS au plus selon la formule (null : illimité, 0 : pas d'accès). `team` : espace partagé actif. `settings` : réglages de l'espace (onglet Espace). */
export default function InvitesManager({ coreUrl, initial, planName, max, owner, team, tab: tabId, settings }: { coreUrl: string; initial: Invite[] | null; planName: string; max: number | null; owner: Owner; team: TeamInfo | null; tab?: string; settings?: ReactNode }) {
  const { devices } = useLinkDevices(coreUrl, 15000);
  const active = (initial ?? []).filter((i) => !i.expired);
  const guestFull = max !== null && active.length >= max;
  const manage = !team || team.role !== "member";
  const tabs = TABS.filter((t) => t.id !== "espace" || !!team);
  const tab = tabs.find((t) => t.id === tabId)?.id ?? "membres";
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"member" | "guest">(team ? "member" : "guest");
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [level, setLevel] = useState<InviteLevel>("scenes");
  const [deviceId, setDeviceId] = useState("");
  const [hours, setHours] = useState(168);
  const [result, setResult] = useState<InviteState | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function close() {
    setOpen(false);
    setResult(null);
    setDone(false);
    setError("");
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      if (mode === "member") {
        const r = await inviteMemberAction({ email, role });
        if (r.error) return setError(r.error);
        setEmail("");
        return setDone(true);
      }
      const r = await createInviteAction({ label, email, level, deviceId, expiresHours: hours });
      if (r.error) return setError(r.error);
      setResult(r);
      setLabel("");
      setEmail("");
    });
  }
  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // le lien reste affiché, sélectionnable
    }
  }
  function run(job: () => Promise<{ error?: string }>) {
    setError("");
    start(async () => {
      const r = await job();
      if (r.error) setError(r.error);
    });
  }

  const locked = !team && max === 0;
  const canInviteGuest = max !== 0;
  const canInvite = manage && (team || canInviteGuest);
  const members = team ? team.members : [{ user_id: "me", role: "owner" as const, created_at: owner.since ?? "", name: owner.name, email: owner.email, avatar: owner.avatar }];
  const waiting = (team?.pending.length ?? 0) + active.length;
  const href = (id: string) => `/dashboard/invitations${id === "membres" ? "" : `?onglet=${id}`}`;
  const levelTone = (l: InviteLevel) => (l === "full" ? "warn" : "idle") as "warn" | "idle";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-page">Équi<em>pe</em></h1>
          <p className="mt-2 text-sm text-muted">{team ? `Les personnes qui ont accès à ${team.name}.` : "Les personnes qui peuvent piloter ton OBS. Chacune passe par un compte."}</p>
        </div>
        {!locked && (
          <div className="flex items-center gap-3">
            {team && team.role !== "owner" && (
              <button type="button" disabled={pending} onClick={() => run(leaveWorkspaceAction)} className={`${chip} text-red-300`}>
                Quitter l&apos;espace
              </button>
            )}
            {canInvite && (
              <button type="button" onClick={() => { setMode(team ? "member" : "guest"); setOpen(true); }} className="btn btn-primary">
                <UserPlus size={18} aria-hidden="true" />
                Inviter
              </button>
            )}
          </div>
        )}
      </div>

      {locked ? (
        <section className="rounded-2xl border border-line bg-surface p-8 text-center">
          <h2 className="text-lg font-semibold tracking-tight">L&apos;équipe n&apos;est pas incluse dans ta formule</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            Avec la formule {planName}, tu ne peux pas inviter quelqu&apos;un à piloter ton OBS. Les formules Signature et Prestige le permettent.
          </p>
          <Link href="/tarifs" className="btn btn-primary mt-6">
            Voir les formules
          </Link>
        </section>
      ) : (
        <>
          <TabsNav tabs={tabs.map((t) => ({ id: t.id, label: t.id === "invitations" && waiting > 0 ? `${t.label} (${waiting})` : t.label, href: href(t.id) }))} current={tab} label="Sections de l'équipe" />

          {error && !open && (
            <p role="alert" className="mb-4 text-sm text-red-400">
              {error}
            </p>
          )}
          {initial === null && <p className="mb-4 text-sm text-muted">Le serveur n&apos;est pas encore à jour pour les invitations.</p>}

          {tab === "membres" && (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Card title="Membres">
                {members.map((m) => {
                  const canRemove = !!team && m.role !== "owner" && m.user_id !== team.meId && (team.role === "owner" || (team.role === "admin" && m.role === "member"));
                  const items = [
                    ...(team?.role === "owner" && m.role !== "owner" ? [m.role === "admin" ? { label: "Passer membre", onSelect: () => run(() => setMemberRoleAction(m.user_id, "member")) } : { label: "Passer administrateur", onSelect: () => run(() => setMemberRoleAction(m.user_id, "admin")) }] : []),
                    ...(canRemove ? [{ label: "Retirer de l'équipe", danger: true, onSelect: () => run(() => removeMemberAction(m.user_id)) }] : []),
                  ];
                  return (
                    <div key={m.user_id} className="flex min-h-[4.5rem] items-center gap-4 py-3">
                      <Avatar name={m.name} src={m.avatar} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold">
                          {m.name} {(!team || m.user_id === team.meId) && <span className="font-normal text-muted">(toi)</span>}
                        </p>
                        <p data-sensitive className="truncate text-xs text-muted">{m.email}{m.created_at ? ` · depuis le ${day(m.created_at)}` : ""}</p>
                      </div>
                      <Pill tone={m.role === "owner" ? "ok" : "idle"}>{ROLE_NAME[m.role]}</Pill>
                      {items.length > 0 ? <RowMenu label={`Actions pour ${m.name}`} items={items} /> : <span className="size-10 shrink-0" aria-hidden="true" />}
                    </div>
                  );
                })}
              </Card>
              <aside className="space-y-6 lg:sticky lg:top-6">
                <Card title="En bref">
                  <dl className="divide-y divide-line">
                    <Fact label="Membres">{members.length}</Fact>
                    <Fact label="Invitations en attente">{waiting}</Fact>
                    <Fact label="Invités OBS">{max === null ? active.length : `${active.length} / ${max}`}</Fact>
                    <Fact label="Ton rôle"><Pill>{team ? ROLE_NAME[team.role] : "Propriétaire"}</Pill></Fact>
                    <Fact label="Formule">{planName}</Fact>
                  </dl>
                </Card>
                {!team && <p className="px-1 text-sm leading-relaxed text-muted">Besoin d&apos;une régie ou de plusieurs OBS ? Crée un espace partagé depuis le menu en bas à gauche.</p>}
              </aside>
            </div>
          )}

          {tab === "invitations" && (
            <div className="max-w-4xl">
              <Card title="Invitations en attente" action={canInvite ? <button type="button" onClick={() => { setMode(team ? "member" : "guest"); setOpen(true); }} className={chip}>Inviter</button> : undefined}>
                {waiting === 0 ? (
                  <p className="py-10 text-center text-sm text-muted">Aucune invitation en attente. La personne invitée reçoit un email : elle crée un compte ou se connecte avec cette adresse.</p>
                ) : (
                  <>
                    {(team?.pending ?? []).map((p) => (
                      <div key={p.id} className="flex min-h-[4.5rem] items-center gap-4 py-3">
                        <Avatar name={p.email} src={null} />
                        <div className="min-w-0 flex-1">
                          <p data-sensitive className="truncate text-[15px] font-semibold">{p.email}</p>
                          <p className="truncate text-xs text-muted">Membre de l&apos;espace · rôle {ROLE_NAME[p.role].toLowerCase()} · expire le {day(p.expires_at)}</p>
                        </div>
                        <Pill tone="warn">En attente</Pill>
                        {manage && <RowMenu label={`Actions pour ${p.email}`} items={[{ label: "Retirer l'invitation", danger: true, onSelect: () => run(() => revokeMemberInviteAction(p.id)) }]} />}
                      </div>
                    ))}
                    {active.map((i) => {
                      const dev = (devices ?? []).find((d) => d.id === i.device_id);
                      return (
                        <div key={i.id} className="flex min-h-[4.5rem] items-center gap-4 py-3">
                          <Avatar name={i.label} src={null} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold">{i.label}</p>
                            <p data-sensitive className="truncate text-xs text-muted">
                              {i.email ?? "Ancien lien sans adresse"} · {dev ? dev.name : i.device_id ? "un OBS" : "tous les OBS"} · {i.expires_at ? `jusqu'au ${day(i.expires_at)}` : i.last_used_at ? `vu ${dateTime(i.last_used_at)}` : "jamais utilisé"}
                            </p>
                          </div>
                          {i.connected > 0 && <Pill tone="ok">Connecté</Pill>}
                          <Pill tone={levelTone(i.level)}>{levelName(i.level)}</Pill>
                          {manage && <RowMenu label={`Actions pour ${i.label}`} items={[{ label: "Retirer l'accès", danger: true, onSelect: () => run(() => revokeInviteAction(i.id)) }]} />}
                        </div>
                      );
                    })}
                  </>
                )}
              </Card>
            </div>
          )}

          {tab === "permissions" && (
            <div className="max-w-4xl space-y-6">
              {team && <PermTable title="Rôles de l'espace" intro="Le rôle donne les droits d'un membre de l'équipe." head={["Membre", "Administrateur", "Propriétaire"]} rows={ROLE_RIGHTS} />}
              <PermTable title="Invités OBS" intro="Chaque invité a l'un de ces trois accès. Le serveur l'applique : l'interface n'est qu'un confort." head={LEVELS.map((l) => l.title)} rows={RIGHTS} note="Les sauvegardes, les réglages de bascule et les réglages d'OBS ne sont jamais accessibles aux invités." />
            </div>
          )}

          {tab === "espace" && team && <div className="max-w-4xl">{settings}</div>}
        </>
      )}

      <dialog ref={dialog} onClose={close} onClick={(e) => e.target === dialog.current && close()} aria-labelledby="invite-title" className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-background p-0 text-foreground backdrop:bg-black/70">
        <div className="relative p-6 sm:p-7">
          <button type="button" onClick={close} aria-label="Fermer" className="absolute right-4 top-4 grid size-9 place-items-center rounded-lg text-muted hover:bg-foreground/10 hover:text-foreground">
            <X size={18} aria-hidden="true" />
          </button>
          <h2 id="invite-title" className="pr-10 text-xl font-semibold tracking-tight">Inviter</h2>

          {team && canInviteGuest && !result && !done && (
            <div role="tablist" aria-label="Type d'invitation" className="mt-4 inline-flex rounded-full border border-line p-1 text-sm">
              {([["member", "Membre de l'espace"], ["guest", "Pilotage OBS"]] as const).map(([id, text]) => (
                <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => { setMode(id); setError(""); }} className={`rounded-full px-4 py-1.5 transition-colors ${mode === id ? "bg-foreground/10 text-foreground" : "text-muted hover:text-foreground"}`}>
                  {text}
                </button>
              ))}
            </div>
          )}

          {done || result?.url ? (
            <div role="status" className="mt-6">
              <p className="text-sm font-medium">Invitation envoyée.</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                {result?.emailed === false ? (result.emailNote ?? "L'email n'a pas pu partir.") : "La personne reçoit un email : elle crée un compte ou se connecte avec cette adresse, puis accepte l'invitation."}
                {done ? " L'invitation est valable 7 jours." : ""}
              </p>
              {result?.url && (
                <>
                  <p className="mt-4 text-[13px] text-muted">Tu peux aussi lui envoyer le lien toi-même. Il ne sera plus affiché ensuite.</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input readOnly value={result.url} onFocus={(e) => e.currentTarget.select()} className={`${field} font-mono text-xs`} aria-label="Lien d'invitation" />
                    <button type="button" onClick={() => void copy(result.url!)} className="btn btn-secondary shrink-0">
                      {copied ? "Copié" : "Copier le lien"}
                    </button>
                  </div>
                </>
              )}
              <button type="button" onClick={close} className="btn btn-primary mt-5">Terminer</button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <p className="text-sm leading-relaxed text-muted">
                {mode === "member" ? `La personne reçoit un email pour rejoindre ${team?.name ?? "l'espace"}.` : "La personne reçoit un email pour piloter ton OBS."} Elle doit créer un compte ou se connecter avec cette adresse.
              </p>
              <label className="grid gap-1.5 text-sm">
                Adresse email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="prenom@exemple.com" className={field} />
              </label>
              {mode === "member" ? (
                <label className="grid gap-1.5 text-sm">
                  Rôle
                  <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "member")} className={field}>
                    <option value="member">Membre : pilote et regarde</option>
                    <option value="admin">Administrateur : gère aussi les flux et les membres</option>
                  </select>
                </label>
              ) : (
                <>
                  <label className="grid gap-1.5 text-sm">
                    Nom
                    <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} required placeholder="Modérateur, Monteur…" className={field} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    Accès
                    <select value={level} onChange={(e) => setLevel(e.target.value as InviteLevel)} className={field}>
                      {LEVELS.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title}
                        </option>
                      ))}
                    </select>
                    <span className="text-[13px] leading-relaxed text-muted">{LEVELS.find((l) => l.id === level)?.text}</span>
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm">
                      Quel OBS
                      <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className={field}>
                        <option value="">Tous les OBS</option>
                        {(devices ?? []).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      Valable
                      <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={field}>
                        {DURATIONS.map((d) => (
                          <option key={d.v} value={d.v}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {guestFull && <p className="text-[13px] text-muted">Limite d&apos;invités atteinte pour la formule {planName}. Retire un invité pour en ajouter un.</p>}
                </>
              )}
              {error && (
                <p role="alert" className="text-sm text-red-400">
                  {error}
                </p>
              )}
              <button type="submit" disabled={pending || (mode === "guest" && guestFull)} className="btn btn-primary w-full disabled:opacity-60">
                {pending ? "Envoi…" : "Envoyer l'invitation"}
              </button>
            </form>
          )}
        </div>
      </dialog>
    </div>
  );
}

function PermTable({ title, intro, head, rows, note }: { title: string; intro: string; head: string[]; rows: [string, boolean, boolean, boolean][]; note?: string }) {
  return (
    <section aria-label={title} className="overflow-hidden rounded-2xl border border-line">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{intro}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th scope="col" className="px-5 py-3 font-normal">Action</th>
              {head.map((h) => (
                <th key={h} scope="col" className="w-32 px-2 py-3 text-center font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([text, a, b, c]) => (
              <tr key={text} className="border-b border-line last:border-b-0">
                <th scope="row" className="px-5 py-3.5 font-normal">{text}</th>
                {[a, b, c].map((ok, i) => (
                  <td key={i} className="px-2 py-3.5 text-center">
                    {ok ? <Check size={16} weight="bold" className="mx-auto text-emerald-400" aria-label="Autorisé" /> : <span className="text-muted" aria-label="Non autorisé">·</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="border-t border-line px-5 py-3.5 text-sm text-muted">{note}</p>}
    </section>
  );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={36} height={36} className="size-9 shrink-0 rounded-full border border-line object-cover" />
  ) : (
    <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/10 text-sm font-medium uppercase">
      {name.trim().slice(0, 1) || "?"}
    </span>
  );
}
