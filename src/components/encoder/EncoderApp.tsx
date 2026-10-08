"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Screen } from "../devices/Devices";
import RelayBox from "../landing/RelayBox";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import Input from "../ui/Input";
import StatusPill from "../ui/StatusPill";
import { ToastProvider, useToast } from "../ui/Toast";
import { EncoderMacUI } from "./EncoderScreens";
import { useEncoder } from "./useEncoder";
import { getProvider, mockProvider } from "@/lib/encoder";
import type { Encoder } from "@/lib/encoder/types";

// Dashboard client de l'Encodeur : mêmes écrans que la démo publique, branchés sur le provider (mock tant que le backend n'est pas prêt).
// `locked` : formule Gratuit, interface visible mais grisée avec un bandeau pour passer en Payant.

function LockedBanner() {
  return (
    <div role="note" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line-strong bg-surface-2 px-5 py-4">
      <p className="text-sm text-muted"><span className="font-medium text-foreground">Passe en Payant pour débloquer.</span> Le tableau de bord de l&apos;Encodeur est inclus dans la formule Payant.</p>
      <Link href="/dashboard/abonnement" className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-sm font-medium text-on-accent">Voir l&apos;abonnement</Link>
    </div>
  );
}

/** Code à 6 caractères : majuscules automatiques, collage intelligent (espaces et tirets ignorés). */
function PairingCard({ locked, onPaired }: { locked: boolean; onPaired: (e: Encoder) => void }) {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState("");
  const clean = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (locked || code.length !== 6) return;
    setState("loading");
    setError("");
    try {
      const enc = await getProvider().pair(code);
      setState("success");
      toast("Encodeur lié à ton compte.");
      setTimeout(() => onPaired(enc), 700);
    } catch (err) {
      setState("error");
      const msg = err instanceof Error ? err.message : "Impossible de lier l'Encodeur.";
      setError(msg);
      toast(msg, "error");
    }
  }

  return (
    <Card>
      <div className="flex flex-col items-center px-4 py-10 text-center">
        <div className="w-full max-w-xs opacity-90"><RelayBox live={false} leds={{ wifi: "off", eth: "off", cell: "off", usb: "off" }} /></div>
        <h2 className="mt-6 text-xl font-semibold tracking-tight">Aucun Encodeur lié</h2>
        <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-muted">Allume ton Encodeur : il affiche un code à 6 caractères. Tape-le ici pour le lier à ton compte.</p>
        <form onSubmit={submit} className="mt-6 grid w-full max-w-sm gap-4">
          <div className="grid gap-2 text-left">
            <label htmlFor="pair-code" className="text-sm text-muted">Code de l&apos;Encodeur</label>
            <input
              id="pair-code"
              value={code}
              disabled={locked || state === "loading" || state === "success"}
              onChange={(e) => setCode(clean(e.target.value))}
              onPaste={(e) => {
                e.preventDefault();
                setCode(clean(e.clipboardData.getData("text")));
              }}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={12}
              placeholder="ABC123"
              aria-invalid={state === "error"}
              aria-describedby="pair-help"
              className={`h-14 w-full rounded-xl border bg-input px-4 text-center font-mono text-2xl tracking-[0.4em] tabular-nums text-foreground placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 ${state === "error" ? "border-bad/60" : "border-line focus:border-foreground/50"}`}
            />
            <p id="pair-help" className={`text-xs ${state === "error" ? "text-bad" : "text-muted"}`}>{state === "error" ? error : "Six lettres ou chiffres. Colle le code, il se met en forme tout seul."}</p>
          </div>
          <Button type="submit" loading={state === "loading"} disabled={locked || code.length !== 6 || state === "success"} className="w-full">
            {state === "success" ? "Encodeur lié" : "Lier mon Encodeur"}
          </Button>
        </form>
      </div>
    </Card>
  );
}

const STATUS = { live: "live", online: "ok", offline: "offline" } as const;
const STATUS_LABEL = { live: "En direct", online: "En ligne", offline: "Hors ligne" } as const;

function EncoderList({ encoders, onOpen, onRename, locked }: { encoders: Encoder[]; onOpen: (id: string) => void; onRename: (id: string, name: string) => void; locked: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {encoders.map((e) => (
        <Card key={e.id}>
          <div className="flex items-center justify-between gap-3">
            <input
              aria-label="Nom de l'Encodeur"
              defaultValue={e.name}
              disabled={locked}
              maxLength={40}
              onBlur={(ev) => ev.target.value.trim() && ev.target.value !== e.name && onRename(e.id, ev.target.value.trim())}
              className="min-w-0 flex-1 rounded-lg bg-transparent px-1 text-lg font-semibold tracking-tight outline-none focus-visible:bg-input"
            />
            <StatusPill variant={STATUS[e.status]} label={STATUS_LABEL[e.status]} />
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-4 text-sm">
            <div><dt className="text-xs text-muted">Signal</dt><dd className="mt-1 font-mono tabular-nums">{e.signal} / 4</dd></div>
            <div><dt className="text-xs text-muted">Dernière activité</dt><dd className="mt-1">{e.lastSeen}</dd></div>
            <div><dt className="text-xs text-muted">Firmware</dt><dd className="mt-1 font-mono tabular-nums">{e.firmware}</dd></div>
          </dl>
          <div className="mt-6"><Button onClick={() => onOpen(e.id)} disabled={locked}>Ouvrir le tableau de bord</Button></div>
        </Card>
      ))}
    </div>
  );
}

