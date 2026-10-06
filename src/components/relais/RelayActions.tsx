"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { archiveRelayAction, changeServerAction, deleteRelayAction, renameRelayAction, rotateRelayAction, setRecordAction, setRecordFormatAction, setSwitchTriggerAction, type RelayActionState } from "@/app/(dashboard)/dashboard/relais/actions";
import type { RelayView, SwitchTrigger } from "@/lib/core";
import { flag, RELAY_SERVERS } from "@/lib/relay-servers";

// Actions d'un relais : Copier l'URL (clé jamais affichée ici), Voir, et un menu (Renommer, Régénérer la clé,
// Archiver ou Réactiver, Supprimer). Les actions qui coupent des URLs passent par une confirmation.

type Pending = "rename" | "trigger" | "server" | "rotate" | "archive" | "delete" | null;

const TRIGGERS: { id: SwitchTrigger; title: string; text: string }[] = [
  { id: "cut", title: "Coupure seulement", text: "Bascule sur la scène de secours quand l'image se fige ou que le flux est coupé." },
  { id: "cut_lowbitrate", title: "Coupure et débit très bas", text: "Bascule aussi quand le débit du flux tombe sous 300 kbit/s, avant que l'image ne se fige." },
  { id: "sensitive", title: "Sensible", text: "Réagit aux micro-coupures : bascule dès 2 secondes d'image figée ou sous 800 kbit/s. Peut basculer un peu trop souvent." },
];

/** URL que l'encodeur colle : SRTLA pour Moblin, URL RTMP ou RIST complète sinon. */
export const ingestUrl = (r: Pick<RelayView, "protocol" | "urls">) => (r.protocol === "rist" ? r.urls.rist_url : r.protocol === "rtmp" ? r.urls.rtmp_url : r.urls.srtla_url) ?? "";

const btn = "h-10 whitespace-nowrap rounded-full border border-line px-4 text-sm transition-colors hover:bg-foreground/10 disabled:opacity-40";

