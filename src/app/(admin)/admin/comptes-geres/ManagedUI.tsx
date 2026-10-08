"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { ASSIGNABLE, PLANS, type PlanId } from "@/lib/plans";
import { createManagedAction, deleteManagedAction, regenerateAction, setLifetimeAction, type ManagedState } from "./actions";

export type ManagedRow = {
  userId: string;
  login: string;
  name: string;
  plan: string;
  createdAt: string;
  expiresAt: string | null;
  mustChange: boolean;
  emailRequired: boolean;
  email: string | null;
  lastSeen: string | null;
  note: string | null;
};

const field = "h-11 w-full rounded-xl border border-line bg-background px-4 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";
const btn = "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-line-strong px-3 text-sm transition-colors hover:bg-foreground/10 disabled:opacity-50";
const primary = "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60";
const LIFETIMES: [string, string][] = [
  ["none", "Indéfinie"],
  ["1", "1 jour"],
  ["3", "3 jours"],
  ["7", "7 jours"],
  ["14", "14 jours"],
  ["30", "30 jours"],
  ["90", "90 jours"],
];

function useCopy() {
  const [done, setDone] = useState<string | null>(null);
  return {
    done,
    copy(key: string, text: string) {
      void navigator.clipboard.writeText(text).then(() => {
        setDone(key);
        setTimeout(() => setDone((d) => (d === key ? null : d)), 1800);
      });
    },
  };
}

/** Identifiants à copier : un bouton par valeur, plus un message prêt à envoyer. Le mot de passe n'est affiché que maintenant. */
function Credentials({ login, password, loginUrl }: { login: string; password: string; loginUrl: string }) {
  const { done, copy } = useCopy();
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setOrigin(window.location.origin), 0);
    return () => clearTimeout(t);
  }, []);
  const url = `${origin}${loginUrl}`;
  const message = `SYXTEE NETWORKS\nSite : ${url}\nIdentifiant : ${login}\nMot de passe temporaire : ${password}\nÀ ta première connexion, tu choisis ton mot de passe puis tu renseignes ton adresse e-mail.`;
  const row = (k: string, label: string, value: string) => (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs text-muted">{label}</span>
      <input readOnly value={value} aria-label={label} onFocus={(e) => e.currentTarget.select()} className={`${field} h-10 flex-1 font-mono text-xs`} />
      <button type="button" className={btn} onClick={() => copy(k, value)}>
        {done === k ? "Copié" : "Copier"}
      </button>
    </div>
  );
  return (
    <div className="mt-4 grid gap-2 rounded-2xl border border-line-strong bg-foreground/[0.04] p-4">
      {row("login", "Identifiant", login)}
      {row("pw", "Mot de passe", password)}
      <div className="mt-1">
        <button type="button" className={btn} onClick={() => copy("all", message)}>
          {done === "all" ? "Message copié" : "Copier le message complet"}
        </button>
      </div>
      <p className="text-xs text-muted">Le mot de passe est temporaire : la personne le change à sa première connexion. Il n&apos;est affiché qu&apos;une fois.</p>
    </div>
  );
}

