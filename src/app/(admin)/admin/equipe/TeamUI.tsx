"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { flag } from "@/lib/regions";
import { PERMISSIONS, PERMISSION_KEYS, ROLE_META, ROLES, roleStyle, staffPresence, type AnyRole, type Permission, type StaffRole } from "@/lib/staff";
import { inviteStaffAction, removeMemberAction, resendInviteAction, resetMemberPasswordAction, revokeInviteAction, updateMemberAction, type TeamState } from "./actions";

// Équipe : liste des membres (photo, nom, rôle coloré, présence, région), invitation par e-mail, modification des rôles et
// des permissions, mot de passe. Les actions de gestion ne sont proposées qu'au propriétaire (le serveur les refuse aux autres).

export type MemberView = {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  regionName: string | null;
  lastSeen: string | null;
  role: AnyRole;
  permissions: Permission[];
  active: boolean;
  source: "env" | "db";
};
export type InviteRow = { id: string; email: string; role: StaffRole; daysLeft: number };

const btn = "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-line-strong px-3 text-sm transition-colors hover:bg-foreground/10 disabled:opacity-50";
const primary = "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg bg-accent px-4 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50";
const field = "h-11 w-full rounded-lg border border-line bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";

export function RoleChip({ role, className = "" }: { role: AnyRole; className?: string }) {
  return (
    <span style={roleStyle(role)} className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${className}`}>
      {ROLE_META[role].short}
    </span>
  );
}

function Avatar({ name, url, size = 44 }: { name: string; url: string | null; size?: number }) {
  return url ? (
    <Image src={url} alt="" width={size} height={size} className="shrink-0 rounded-full border border-foreground/25 object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full border border-foreground/25 bg-foreground/[0.12] font-mono text-xs uppercase" style={{ width: size, height: size }}>
      {name.slice(0, 2)}
    </span>
  );
}

/** Pastille de présence : verte en ligne, orange absent, grise hors ligne ; se met à jour toute seule. */
function Status({ lastSeen }: { lastSeen: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  const s = staffPresence(lastSeen, now ?? undefined);
  return (
    <span role="status" className="inline-flex items-center gap-2 text-xs text-muted">
      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color, boxShadow: s.state === "online" ? `0 0 0 3px color-mix(in srgb, ${s.color} 25%, transparent)` : undefined }} />
      <span className={s.state === "online" ? "font-medium text-foreground" : ""}>{now === null && lastSeen ? "…" : s.label}</span>
    </span>
  );
}

/** Rafraîchit la liste toutes les 30 s tant que l'onglet est visible (présence à jour sans recharger la page). */
function useAutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [router]);
}

function PermissionGrid({ checked, onChange, disabled }: { checked: Set<Permission>; onChange: (next: Set<Permission>) => void; disabled?: boolean }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {PERMISSION_KEYS.map((k) => (
        <li key={k}>
          <label className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${checked.has(k) ? "border-line-strong bg-foreground/[0.06]" : "border-line"} ${disabled ? "opacity-60" : ""}`}>
            <input
              type="checkbox"
              name="permissions"
              value={k}
              disabled={disabled}
              checked={checked.has(k)}
              onChange={(e) => {
                const next = new Set(checked);
                if (e.target.checked) next.add(k);
                else next.delete(k);
                onChange(next);
              }}
              className="mt-0.5 size-4 shrink-0 accent-current"
            />
            <span>
              <span className="block font-medium">{PERMISSIONS[k].label}</span>
              <span className="block text-xs text-muted">{PERMISSIONS[k].text}</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function RolePicker({ value, onChange }: { value: StaffRole; onChange: (r: StaffRole) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs text-muted">Rôle</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {ROLES.map((r) => (
          <label key={r} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${value === r ? "border-line-strong bg-foreground/[0.06]" : "border-line"}`}>
            <input type="radio" name="role" value={r} checked={value === r} onChange={() => onChange(r)} className="mt-1 size-4 shrink-0 accent-current" />
            <span className="min-w-0">
              <RoleChip role={r} />
              <span className="mt-1.5 block text-xs text-muted">{ROLE_META[r].text}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-label={title} className="m-auto max-h-[92dvh] w-[min(40rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-line-strong bg-background p-0 text-foreground backdrop:bg-black/70">
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-mr-2 -mt-2 grid size-11 place-items-center rounded-lg text-muted hover:bg-foreground/10">
            ✕
          </button>
        </div>
        {open && children}
      </div>
    </dialog>
  );
}

function Feedback({ state }: { state: TeamState }) {
  const [copied, setCopied] = useState(false);
  return (
    <div aria-live="polite">
      {state.ok && (
        <p role="status" className="mt-3 text-sm text-foreground">
          {state.ok}
        </p>
      )}
      {state.error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state.link && (
        <div className="mt-3 flex items-center gap-2">
          <input readOnly value={state.link} aria-label="Lien d'invitation" className={`${field} h-10 font-mono text-xs`} onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            className={btn}
            onClick={() => {
              void navigator.clipboard.writeText(state.link!).then(() => setCopied(true));
            }}
          >
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
      )}
    </div>
  );
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, run, pending] = useActionState(inviteStaffAction, {});
  const [role, setRole] = useState<StaffRole>("support");
  const [perms, setPerms] = useState<Set<Permission>>(new Set(ROLE_META.support.presets));
  return (
    <Dialog open={open} onClose={onClose} title="Inviter un membre">
      <form action={run} className="mt-5 grid gap-5">
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs text-muted">Adresse e-mail</span>
          <input name="email" type="email" required autoComplete="off" placeholder="prenom@exemple.com" className={field} />
        </label>
        <RolePicker
          value={role}
          onChange={(r) => {
            setRole(r);
            setPerms(new Set(ROLE_META[r].presets));
          }}
        />
        <div>
          <p className="mb-2 text-xs text-muted">Permissions (préréglées selon le rôle, modifiables)</p>
          <PermissionGrid checked={perms} onChange={setPerms} />
        </div>
        <p className="text-xs leading-relaxed text-muted">La personne reçoit un lien valable 7 jours. Elle se connecte (ou crée son compte) avec cette adresse, puis active la double authentification.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={primary}>
            {pending ? "Envoi…" : "Envoyer l'invitation"}
          </button>
          <button type="button" onClick={onClose} className={btn}>
            Fermer
          </button>
        </div>
        <Feedback state={state} />
      </form>
    </Dialog>
  );
}

function EditDialog({ member, open, onClose }: { member: MemberView; open: boolean; onClose: () => void }) {
  const [state, run, pending] = useActionState(updateMemberAction.bind(null, member.userId), {});
  const [role, setRole] = useState<StaffRole>(member.role === "owner" ? "admin" : (member.role as StaffRole));
  const [perms, setPerms] = useState<Set<Permission>>(new Set(member.permissions));
  const [active, setActive] = useState(member.active);
  return (
    <Dialog open={open} onClose={onClose} title={`Modifier ${member.displayName}`}>
      <form action={run} className="mt-5 grid gap-5">
        <RolePicker
          value={role}
          onChange={(r) => {
            setRole(r);
            setPerms(new Set(ROLE_META[r].presets));
          }}
        />
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted">Ce qu&apos;il a le droit de faire</p>
            <button type="button" className="text-xs text-muted underline underline-offset-4 hover:text-foreground" onClick={() => setPerms(new Set(ROLE_META[role].presets))}>
              Remettre le préréglage du rôle
            </button>
          </div>
          <PermissionGrid checked={perms} onChange={setPerms} />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="active" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-current" />
          Accès actif (décoche pour suspendre sans supprimer)
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={primary}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button type="button" onClick={onClose} className={btn}>
            Fermer
          </button>
        </div>
        <Feedback state={state} />
      </form>
    </Dialog>
  );
}

function PasswordButton({ userId }: { userId: string }) {
  const [state, run, pending] = useActionState(resetMemberPasswordAction.bind(null, userId), {});
  return (
    <form action={run} className="contents">
      <button type="submit" disabled={pending} className={btn} title="Envoie un lien pour choisir un nouveau mot de passe">
        {pending ? "Envoi…" : state.ok ? "Lien envoyé" : "Mot de passe"}
      </button>
      {state.error && (
        <span role="alert" className="basis-full text-xs text-red-400">
          {state.error}
        </span>
      )}
    </form>
  );
}

function MemberRow({ m, canManage }: { m: MemberView; canManage: boolean }) {
  const [edit, setEdit] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const perms = useMemo(() => new Set(m.permissions), [m.permissions]);
  const owner = m.role === "owner";
  return (
    <li className={`rounded-2xl border border-line bg-surface p-4 sm:p-5 ${m.active ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-start gap-4">
        <Avatar name={m.displayName} url={m.avatarUrl} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold">{m.displayName}</p>
            <RoleChip role={m.role} />
            {!m.active && <span className="rounded-md border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">Suspendu</span>}
          </div>
          <p data-sensitive className="mt-0.5 truncate text-sm text-muted">
            {m.email}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Status lastSeen={m.lastSeen} />
            {m.country && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span aria-hidden="true" className="text-base leading-none">
                  {flag(m.country)}
                </span>
                {m.regionName ?? m.country}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">{owner ? "Accès total, gère l'équipe." : perms.size === 0 ? "Aucune permission." : `${perms.size} permission${perms.size > 1 ? "s" : ""} : ${m.permissions.map((p) => PERMISSIONS[p].label).join(", ")}`}</p>
        </div>
        {canManage && !owner && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {m.source === "db" ? (
              <>
                <button type="button" className={btn} onClick={() => setEdit(true)}>
                  Rôle et permissions
                </button>
                <PasswordButton userId={m.userId} />
                {confirmRemove ? (
                  <form action={removeMemberAction.bind(null, m.userId)} className="contents">
                    <button type="submit" className={`${btn} border-red-400/50 text-red-300`}>
                      Confirmer le retrait
                    </button>
                    <button type="button" className={btn} onClick={() => setConfirmRemove(false)}>
                      Annuler
                    </button>
                  </form>
                ) : (
                  <button type="button" className={`${btn} text-red-300`} onClick={() => setConfirmRemove(true)}>
                    Retirer
                  </button>
                )}
              </>
            ) : (
              <>
                <PasswordButton userId={m.userId} />
                <span className="text-xs text-muted">Géré sur Vercel (ADMIN_EMAILS)</span>
              </>
            )}
          </div>
        )}
      </div>
      {canManage && m.source === "db" && <EditDialog key={`${m.role}-${m.permissions.join()}-${m.active}`} member={m} open={edit} onClose={() => setEdit(false)} />}
    </li>
  );
}

function InviteLine({ inv }: { inv: InviteRow }) {
  const [state, run, pending] = useActionState(resendInviteAction.bind(null, inv.id), {});
  return (
    <li className="flex flex-wrap items-center gap-3 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <p data-sensitive className="truncate">
          {inv.email}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
          <RoleChip role={inv.role} /> En attente · expire dans {inv.daysLeft} j
        </p>
      </div>
      <form action={run} className="contents">
        <button type="submit" disabled={pending} className={btn}>
          {pending ? "Envoi…" : "Renvoyer"}
        </button>
      </form>
      <form action={revokeInviteAction.bind(null, inv.id)} className="contents">
        <button type="submit" className={`${btn} text-red-300`}>
          Annuler
        </button>
      </form>
      {(state.ok || state.error) && (
        <div className="basis-full">
          <Feedback state={state} />
        </div>
      )}
    </li>
  );
}

export default function TeamUI({ members, invites, canManage }: { members: MemberView[]; invites: InviteRow[]; canManage: boolean }) {
  useAutoRefresh();
  const [invite, setInvite] = useState(false);
  const online = members.filter((m) => staffPresence(m.lastSeen).state === "online").length;
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {members.length} membre{members.length > 1 ? "s" : ""} · {online} en ligne
        </p>
        {canManage && (
          <button type="button" className={primary} onClick={() => setInvite(true)}>
            Inviter un membre
          </button>
        )}
      </div>

      <ul className="grid gap-3">
        {members.map((m) => (
          <MemberRow key={m.userId} m={m} canManage={canManage} />
        ))}
      </ul>

      {canManage && invites.length > 0 && (
        <section aria-labelledby="inv" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <h2 id="inv" className="text-sm font-semibold">
            Invitations en attente
          </h2>
          <ul className="mt-2 divide-y divide-line">
            {invites.map((i) => (
              <InviteLine key={i.id} inv={i} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="roles" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <h2 id="roles" className="text-sm font-semibold">
          Les rôles
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {(["owner", ...ROLES] as AnyRole[]).map((r) => (
            <li key={r} className="flex items-start gap-3 text-sm">
              <RoleChip role={r} className="mt-0.5 shrink-0" />
              <span className="text-muted">
                <span className="text-foreground">{ROLE_META[r].label}.</span> {ROLE_META[r].text}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {canManage && <InviteDialog open={invite} onClose={() => setInvite(false)} />}
    </div>
  );
}
