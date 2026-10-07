"use client";

import { useState, useTransition } from "react";
import { createInviteAction, revokeInviteAction, type InviteState } from "@/app/(dashboard)/dashboard/invitations/actions";
import type { Invite, InviteLevel } from "@/lib/core";
import { useLinkDevices } from "./useLinkDevices";

// Invitations : formulaire (nom, email facultatif, droits, poste, durée), lien à copier une seule fois, liste des invitations actives.

const LEVELS: { id: InviteLevel; title: string; text: string }[] = [
  { id: "view", title: "Voir seulement", text: "Aperçu, scènes, sources et niveaux audio. Rien ne peut être modifié." },
  { id: "scenes", title: "Scènes et son", text: "Change de scène, affiche ou masque une source, règle le son. Pas de direct ni d'enregistrement." },
  { id: "full", title: "Tout piloter", text: "Comme toi : démarrer et arrêter le direct, enregistrer, changer de profil. À réserver aux personnes de confiance." },
];
const DURATIONS: { v: number; label: string }[] = [
  { v: 24, label: "24 heures" },
  { v: 168, label: "7 jours" },
  { v: 720, label: "30 jours" },
  { v: 0, label: "Jusqu'à ce que je la retire" },
];
const levelName = (l: InviteLevel) => LEVELS.find((x) => x.id === l)?.title ?? l;
const field = "h-11 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground placeholder:text-muted focus:border-foreground/60 focus:outline-none";

function when(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

export default function InvitesManager({ coreUrl, initial }: { coreUrl: string; initial: Invite[] | null }) {
  const { devices } = useLinkDevices(coreUrl, 15000);
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState<InviteLevel>("scenes");
  const [deviceId, setDeviceId] = useState("");
  const [hours, setHours] = useState(168);
  const [result, setResult] = useState<InviteState | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
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

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <form onSubmit={submit} className="space-y-6 rounded-2xl border border-line bg-surface p-5 sm:p-7">
        <h2 className="text-lg font-semibold tracking-tight">Nouvelle invitation</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            Nom de l&apos;invitation
            <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} required placeholder="Modérateur, Monteur…" className={field} />
          </label>
          <label className="grid gap-1.5 text-sm">
            Email (facultatif)
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Pour envoyer le lien" className={field} />
          </label>
        </div>

        <fieldset>
          <legend className="text-sm">Ce qu&apos;il peut faire</legend>
          <div className="mt-2 grid gap-2">
            {LEVELS.map((l) => (
              <label key={l.id} className={`cursor-pointer rounded-xl border p-3.5 transition-colors ${level === l.id ? "border-foreground/60 bg-foreground/[0.06]" : "border-line hover:border-line-strong"}`}>
                <span className="flex items-center gap-2.5 text-sm font-medium">
                  <input type="radio" name="level" checked={level === l.id} onChange={() => setLevel(l.id)} className="accent-[var(--foreground)]" />
                  {l.title}
                </span>
                <span className="mt-1 block pl-[1.65rem] text-[13px] leading-relaxed text-muted">{l.text}</span>
              </label>
            ))}
          </div>
        </fieldset>

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
        <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60 sm:w-auto">
          {pending ? "Création…" : "Créer l'invitation"}
        </button>

        {result?.url && (
          <div role="status" className="rounded-xl border border-foreground/30 bg-foreground/[0.05] p-4">
            <p className="text-sm font-medium">Invitation créée. Voici son lien :</p>
            <p className="mt-0.5 text-[13px] text-muted">
              {result.emailed ? "Il vient aussi d'être envoyé par email. " : ""}
              {result.emailNote ?? ""} Il ne sera plus affiché après : copie-le maintenant.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input readOnly value={result.url} onFocus={(e) => e.currentTarget.select()} className={`${field} font-mono text-xs`} aria-label="Lien d'invitation" />
              <button type="button" onClick={() => void copy(result.url!)} className="btn btn-secondary shrink-0">
                {copied ? "Copié" : "Copier le lien"}
              </button>
            </div>
          </div>
        )}
      </form>

      <section aria-label="Invitations actives">
        <h2 className="text-lg font-semibold tracking-tight">Invitations actives</h2>
        {initial === null ? (
          <p className="mt-4 text-sm text-muted">Le serveur n&apos;est pas encore à jour pour les invitations.</p>
        ) : initial.length === 0 ? (
          <p className="mt-4 text-sm leading-relaxed text-muted">Aucune invitation pour le moment. Crée-en une pour laisser quelqu&apos;un piloter ton OBS.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {initial.map((i) => {
              const dev = (devices ?? []).find((d) => d.id === i.device_id);
              return (
                <li key={i.id} className="rounded-xl border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{i.label}</span>
                        {i.connected > 0 && (
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[11px] font-normal">
                            <span className="size-1.5 rounded-full bg-emerald-400" /> connecté
                          </span>
                        )}
                        {i.expired && <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] font-normal text-muted">expirée</span>}
                      </p>
                      <p className="mt-1 text-[13px] text-muted">
                        {levelName(i.level)} · {dev ? dev.name : i.device_id ? "un OBS" : "tous tes OBS"}
                      </p>
                      <p className="mt-0.5 text-[13px] text-muted">
                        {i.email ? `${i.email} · ` : ""}
                        {i.expires_at ? `jusqu'au ${when(i.expires_at)}` : "sans limite de durée"}
                        {i.last_used_at ? ` · dernier accès ${when(i.last_used_at)}` : " · jamais utilisée"}
                      </p>
                    </div>
                    <button type="button" disabled={pending} onClick={() => revoke(i.id)} className="shrink-0 rounded-full border border-line px-3.5 py-1.5 text-sm text-red-300 transition-colors hover:bg-foreground/10 disabled:opacity-60">
                      Retirer
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-5 text-[13px] leading-relaxed text-muted">
          « Retirer » coupe le lien tout de suite et déconnecte la personne si elle est en train de piloter. Toutes ses actions sont inscrites au journal.
        </p>
      </section>
    </div>
  );
}
