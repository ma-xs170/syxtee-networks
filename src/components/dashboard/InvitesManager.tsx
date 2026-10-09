"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { createInviteAction, revokeInviteAction, type InviteState } from "@/app/(dashboard)/dashboard/invitations/actions";
import { inviteMemberAction, leaveWorkspaceAction, removeMemberAction, revokeMemberInviteAction, setMemberRoleAction } from "@/app/(dashboard)/dashboard/espaces/actions";
import type { Invite, InviteLevel } from "@/lib/core";
import type { WorkspaceInviteRow, WorkspaceMember } from "@/lib/workspace";
import { Check, UserPlus, X } from "@/components/icons";
import { useLinkDevices } from "./useLinkDevices";

// Membres. Espace partagé : les comptes de l'équipe (propriétaire, administrateurs, membres), les invitations par email en attente,
// et les liens d'invité sans compte. Espace personnel : seulement les liens d'invité. Onglet Permissions : ce que permet chaque accès.

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

/** `max` : invités sans compte au plus selon la formule (null : illimité, 0 : pas d'accès). `team` : espace partagé actif. */
export default function InvitesManager({ coreUrl, initial, planName, max, owner, team }: { coreUrl: string; initial: Invite[] | null; planName: string; max: number | null; owner: Owner; team: TeamInfo | null }) {
  const { devices } = useLinkDevices(coreUrl, 15000);
  const active = (initial ?? []).filter((i) => !i.expired);
  const guestFull = max !== null && active.length >= max;
  const manage = !team || team.role !== "member";
  const [tab, setTab] = useState<"members" | "perms">("members");
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
  const memberCount = team ? team.members.length : 1;
  const count = memberCount + active.length;
  const canInviteGuest = max !== 0;
  const canInvite = manage && (team || canInviteGuest);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="h-page">Équi<em>pe</em></h1>
          <p className="mt-1.5 text-sm text-muted">{team ? `Les personnes qui ont accès à ${team.name}.` : "Les personnes qui peuvent piloter ton OBS. Chacune passe par un compte."}</p>
        </div>
        {!locked && (
          <div className="flex items-center gap-3">
            {canInviteGuest && <p className="hidden text-sm text-muted sm:block">{max === null ? `${active.length} invité${active.length > 1 ? "s" : ""}` : `${active.length} / ${max} invités`}</p>}
            {team && team.role !== "owner" && (
              <button type="button" disabled={pending} onClick={() => run(leaveWorkspaceAction)} className="btn btn-secondary text-red-300 disabled:opacity-60">
                Quitter
              </button>
            )}
            {canInvite && (
              <button type="button" onClick={() => { setMode(team ? "member" : "guest"); setOpen(true); }} className="btn btn-secondary">
                <UserPlus size={18} aria-hidden="true" />
                Inviter
              </button>
            )}
          </div>
        )}
      </div>

      {locked ? (
        <section className="mt-10 rounded-2xl border border-line p-8 text-center">
          <h2 className="text-lg font-semibold tracking-tight">Les invités ne sont pas inclus dans ta formule</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            Avec la formule {planName}, tu ne peux pas inviter quelqu&apos;un à piloter ton OBS. Les formules Signature et Prestige le permettent.
          </p>
          <Link href="/tarifs" className="btn btn-primary mt-6">
            Voir les formules
          </Link>
        </section>
      ) : (
        <>
          <div role="tablist" aria-label="Sections" className="mt-8 flex gap-6 border-b border-line">
            {([["members", "Membres"], ["perms", "Permissions"]] as const).map(([id, text]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`-mb-px border-b-2 pb-3 text-sm transition-colors ${tab === id ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground"}`}>
                {text}
              </button>
            ))}
          </div>

          {error && !open && (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {error}
            </p>
          )}

          {tab === "members" ? (
            <section aria-label="Membres" className="mt-6 overflow-hidden rounded-2xl border border-line">
              {initial === null && <p className="px-5 py-4 text-sm text-muted">Le serveur n&apos;est pas encore à jour pour les invitations.</p>}
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-line px-5 py-3 text-xs text-muted sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <span>Membre</span>
                <span className="hidden sm:block">Rôle</span>
                <span className="hidden sm:block">Depuis</span>
                <span className="w-20" />
              </div>
              <ul>
                {(team ? team.members : [{ user_id: "me", role: "owner" as const, created_at: owner.since ?? "", name: owner.name, email: owner.email, avatar: owner.avatar }]).map((m) => (
                  <li key={m.user_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line px-5 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={m.name} src={m.avatar} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {m.name} {(!team || m.user_id === team.meId) && <span className="font-normal text-muted">(toi)</span>}
                        </p>
                        <p data-sensitive className="truncate text-[13px] text-muted">{m.email}</p>
                        <p className="text-[13px] text-muted sm:hidden">{ROLE_NAME[m.role]}</p>
                      </div>
                    </div>
                    <span className="hidden text-sm sm:block">
                      {team && team.role === "owner" && m.role !== "owner" ? (
                        <select aria-label={`Rôle de ${m.name}`} value={m.role} disabled={pending} onChange={(e) => run(() => setMemberRoleAction(m.user_id, e.target.value as "admin" | "member"))} className="h-9 rounded-lg border border-line bg-background px-2 text-sm">
                          <option value="admin">Administrateur</option>
                          <option value="member">Membre</option>
                        </select>
                      ) : (
                        ROLE_NAME[m.role]
                      )}
                    </span>
                    <span className="hidden text-sm text-muted sm:block">{m.created_at ? day(m.created_at) : "—"}</span>
                    {team && m.role !== "owner" && m.user_id !== team.meId && (team.role === "owner" || (team.role === "admin" && m.role === "member")) ? (
                      <button type="button" disabled={pending} onClick={() => run(() => removeMemberAction(m.user_id))} className="w-20 rounded-full border border-line px-3 py-1.5 text-sm text-red-300 transition-colors hover:bg-foreground/10 disabled:opacity-60">
                        Retirer
                      </button>
                    ) : (
                      <span className="w-20" />
                    )}
                  </li>
                ))}
                {(team?.pending ?? []).map((p) => (
                  <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line px-5 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={p.email} src={null} />
                      <div className="min-w-0">
                        <p data-sensitive className="truncate text-sm font-medium">{p.email}</p>
                        <p className="text-[13px] text-muted">Invitation envoyée, en attente</p>
                      </div>
                    </div>
                    <span className="hidden text-sm sm:block">{ROLE_NAME[p.role]}</span>
                    <span className="hidden text-[13px] text-muted sm:block">expire le {day(p.expires_at)}</span>
                    {manage ? (
                      <button type="button" disabled={pending} onClick={() => run(() => revokeMemberInviteAction(p.id))} className="w-20 rounded-full border border-line px-3 py-1.5 text-sm text-red-300 transition-colors hover:bg-foreground/10 disabled:opacity-60">
                        Retirer
                      </button>
                    ) : (
                      <span className="w-20" />
                    )}
                  </li>
                ))}
                {active.map((i) => {
                  const dev = (devices ?? []).find((d) => d.id === i.device_id);
                  return (
                    <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={i.label} src={null} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            <span className="truncate">{i.label}</span>
                            {i.connected > 0 && (
                              <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-normal text-muted">
                                <span className="size-1.5 rounded-full bg-emerald-400" /> connecté
                              </span>
                            )}
                          </p>
                          <p className="truncate text-[13px] text-muted">
                            Invité OBS · {dev ? dev.name : i.device_id ? "un OBS" : "tous les OBS"}
                          </p>
                          <p className="text-[13px] text-muted sm:hidden">{levelName(i.level)}</p>
                        </div>
                      </div>
                      <span className="hidden text-sm sm:block">{levelName(i.level)}</span>
                      <span className="hidden text-[13px] text-muted sm:block">
                        {day(i.created_at)}
                        <br />
                        {i.expires_at ? `jusqu'au ${day(i.expires_at)}` : i.last_used_at ? `vu ${dateTime(i.last_used_at)}` : "jamais utilisé"}
                      </span>
                      {manage ? (
                        <button type="button" disabled={pending} onClick={() => run(() => revokeInviteAction(i.id))} className="w-20 rounded-full border border-line px-3 py-1.5 text-sm text-red-300 transition-colors hover:bg-foreground/10 disabled:opacity-60">
                          Retirer
                        </button>
                      ) : (
                        <span className="w-20" />
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="border-t border-line px-5 py-3.5 text-sm text-muted">
                {count} personne{count > 1 ? "s" : ""}
                {!team ? " · crée un espace partagé (menu en bas à gauche) pour une régie ou une équipe : plusieurs OBS, des membres avec leur compte et leur rôle" : ""}
              </p>
            </section>
          ) : (
            <div className="mt-6 space-y-6">
              {team && <PermTable title="Rôles de l'espace" intro="Le rôle donne les droits d'un membre de l'équipe (compte requis)." head={["Membre", "Administrateur", "Propriétaire"]} rows={ROLE_RIGHTS} />}
              <PermTable title="Invités OBS" intro="Chaque invité a l'un de ces trois accès. Le serveur l'applique : l'interface n'est qu'un confort." head={LEVELS.map((l) => l.title)} rows={RIGHTS} note="Les sauvegardes, les réglages de bascule et les réglages d'OBS ne sont jamais accessibles aux invités." />
            </div>
          )}
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
              {([["member", "Membre (espace)"], ["guest", "Invité (OBS)"]] as const).map(([id, text]) => (
                <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => { setMode(id); setError(""); }} className={`rounded-full px-4 py-1.5 transition-colors ${mode === id ? "bg-foreground/10 text-foreground" : "text-muted hover:text-foreground"}`}>
                  {text}
                </button>
              ))}
            </div>
          )}

          {done ? (
            <div role="status" className="mt-6">
              <p className="text-sm font-medium">Invitation envoyée.</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">La personne reçoit un email : elle se connecte avec cette adresse (ou crée un compte) puis rejoint l&apos;espace. L&apos;invitation est valable 7 jours.</p>
              <button type="button" onClick={close} className="btn btn-primary mt-5">Terminer</button>
            </div>
          ) : result?.url ? (
            <div role="status" className="mt-6">
              <p className="text-sm font-medium">Invitation envoyée.</p>
              <p className="mt-0.5 text-[13px] text-muted">
                {result.emailed ? "La personne reçoit un email : elle crée un compte ou se connecte avec cette adresse. " : ""}
                {result.emailNote ?? ""} Tu peux aussi lui envoyer ce lien toi-même ; il ne sera plus affiché ensuite.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input readOnly value={result.url} onFocus={(e) => e.currentTarget.select()} className={`${field} font-mono text-xs`} aria-label="Lien d'invitation" />
                <button type="button" onClick={() => void copy(result.url!)} className="btn btn-secondary shrink-0">
                  {copied ? "Copié" : "Copier le lien"}
                </button>
              </div>
              <button type="button" onClick={close} className="btn btn-primary mt-5">Terminer</button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <p className="text-sm leading-relaxed text-muted">
                {mode === "member" ? `La personne reçoit un email pour rejoindre ${team?.name ?? "l'espace"}. Elle doit créer un compte ou se connecter avec cette adresse.` : "La personne reçoit un email pour piloter ton OBS. Elle doit créer un compte ou se connecter avec cette adresse."}
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
