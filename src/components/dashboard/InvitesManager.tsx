"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { createInviteAction, revokeInviteAction, type InviteState } from "@/app/(dashboard)/dashboard/invitations/actions";
import type { Invite, InviteLevel } from "@/lib/core";
import { Check, UserPlus, X } from "@/components/icons";
import { useLinkDevices } from "./useLinkDevices";

// Membres : les personnes qui peuvent piloter ton OBS sans avoir de compte, avec leur accès (Voir, Scènes et son, Tout piloter).
// Onglet Permissions : ce que chaque accès permet. « Inviter » ouvre une fenêtre : email facultatif, accès, OBS, durée, puis le lien à copier.

const LEVELS: { id: InviteLevel; title: string; text: string }[] = [
  { id: "view", title: "Voir", text: "Aperçu, scènes, sources et niveaux audio. Rien ne peut être modifié." },
  { id: "scenes", title: "Scènes et son", text: "Change de scène, affiche ou masque une source, règle le son. Pas de direct ni d'enregistrement." },
  { id: "full", title: "Tout piloter", text: "Comme toi : direct, enregistrement, profils. À réserver aux personnes de confiance." },
];
const levelName = (l: InviteLevel) => LEVELS.find((x) => x.id === l)?.title ?? l;
const DURATIONS: { v: number; label: string }[] = [
  { v: 24, label: "24 heures" },
  { v: 168, label: "7 jours" },
  { v: 720, label: "30 jours" },
  { v: 0, label: "Jusqu'à ce que je la retire" },
];
// Matrice des droits : [libellé, voir, scènes et son, tout piloter]
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
const field = "h-11 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground placeholder:text-muted focus:border-foreground/60 focus:outline-none";
const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const dateTime = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export type Owner = { name: string; email: string; avatar: string | null; since: string | null };

