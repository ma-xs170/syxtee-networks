"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ingestUrl } from "@/components/relais/RelayActions";
import type { RelayView } from "@/lib/core";
import { RELAY_SERVERS } from "@/lib/relay-servers";
import { addNoteAction, adminCreateRelayAction, adminRelayAction, cutRelayAction, deleteAccountAction, keysAction, suspendAction, updateIdentityAction, type PlanState } from "./actions";

type Action = (prev: PlanState, form: FormData) => Promise<PlanState>;

const field = "h-11 w-full rounded-xl border border-line bg-background px-4 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";
const label = "text-xs text-muted";

function Button({ children, danger = false, disabled = false }: { children: ReactNode; danger?: boolean; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`h-11 whitespace-nowrap rounded-full px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        danger ? "border border-bad/40 text-bad hover:bg-bad/10" : "border border-line hover:bg-foreground/10"
      }`}
    >
      {pending ? "…" : children}
    </button>
  );
}

function Notice({ state }: { state: PlanState }) {
  if (state.error) return <p role="alert" className="text-sm text-bad">{state.error}</p>;
  if (state.ok) return <p role="status" className="text-sm text-muted">{state.ok}</p>;
  return null;
}

/** Formulaire d'une action admin, avec confirmation navigateur facultative. */
function ActionForm({ action, userId, confirm, children, className = "flex flex-wrap items-center gap-3" }: { action: Action; userId: string; confirm?: string; children: ReactNode; className?: string }) {
  const [state, run] = useActionState<PlanState, FormData>(action, {});
  return (
    <form action={run} onSubmit={(e) => confirm && !window.confirm(confirm) && e.preventDefault()} className={className}>
      <input type="hidden" name="userId" value={userId} />
      {children}
      <Notice state={state} />
    </form>
  );
}

export function IdentityForm({ userId, first, last, email }: { userId: string; first: string; last: string; email: string }) {
  return (
    <ActionForm action={updateIdentityAction} userId={userId} className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="adm-first" className={label}>Prénom</label>
          <input id="adm-first" name="first_name" defaultValue={first} required maxLength={50} className={field} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="adm-last" className={label}>Nom</label>
          <input id="adm-last" name="last_name" defaultValue={last} required maxLength={50} className={field} />
        </div>
      </div>
      <div className="grid gap-2">
        <label htmlFor="adm-email" className={label}>Email</label>
        <input id="adm-email" name="email" type="email" defaultValue={email} required className={field} />
      </div>
      <div>
        <Button>Enregistrer l&apos;identité</Button>
      </div>
    </ActionForm>
  );
}

export function KeysForms({ userId }: { userId: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <ActionForm action={keysAction} userId={userId} confirm="Régénérer toutes les clés ? Les flux en cours sont coupés et le client doit recoller ses URLs.">
        <input type="hidden" name="mode" value="regenerate" />
        <Button>Régénérer les clés</Button>
      </ActionForm>
      <ActionForm action={keysAction} userId={userId} confirm="Révoquer les clés ? Tous les relais du compte sont archivés.">
        <input type="hidden" name="mode" value="revoke" />
        <Button danger>Révoquer les clés</Button>
      </ActionForm>
    </div>
  );
}

export function CutButton({ userId, relayId }: { userId: string; relayId: string }) {
  return (
    <ActionForm action={cutRelayAction} userId={userId} confirm="Couper ce flux ? Une nouvelle clé est générée, le client doit recoller ses URLs.">
      <input type="hidden" name="relayId" value={relayId} />
      <Button danger>Couper le flux</Button>
    </ActionForm>
  );
}

export function SuspendForm({ userId, suspended }: { userId: string; suspended: boolean }) {
  return (
    <ActionForm action={suspendAction} userId={userId} confirm={suspended ? undefined : "Suspendre ce compte ? Tous ses flux sont coupés."}>
      <input type="hidden" name="suspend" value={suspended ? "0" : "1"} />
      <Button danger={!suspended}>{suspended ? "Réactiver le compte" : "Suspendre le compte"}</Button>
    </ActionForm>
  );
}

export function DeleteForm({ userId, supportId }: { userId: string; supportId: string }) {
  const [text, setText] = useState("");
  return (
    <ActionForm action={deleteAccountAction} userId={userId} confirm="Supprimer définitivement ce compte ? Cette action est irréversible." className="grid gap-3">
      <label htmlFor="adm-delete" className="text-sm text-muted">
        Tape <span className="font-mono text-foreground">{supportId}</span> pour confirmer
      </label>
      <input id="adm-delete" name="confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className={`${field} max-w-xs font-mono uppercase`} />
      <div>
        <Button danger disabled={text.trim().toUpperCase() !== supportId}>
          Supprimer le compte
        </Button>
      </div>
    </ActionForm>
  );
}