export default function RelayActions({ relay, showView = true, onView }: { relay: RelayView; showView?: boolean; onView?: () => void }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [ask, setAsk] = useState<Pending>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(relay.name);
  const [trig, setTrig] = useState<SwitchTrigger>(relay.switch_trigger ?? "cut");
  const otherServers = RELAY_SERVERS.filter((s) => s.available && s.id !== relay.server);
  const [target, setTarget] = useState(otherServers[0]?.id ?? "");
  const [pending, start] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (ask && !d.open) d.showModal();
    if (!ask && d.open) d.close();
  }, [ask]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(ingestUrl(relay));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function open(p: Pending) {
    setMenu(false);
    setError(null);
    setName(relay.name);
    setTrig(relay.switch_trigger ?? "cut");
    setAsk(p);
  }

  function toggleRecord() {
    setMenu(false);
    setError(null);
    start(async () => {
      const r = await setRecordAction(relay.id, !relay.record);
      if (r.error) return setError(r.error);
      router.refresh();
    });
  }

  function toggleFormat() {
    setMenu(false);
    setError(null);
    start(async () => {
      const r = await setRecordFormatAction(relay.id, relay.record_format === "mp4" ? "mov" : "mp4");
      if (r.error) return setError(r.error);
      router.refresh();
    });
  }

  function confirm() {
    start(async () => {
      let r: RelayActionState = {};
      if (ask === "rename") r = await renameRelayAction(relay.id, name);
      if (ask === "trigger") r = await setSwitchTriggerAction(relay.id, trig);
      if (ask === "server") r = await changeServerAction(relay.id, target);
      if (ask === "rotate") r = await rotateRelayAction(relay.id);
      if (ask === "archive") r = await archiveRelayAction(relay.id, !relay.archived);
      if (ask === "delete") r = await deleteRelayAction(relay.id);
      if (r.error) return setError(r.error);
      setAsk(null);
      router.refresh();
    });
  }

  const texts: Record<Exclude<Pending, null>, { title: string; body: string; cta: string; danger?: boolean }> = {
    rename: { title: "Renommer la caméra", body: "Le nom de la caméra qui utilise ce flux. Les URLs ne changent pas. Dans OBS, la source « Flux › NOM » prend le nouveau nom toute seule.", cta: "Renommer" },
    trigger: { title: "Déclenchement de la bascule", body: "Quand OBS doit passer seul sur ta scène de secours. Le plugin lit ce réglage (aussi modifiable dans Contrôle à distance, panneau Appareil).", cta: "Enregistrer" },
    server: {
      title: "Changer de serveur",
      body: "Le relais garde le même identifiant, la même clé et la même adresse : rien à recoller dans ton encodeur ni dans OBS. Si tu diffuses en ce moment, le direct est coupé quelques secondes.",
      cta: "Changer de serveur",
    },
    rotate: {
      title: "Régénérer la clé",
      body: "Les URLs actuelles de ce relais cesseront de marcher immédiatement. Tu devras coller les nouvelles dans ton encodeur et dans OBS.",
      cta: "Régénérer",
      danger: true,
    },
    archive: relay.archived
      ? { title: "Réactiver le relais", body: "Ses URLs remarchent tout de suite. Il compte de nouveau dans la limite de ta formule.", cta: "Réactiver" }
      : {
          title: "Archiver le relais",
          body: "Ses URLs cessent de marcher et il ne compte plus dans ta limite. Tu pourras le réactiver avec les mêmes URLs.",
          cta: "Archiver",
          danger: true,
        },
    delete: {
      title: "Supprimer le relais",
      body: "Ses URLs cessent de marcher et le relais est effacé. Ses directs restent dans ton historique. Action définitive.",
      cta: "Supprimer définitivement",
      danger: true,
    },
  };
  const t = ask ? texts[ask] : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!relay.archived && (
        <button type="button" onClick={copy} className={btn} aria-label={`Copier l'URL de ${relay.name}`}>
          <span aria-live="polite">{copied ? "Copié" : "Copier l'URL"}</span>
        </button>
      )}
      {showView && (
        <button type="button" onClick={onView} className={btn}>
          Voir
        </button>
      )}
      <div ref={menuRef} className="relative">
        <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-haspopup="menu" className={btn} aria-label={`Plus d'actions pour ${relay.name}`}>
          Plus
        </button>
        {menu && (
          <div role="menu" className="absolute right-0 top-12 z-20 w-56 overflow-hidden rounded-xl border border-line bg-background py-1 shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
            {!relay.archived && relay.record_available && (
              <button type="button" role="menuitemcheckbox" aria-checked={relay.record} onClick={toggleRecord} className="block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-foreground/10">
                {relay.record ? "Arrêter l'enregistrement" : "Enregistrer le flux"}
              </button>
            )}
            {!relay.archived && relay.record_available && (
              <button type="button" role="menuitem" onClick={toggleFormat} className="block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-foreground/10">
                Format : {relay.record_format === "mp4" ? "MP4" : "MOV"} <span className="text-muted">(passer en {relay.record_format === "mp4" ? "MOV" : "MP4"})</span>
              </button>
            )}
            {(
              [
                ["rename", "Renommer"],
                ...(relay.archived ? [] : [["trigger", "Déclenchement de la bascule"]]),
                ...(otherServers.length > 0 ? [["server", "Changer de serveur"]] : []),
                ...(relay.archived ? [] : [["rotate", "Régénérer la clé"]]),
                ["archive", relay.archived ? "Réactiver" : "Archiver"],
                ["delete", "Supprimer"],
              ] as [Exclude<Pending, null>, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="menuitem"
                onClick={() => open(k)}
                className={`block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-foreground/10 ${k === "delete" ? "text-red-300" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {relay.record && !relay.archived && (
        <span className="inline-flex h-10 items-center rounded-full border border-line px-3 font-mono text-xs uppercase tracking-wide text-muted">Enregistrement activé</span>
      )}
      {!ask && error && (
        <p role="alert" className="w-full text-sm text-red-400">
          {error}
        </p>
      )}

      <dialog
        ref={dialog}
        onClose={() => setAsk(null)}
        onClick={(e) => e.target === dialog.current && setAsk(null)}
        aria-labelledby={`ask-${relay.id}`}
        className="m-auto w-[min(480px,calc(100vw-2rem))] rounded-2xl border border-line bg-background p-0 text-foreground backdrop:bg-background/80 backdrop:backdrop-blur-sm"
      >
        {t && (
          <form
            className="p-6"
            onSubmit={(e) => {
              e.preventDefault();
              confirm();
            }}
          >
            <h2 id={`ask-${relay.id}`} className="text-lg font-semibold tracking-tight">
              {t.title}
            </h2>
            <p className="mt-1 text-sm text-muted">{relay.name}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">{t.body}</p>
            {ask === "rename" && (
              <div className="mt-4">
                <label htmlFor={`name-${relay.id}`} className="text-sm">
                  Nom de la caméra
                </label>
                <input
                  id={`name-${relay.id}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  autoFocus
                  className="mt-2 h-11 w-full rounded-xl border border-line bg-background px-4 text-sm text-foreground focus:border-foreground/70 focus:outline-none"
                />
              </div>
            )}
            {ask === "trigger" && (
              <fieldset className="mt-4 grid gap-2">
                <legend className="sr-only">Déclenchement</legend>
                {TRIGGERS.map((x) => (
                  <label key={x.id} className={`cursor-pointer rounded-xl border p-3 text-sm transition-colors ${trig === x.id ? "border-foreground" : "border-line hover:border-line-strong"}`}>
                    <span className="flex items-center gap-2 font-medium">
                      <input type="radio" name={`trigger-${relay.id}`} checked={trig === x.id} onChange={() => setTrig(x.id)} className="accent-current" />
                      {x.title}
                    </span>
                    <span className="mt-1 block pl-6 text-xs text-muted">{x.text}</span>
                  </label>
                ))}
              </fieldset>
            )}
            {ask === "server" && (
              <div className="mt-4">
                <label htmlFor={`server-${relay.id}`} className="text-sm">
                  Nouveau serveur
                </label>
                <select
                  id={`server-${relay.id}`}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-line bg-background px-4 text-sm text-foreground focus:border-foreground/70 focus:outline-none"
                >
                  {otherServers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {flag(s.cc)} {s.city}, {s.country}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={pending || (ask === "rename" && !name.trim()) || (ask === "server" && !target)}
                className={`h-11 whitespace-nowrap rounded-full px-5 text-sm font-medium transition-colors disabled:opacity-60 ${
                  t.danger ? "border border-red-400/40 text-red-300 hover:bg-red-400/10" : "bg-accent text-on-accent hover:bg-accent-hover"
                }`}
              >
                {pending ? "Un instant…" : t.cta}
              </button>
              <button type="button" onClick={() => setAsk(null)} className="h-11 px-4 text-sm text-muted hover:text-foreground">
                Annuler
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