/** `max` : membres au plus selon la formule (null : illimité, 0 : pas d'accès aux invités). */
export default function InvitesManager({ coreUrl, initial, planName, max, owner }: { coreUrl: string; initial: Invite[] | null; planName: string; max: number | null; owner: Owner }) {
  const { devices } = useLinkDevices(coreUrl, 15000);
  const active = (initial ?? []).filter((i) => !i.expired);
  const full = max !== null && active.length >= max;
  const [tab, setTab] = useState<"members" | "perms">("members");
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState<InviteLevel>("scenes");
  const [deviceId, setDeviceId] = useState("");
  const [hours, setHours] = useState(168);
  const [result, setResult] = useState<InviteState | null>(null);
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
    setError("");
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
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
  function revoke(id: string) {
    setError("");
    start(async () => {
      const r = await revokeInviteAction(id);
      if (r.error) setError(r.error);
    });
  }

  const locked = max === 0;
  const count = 1 + active.length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Membres</h1>
          <p className="mt-1.5 text-sm text-muted">Les personnes qui peuvent piloter ton OBS, sans avoir besoin de compte.</p>
        </div>
        {!locked && (
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted">{max === null ? `${active.length} invité${active.length > 1 ? "s" : ""}` : `${active.length} / ${max} invités`}</p>
            <button type="button" onClick={() => setOpen(true)} disabled={full} title={full ? `Limite atteinte pour la formule ${planName}` : undefined} className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50">
              <UserPlus size={18} aria-hidden="true" />
              Inviter
            </button>
          </div>
        )}
      </div>

      {locked ? (
        <section className="mt-10 rounded-2xl border border-line p-8 text-center">
          <h2 className="text-lg font-semibold tracking-tight">Les invités ne sont pas inclus dans ta formule</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            Avec la formule {planName}, tu ne peux pas inviter quelqu&apos;un à piloter ton OBS. Les formules Premium et Extra le permettent (3 et 5 invités).
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
                <span className="hidden sm:block">Accès</span>
                <span className="hidden sm:block">Depuis</span>
                <span className="w-16" />
              </div>
              <ul>
                <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line px-5 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={owner.name} src={owner.avatar} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {owner.name} <span className="font-normal text-muted">(toi)</span>
                      </p>
                      <p data-sensitive className="truncate text-[13px] text-muted">{owner.email}</p>
                    </div>
                  </div>
                  <span className="hidden text-sm sm:block">Propriétaire</span>
                  <span className="hidden text-sm text-muted sm:block">{owner.since ? day(owner.since) : "—"}</span>
                  <span className="w-16" />
                </li>
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
                            {i.email ?? "Lien partagé"} · {dev ? dev.name : i.device_id ? "un OBS" : "tous tes OBS"}
                          </p>
                          <p className="text-[13px] text-muted sm:hidden">{levelName(i.level)}</p>
                        </div>
                      </div>
                      <span className="hidden text-sm sm:block">{levelName(i.level)}</span>
                      <span className="hidden text-[13px] text-muted sm:block">
                        {day(i.created_at)}
                        <br />
                        {i.expires_at ? `jusqu'au ${day(i.expires_at)}` : i.last_used_at ? `vu ${dateTime(i.last_used_at)}` : "jamais utilisée"}
                      </span>
                      <button type="button" disabled={pending} onClick={() => revoke(i.id)} className="w-16 rounded-full border border-line px-3 py-1.5 text-sm text-red-300 transition-colors hover:bg-foreground/10 disabled:opacity-60">
                        Retirer
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="border-t border-line px-5 py-3.5 text-sm text-muted">
                {count} membre{count > 1 ? "s" : ""}
                {active.length === 0 ? " · invite quelqu'un pour lui laisser piloter ton OBS" : ""}
              </p>
            </section>
          ) : (
            <section aria-label="Permissions" className="mt-6 overflow-hidden rounded-2xl border border-line">
              <div className="border-b border-line px-5 py-4">
                <h2 className="text-base font-semibold">Permissions par accès</h2>
                <p className="mt-0.5 text-sm text-muted">Chaque invité a l&apos;un de ces trois accès. Le serveur l&apos;applique : l&apos;interface n&apos;est qu&apos;un confort.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-muted">
                      <th scope="col" className="px-5 py-3 font-normal">Action</th>
                      {LEVELS.map((l) => (
                        <th key={l.id} scope="col" className="w-28 px-2 py-3 text-center font-normal">{l.title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {RIGHTS.map(([text, a, b, c]) => (
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
              <p className="border-t border-line px-5 py-3.5 text-sm text-muted">Les sauvegardes, les réglages de bascule et les réglages d&apos;OBS ne sont jamais accessibles aux invités.</p>
            </section>
          )}
        </>
      )}

      <dialog ref={dialog} onClose={close} onClick={(e) => e.target === dialog.current && close()} aria-labelledby="invite-title" className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-background p-0 text-foreground backdrop:bg-black/70">
        <div className="relative p-6 sm:p-7">
          <button type="button" onClick={close} aria-label="Fermer" className="absolute right-4 top-4 grid size-9 place-items-center rounded-lg text-muted hover:bg-foreground/10 hover:text-foreground">
            <X size={18} aria-hidden="true" />
          </button>
          <h2 id="invite-title" className="pr-10 text-xl font-semibold tracking-tight">Inviter un membre</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">La personne reçoit un lien pour piloter ton OBS, par email si tu en indiques un. Elle n&apos;a pas besoin de compte.</p>

          {result?.url ? (
            <div role="status" className="mt-6">
              <p className="text-sm font-medium">Invitation créée. Voici son lien :</p>
              <p className="mt-0.5 text-[13px] text-muted">
                {result.emailed ? "Il vient aussi d'être envoyé par email. " : ""}
                {result.emailNote ?? ""} Il ne sera plus affiché ensuite : copie-le maintenant.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input readOnly value={result.url} onFocus={(e) => e.currentTarget.select()} className={`${field} font-mono text-xs`} aria-label="Lien d'invitation" />
                <button type="button" onClick={() => void copy(result.url!)} className="btn btn-secondary shrink-0">
                  {copied ? "Copié" : "Copier le lien"}
                </button>
              </div>
              <button type="button" onClick={close} className="btn btn-primary mt-5">
                Terminer
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="grid gap-1.5 text-sm">
                Adresse email (facultatif)
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@exemple.com" className={field} />
              </label>
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
                    <option value="">Tous mes OBS</option>
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
              {error && (
                <p role="alert" className="text-sm text-red-400">
                  {error}
                </p>
              )}
              <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
                {pending ? "Création…" : "Envoyer l'invitation"}
              </button>
            </form>
          )}
        </div>
      </dialog>
    </div>
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