function CreateForm({ loginUrl }: { loginUrl: string }) {
  const [state, run, pending] = useActionState<ManagedState, FormData>(createManagedAction, {});
  return (
    <form action={run} className="tile p-5 sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight">Créer un compte</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs text-muted">
          Prénom
          <input name="firstName" required maxLength={50} autoComplete="off" className={field} />
        </label>
        <label className="grid gap-1.5 text-xs text-muted">
          Nom
          <input name="lastName" required maxLength={50} autoComplete="off" className={field} />
        </label>
        <label className="grid gap-1.5 text-xs text-muted">
          Identifiant (facultatif : prenom.nom par défaut)
          <input name="login" maxLength={30} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="marie.dupont" className={field} />
        </label>
        <label className="grid gap-1.5 text-xs text-muted">
          Formule (ce à quoi elle accède)
          <select name="plan" defaultValue="beta" className={field}>
            {ASSIGNABLE.map((p: PlanId) => (
              <option key={p} value={p}>
                {PLANS[p].name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-muted">
          Durée du compte
          <select name="lifetime" defaultValue="none" className={field}>
            {LIFETIMES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-muted">
          Note interne
          <input name="note" maxLength={200} placeholder="Ami, testeur, partenaire…" className={field} />
        </label>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">Une durée limitée supprime le compte tout seul à l&apos;échéance (relais compris). La personne est prévenue dans le site, et par e-mail trois jours avant dès qu&apos;elle a donné son adresse.</p>
      <div className="mt-4 flex items-center gap-4">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Création…" : "Créer le compte"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="mt-3 text-sm">
          {state.ok}
        </p>
      )}
      {state.creds && <Credentials login={state.creds.login} password={state.creds.password} loginUrl={loginUrl} />}
    </form>
  );
}

function Row({ m, now, loginUrl }: { m: ManagedRow; now: number | null; loginUrl: string }) {
  const [regen, runRegen, regenPending] = useActionState<ManagedState, FormData>((s) => regenerateAction(m.userId, s), {});
  const [life, runLife, lifePending] = useActionState<ManagedState, FormData>(setLifetimeAction.bind(null, m.userId), {});
  const [del, runDel, delPending] = useActionState<ManagedState, FormData>((s) => deleteManagedAction(m.userId, s), {});
  const [confirm, setConfirm] = useState(false);
  const left = m.expiresAt && now != null ? Math.ceil((Date.parse(m.expiresAt) - now) / 86_400_000) : null;
  const status = m.mustChange ? "Première connexion en attente" : m.emailRequired ? "Adresse e-mail à renseigner" : "Actif";
  return (
    <li className="tile p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">
            {m.name} <span className="font-mono text-xs font-normal text-muted">{m.login}</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {PLANS[(m.plan as PlanId) in PLANS ? (m.plan as PlanId) : "free"].name} · {status}
            {m.email ? ` · ${m.email}` : ""}
          </p>
          <p className={`mt-1 text-xs ${left != null && left <= 3 ? "text-amber-300" : "text-muted"}`}>
            {m.expiresAt ? `Se supprime le ${new Date(m.expiresAt).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" })}${left != null ? ` (dans ${Math.max(0, left)} j)` : ""}` : "Sans date de fin"}
            {m.note ? ` · ${m.note}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={runRegen}>
            <button type="submit" disabled={regenPending} className={btn} title="Crée un nouveau mot de passe temporaire à copier">
              {regenPending ? "…" : "Nouveau mot de passe"}
            </button>
          </form>
          <Link href={`/admin/comptes/${m.userId}`} className={btn}>
            Fiche compte
          </Link>
          {confirm ? (
            <>
              <form action={runDel}>
                <button type="submit" disabled={delPending} className={`${btn} border-red-400/50 text-red-300`}>
                  Confirmer la suppression
                </button>
              </form>
              <button type="button" className={btn} onClick={() => setConfirm(false)}>
                Annuler
              </button>
            </>
          ) : (
            <button type="button" className={`${btn} text-red-300`} onClick={() => setConfirm(true)}>
              Supprimer
            </button>
          )}
        </div>
      </div>
      <form action={runLife} className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-muted">
          Durée à partir d&apos;aujourd&apos;hui
          <select name="lifetime" defaultValue={m.expiresAt ? "" : "none"} className={`${field} h-9 w-auto min-w-32`}>
            {m.expiresAt && <option value="" disabled>
              Choisir…
            </option>}
            {LIFETIMES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={lifePending} className={btn}>
          Appliquer
        </button>
      </form>
      {[regen, life, del].map((s, i) =>
        s.error ? (
          <p key={i} role="alert" className="mt-2 text-sm text-red-400">
            {s.error}
          </p>
        ) : s.ok && !s.creds ? (
          <p key={i} role="status" className="mt-2 text-sm text-muted">
            {s.ok}
          </p>
        ) : null,
      )}
      {regen.creds && (
        <>
          <p role="status" className="mt-3 text-sm">
            {regen.ok}
          </p>
          <Credentials login={regen.creds.login} password={regen.creds.password} loginUrl={loginUrl} />
        </>
      )}
    </li>
  );
}

export default function ManagedUI({ rows, loginUrl }: { rows: ManagedRow[]; loginUrl: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="grid gap-6">
      <CreateForm loginUrl={loginUrl} />
      <section aria-label="Comptes gérés">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">{rows.length} compte{rows.length > 1 ? "s" : ""} géré{rows.length > 1 ? "s" : ""}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Aucun compte créé pour l&apos;instant.</p>
        ) : (
          <ul className="grid gap-3">
            {rows.map((m) => (
              <Row key={m.userId} m={m} now={now} loginUrl={loginUrl} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