export function NoteForm({ userId }: { userId: string }) {
  return (
    <ActionForm action={addNoteAction} userId={userId} className="grid gap-3">
      <label htmlFor="adm-note" className="sr-only">Nouvelle note</label>
      <textarea id="adm-note" name="body" required maxLength={2000} rows={3} placeholder="Note interne (jamais visible par le client)" className={`${field} h-auto py-3`} />
      <div>
        <Button>Ajouter la note</Button>
      </div>
    </ActionForm>
  );
}

const small = "h-9 whitespace-nowrap rounded-full border border-line px-4 text-sm transition-colors hover:bg-foreground/10 disabled:opacity-40";

function OpButton({ op, children, danger = false }: { op: string; children: ReactNode; danger?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="op" value={op} disabled={pending} className={`${small} ${danger ? "border-bad/40 text-bad hover:bg-bad/10" : ""}`}>
      {pending ? "…" : children}
    </button>
  );
}

/** Créer un relais sur le compte (limites de sa formule : le Core recompte). */
export function CreateRelayForm({ userId }: { userId: string }) {
  return (
    <ActionForm action={adminCreateRelayAction} userId={userId} className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_9rem_11rem_auto] sm:items-end">
      <div className="grid gap-2">
        <label htmlFor="adm-relay-name" className={label}>Nom du relais</label>
        <input id="adm-relay-name" name="name" required maxLength={40} placeholder="Ex. Osmo Pocket 3" className={field} />
      </div>
      <div className="grid gap-2">
        <label htmlFor="adm-relay-proto" className={label}>Protocole</label>
        <select id="adm-relay-proto" name="protocol" defaultValue="srtla" className={field}>
          <option value="srtla">SRTLA</option>
          <option value="rtmp">RTMP</option>
          <option value="rist">RIST</option>
        </select>
      </div>
      <div className="grid gap-2">
        <label htmlFor="adm-relay-server" className={label}>Serveur</label>
        <select id="adm-relay-server" name="server" defaultValue="bhs1" className={field}>
          {RELAY_SERVERS.filter((s) => s.available).map((s) => (
            <option key={s.id} value={s.id}>
              {s.city} ({s.id})
            </option>
          ))}
        </select>
      </div>
      <Button>Créer le relais</Button>
    </ActionForm>
  );
}

export type AdminRelay = Pick<RelayView, "id" | "name" | "protocol" | "server" | "archived" | "live" | "record" | "record_available" | "urls" | "last_live_at">;

/** Une ligne de relais : nom modifiable, état, et toutes les actions. */
export function RelayRow({ userId, relay, lastLive }: { userId: string; relay: AdminRelay; lastLive: string }) {
  const [state, run] = useActionState<PlanState, FormData>(adminRelayAction, {});
  const [copied, setCopied] = useState(false);
  const url = ingestUrl(relay);
  return (
    <li className={`rounded-xl border border-line p-4 ${relay.archived ? "opacity-70" : ""}`}>
      <form
        action={run}
        onSubmit={(e) => {
          const op = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
          const text: Record<string, string> = {
            rotate: "Régénérer la clé ? Le flux en cours est coupé et le client doit recoller ses URLs.",
            archive: "Archiver ce relais ? Ses URLs cessent de marcher.",
            delete: "Supprimer ce relais définitivement ? Action irréversible.",
          };
          if (op && text[op] && !window.confirm(text[op])) e.preventDefault();
        }}
        className="grid gap-3"
      >
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="relayId" value={relay.id} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 font-mono text-xs uppercase text-muted">
            {relay.live && <span className="live-dot" aria-label="En direct" />}
            {relay.protocol} · {relay.server} · {relay.archived ? "archivé" : `dernier direct ${lastLive}`}
            {relay.record && !relay.archived && " · enregistre"}
          </p>
          {url && !relay.archived && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  setCopied(false);
                }
              }}
              className={small}
            >
              {copied ? "Copié" : "Copier l'URL"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`adm-rn-${relay.id}`} className="sr-only">Nom du relais</label>
          <input id={`adm-rn-${relay.id}`} name="name" defaultValue={relay.name} maxLength={40} className={`${field} h-9 max-w-xs`} />
          <OpButton op="rename">Renommer</OpButton>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {relay.archived ? (
            <OpButton op="restore">Réactiver</OpButton>
          ) : (
            <>
              {relay.record_available && <OpButton op={relay.record ? "record_off" : "record_on"}>{relay.record ? "Arrêter l'enregistrement" : "Enregistrer le flux"}</OpButton>}
              <OpButton op="rotate" danger>Régénérer la clé</OpButton>
              <OpButton op="archive" danger>Archiver</OpButton>
            </>
          )}
          <OpButton op="delete" danger>Supprimer</OpButton>
        </div>
        <Notice state={state} />
      </form>
    </li>
  );
}