function Journal({ events }: { events: { time: string; text: string; status: "ok" | "warn" | "bad" }[] }) {
  const [f, setF] = useState<"all" | "ok" | "warn" | "bad">("all");
  const list = events.filter((e) => f === "all" || e.status === f);
  const FILTERS: ["all" | "ok" | "warn" | "bad", string][] = [["all", "Tous"], ["ok", "OK"], ["warn", "Alertes"], ["bad", "Critiques"]];
  return (
    <Card title="Journal d'activité">
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer le journal">
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={f === id} onClick={() => setF(id)} className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${f === id ? "border-foreground/40 bg-surface-2 text-foreground" : "border-line text-muted hover:text-foreground"}`}>{label}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Aucun événement pour ce filtre.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead><tr className="text-muted"><th className="pb-3 font-normal">Heure</th><th className="pb-3 font-normal">Événement</th><th className="pb-3 text-right font-normal">Statut</th></tr></thead>
          <tbody>
            {list.map((e, i) => (
              <tr key={i} className="border-t border-line transition-colors hover:bg-surface-2/60">
                <td className="py-3 font-mono tabular-nums text-muted">{e.time}</td>
                <td className="py-3">{e.text}</td>
                <td className="py-3 text-right"><StatusPill variant={e.status === "ok" ? "ok" : e.status === "warn" ? "unstable" : "offline"} label={e.status === "ok" ? "OK" : e.status === "warn" ? "Alerte" : "Critique"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function Sharing({ locked }: { locked: boolean }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [invited, setInvited] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  return (
    <Card title="Partage d'accès">
      <p className="text-sm text-muted">Invite un modérateur en lecture seule : il voit l&apos;état du direct et les statistiques, sans pouvoir rien modifier.</p>
      <form
        className="mt-5 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim() || locked) return;
          setPending(true);
          setTimeout(() => {
            setInvited((l) => [...l, email.trim()]);
            setEmail("");
            setPending(false);
            toast("Invitation envoyée en lecture seule.");
          }, 700);
        }}
      >
        <Input label="Adresse e-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={locked} />
        <Button type="submit" loading={pending} disabled={locked}>Inviter en lecture seule</Button>
      </form>
      {invited.length > 0 && (
        <ul className="mt-5 divide-y divide-line text-sm">
          {invited.map((m) => <li key={m} className="flex items-center justify-between py-3"><span data-sensitive>{m}</span><span className="text-muted">Lecture seule</span></li>)}
        </ul>
      )}
    </Card>
  );
}

function EncoderView({ id, locked, onBack }: { id: string; locked: boolean; onBack: () => void }) {
  const engine = getProvider().engine(id);
  const d = useEncoder(engine, true);
  const [tab, setTab] = useState<"dash" | "journal" | "share">("dash");
  const TABS: ["dash" | "journal" | "share", string][] = [["dash", "Tableau de bord"], ["journal", "Journal"], ["share", "Partage"]];
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-5 block text-sm text-muted transition-colors hover:text-foreground">← Mes Encodeurs</button>
      <div role="tablist" className="mb-6 inline-flex gap-1 rounded-full border border-line bg-surface p-1">
        {TABS.map(([k, l]) => <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === k ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"}`}>{l}</button>)}
      </div>
      {tab === "dash" && (
        <div className="overflow-hidden rounded-[20px] border border-line-strong bg-black">
          <div className="aspect-[16/10] w-full"><Screen w={1280} h={800}><EncoderMacUI d={d} /></Screen></div>
        </div>
      )}
      {tab === "journal" && <Journal events={d.snap.events} />}
      {tab === "share" && <Sharing locked={locked} />}
    </div>
  );
}

function Inner({ locked }: { locked: boolean }) {
  const [encoders, setEncoders] = useState<Encoder[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    getProvider().getEncoders().then(setEncoders).catch((e: unknown) => setError(e instanceof Error ? e.message : "Impossible de charger tes Encodeurs."));
  };
  useEffect(load, []);

  if (error) return <Card><p role="alert" className="py-8 text-center text-sm text-bad">{error}</p></Card>;
  if (!encoders)
    return (
      <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Chargement">
        {[0, 1].map((i) => <div key={i} className="card h-44 animate-pulse motion-reduce:animate-none" />)}
      </div>
    );
  if (open) return <EncoderView id={open} locked={locked} onBack={() => { setOpen(null); load(); }} />;
  if (encoders.length === 0) return <PairingCard locked={locked} onPaired={() => load()} />;
  return (
    <div className="grid gap-6">
      <EncoderList encoders={encoders} onOpen={setOpen} locked={locked} onRename={(id, name) => { mockProvider.rename(id, name).then(load); }} />
      <details className="card">
        <summary className="cursor-pointer text-sm font-medium">Lier un autre Encodeur</summary>
        <div className="mt-4"><PairingCard locked={locked} onPaired={() => load()} /></div>
      </details>
    </div>
  );
}

export default function EncoderApp({ locked }: { locked: boolean }) {
  return (
    <ToastProvider>
      {locked && <LockedBanner />}
      <div className={locked ? "pointer-events-none select-none opacity-50" : ""} aria-disabled={locked || undefined}>
        <Inner locked={locked} />
      </div>
    </ToastProvider>
  );
}
