"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import MultiChat, { type ChatDefaults } from "../dashboard/MultiChat";
import AutoSheet from "./AutoSheet";
import { SourceEditor } from "./EditTools";
import { GuardianBar } from "./GuardianBar";
import LivePanel from "./LivePanel";
import MixerPanel from "./MixerPanel";
import MultistreamPanel from "./MultistreamPanel";
import ProgramView from "./ProgramView";
import ScenesPanel from "./ScenesPanel";
import SettingsPanel from "./SettingsPanel";
import SourcesPanel from "./SourcesPanel";
import type { Rights } from "./types";
import { btn, clock, Confirm, cx, field, Icon, Sheet, Toasts, type ConfirmAsk, type IconName } from "./ui";
import { useObs, type Obs } from "./useObs";

// Contrôle à distance : l'interface d'OBS dans un onglet. Chaque bouton agit sur le VRAI OBS du poste (par le plugin SYXTEE), et ce
// que l'on change dans OBS se reflète ici en moins d'une seconde. Le direct et l'enregistrement tournent sur l'ordinateur :
// ce navigateur (téléphone en 4G compris) ne fait que commander.
//
// Grand écran : aperçu, quatre docks (scènes, sources, mélangeur, commandes/multistream), chat à droite, barre d'état en bas.
// Téléphone : aperçu fixe en haut, un panneau à la fois choisi dans la barre du bas ; en paysage, l'aperçu passe à gauche.

type Tab = "scenes" | "sources" | "mixer" | "live" | "multi" | "chat";

const subscribe = (cb: () => void) => {
  const q = window.matchMedia("(min-width: 1024px)");
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};
/** Grand écran ou non : un seul des deux agencements est monté (donc un seul chat, une seule vidéo). */
function useDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

const subLand = (cb: () => void) => {
  const q = window.matchMedia("(orientation: landscape)");
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};
/** Téléphone tenu en paysage : l'aperçu passe à gauche et prend toute la hauteur. */
function useLandscape() {
  return useSyncExternalStore(
    subLand,
    () => window.matchMedia("(orientation: landscape)").matches,
    () => false,
  );
}

const demoDefaults: Rights = { prises: true, cams: 6 };

/** `demoToken` : pages de démo des captures (le jeton de session n'est pas demandé). */
export default function RemoteObs({
  coreUrl,
  deviceId,
  demoToken,
  invite,
  chatDefaults,
  rights = demoDefaults,
}: {
  coreUrl: string;
  deviceId: string;
  /** Droits de la formule pour la régie : prises (drone, autres sources) et caméras de la régie IA (le Core applique les mêmes limites). */
  rights?: Rights;
  demoToken?: string;
  /** Chaînes du propriétaire pour le chat (absent pour un invité). */
  chatDefaults?: ChatDefaults;
  /** Secret d'un lien d'invitation : l'invité pilote sans compte, avec les droits de son invitation. */
  invite?: string;
}) {
  const o = useObs({ coreUrl, deviceId, demoToken, invite, rights });
  const desktop = useDesktop();
  const landscape = useLandscape();
  const [tab, setTab] = useState<Tab>("scenes");
  const [dock, setDock] = useState<"live" | "multi">("live");
  const [chatOn, setChatOn] = useState(true);
  const [autoOpen, setAutoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [edit, setEdit] = useState<"props" | "filters" | null>(null);
  const [ask, setAsk] = useState<ConfirmAsk>(null);

  // Chat : affiché ou non, choix gardé dans ce navigateur.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (localStorage.getItem("syxtee-remote-chat") === "off") setChatOn(false);
      } catch {
        // stockage indisponible
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const toggleChat = () =>
    setChatOn((on) => {
      try {
        localStorage.setItem("syxtee-remote-chat", on ? "off" : "on");
      } catch {
        // stockage indisponible
      }
      return !on;
    });

  const onLive = useCallback(() => {
    setAsk(
      o.streaming
        ? { title: "Arrêter le direct ?", text: `Le direct de ${o.agent.name ?? "ce poste"} s'arrête tout de suite pour tes spectateurs (${clock(o.stats?.streamMs ?? 0)} de direct).`, ok: "Arrêter le direct", danger: true, run: o.stopStream }
        : { title: "Partir en direct ?", text: `OBS sur ${o.agent.name ?? "ce poste"} commence à diffuser vers ta plateforme avec la scène « ${o.program} ».`, ok: "Partir en direct", run: o.startStream },
    );
  }, [o.streaming, o.agent.name, o.stats?.streamMs, o.program, o.stopStream, o.startStream]);

  const showChat = !!chatDefaults;
  const tabs: [Tab, string, IconName][] = [
    ["scenes", "Scènes", "scenes"],
    ["sources", "Sources", "sources"],
    ["mixer", "Audio", "mixer"],
    ["live", "Direct", "live"],
    ["multi", "Multi", "multi"],
    ...(showChat ? ([["chat", "Chat", "chat"]] as [Tab, string, IconName][]) : []),
  ];
  // Un onglet qui n'existe plus (chat retiré) ramène aux scènes.
  const activeTab: Tab = tabs.some(([id]) => id === tab) ? tab : "scenes";
  const onTabKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex(([id]) => id === activeTab);
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    const t = tabs[(next + tabs.length) % tabs.length][0];
    setTab(t);
    document.getElementById(`rtab-${t}`)?.focus();
  };

  const chatBox = chatDefaults ? (
    <div className="h-full min-h-0 overflow-hidden rounded-xl border border-line bg-surface">
      <MultiChat defaults={chatDefaults} height="h-full" compact />
    </div>
  ) : null;

  return (
    <div className="flex h-dvh w-full min-w-0 max-w-[100vw] flex-col overflow-hidden overscroll-none bg-background pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)] text-sm text-foreground [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] [touch-action:manipulation] max-lg:pb-[env(safe-area-inset-bottom)]">
      <TopBar o={o} desktop={desktop} chatOn={chatOn} showChat={showChat} onChat={toggleChat} onAuto={() => setAutoOpen(true)} invited={!!invite} />
      <StatusStrip o={o} desktop={desktop} />
      <Alerts o={o} invited={!!invite} />
      {o.link === "on" && o.owner && <GuardianBar guardian={o.guardian} agentOnline={o.agent.online} call={o.call} />}

      {desktop ? (
        <div className="flex min-h-0 flex-1">
          <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2">
            <AudioAlert o={o} />
            <ProgramView o={o} className="min-h-0 flex-1" />
            <div className="grid h-64 shrink-0 grid-cols-[minmax(9rem,1fr)_minmax(10rem,1fr)_minmax(14rem,1.5fr)_minmax(13rem,1fr)] gap-2 xl:h-72">
              <ScenesPanel o={o} />
              <SourcesPanel o={o} onEdit={setEdit} />
              <MixerPanel o={o} />
              <div className="flex min-h-0 min-w-0 flex-col gap-1">
                <div className="min-h-0 flex-1">
                  {dock === "live" ? (
                    <LivePanel o={o} onLive={onLive} onSettings={() => setSettingsOpen(true)} className="h-full" />
                  ) : (
                    <MultistreamPanel state={o.ms} mainLive={o.streaming} call={o.call} ready={o.ready} canControl={o.canLive} canEdit={!o.guest} onChange={o.setMs} />
                  )}
                </div>
                <div role="tablist" aria-label="Dock" className="flex shrink-0 justify-end gap-1">
                  {(
                    [
                      ["live", "Commandes"],
                      ["multi", "Multistream"],
                    ] as const
                  ).map(([id, text]) => (
                    <button key={id} type="button" role="tab" aria-selected={dock === id} onClick={() => setDock(id)} className={cx("h-7 rounded-md px-3 text-xs transition-colors", dock === id ? "bg-foreground/15 text-foreground" : "text-muted hover:bg-foreground/[0.07] hover:text-foreground")}>
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </main>
          {chatBox && chatOn && (
            <aside aria-label="Chat" className="min-h-0 w-[22rem] shrink-0 py-2 pr-2 xl:w-[26rem]">
              {chatBox}
            </aside>
          )}
        </div>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col gap-2 p-2 landscape:flex-row">
          <div className="flex min-h-0 shrink-0 flex-col gap-2 landscape:w-[52%]">
            <AudioAlert o={o} />
            <ProgramView o={o} ratio={!landscape} className="landscape:flex-1" />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            <div role="tabpanel" id={`rpanel-${activeTab}`} aria-labelledby={`rtab-${activeTab}`} className="flex min-h-0 flex-1 flex-col">
              {activeTab === "scenes" && <ScenesPanel o={o} className="flex-1" />}
              {activeTab === "sources" && <SourcesPanel o={o} onEdit={setEdit} className="flex-1" />}
              {activeTab === "mixer" && <MixerPanel o={o} className="flex-1" />}
              {activeTab === "live" && <LivePanel o={o} onLive={onLive} onSettings={() => setSettingsOpen(true)} className="flex-1" />}
              {activeTab === "multi" && <MultistreamPanel state={o.ms} mainLive={o.streaming} call={o.call} ready={o.ready} canControl={o.canLive} canEdit={!o.guest} onChange={o.setMs} />}
              {activeTab === "chat" && chatBox}
            </div>
            <nav role="tablist" aria-label="Panneaux" onKeyDown={onTabKey} className={cx("grid shrink-0 rounded-xl border border-line bg-surface p-1", tabs.length === 6 ? "grid-cols-6" : "grid-cols-5")}>
              {tabs.map(([id, text, icon]) => {
                const on = id === activeTab;
                return (
                  <button
                    key={id}
                    id={`rtab-${id}`}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    aria-controls={`rpanel-${id}`}
                    tabIndex={on ? 0 : -1}
                    onClick={() => setTab(id)}
                    className={cx("relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] transition-colors active:scale-[0.97] motion-reduce:active:scale-100", on ? "bg-foreground/10 text-foreground" : "text-muted")}
                  >
                    <Icon name={icon} className="size-[22px]" />
                    <span className="max-w-full truncate">{text}</span>
                    {id === "live" && o.streaming && <span aria-hidden="true" className="live-dot absolute right-2 top-1.5" />}
                  </button>
                );
              })}
            </nav>
          </div>
        </main>
      )}

      {desktop && <StatusBar o={o} />}

      <AutoSheet o={o} rights={rights} open={autoOpen} onClose={() => setAutoOpen(false)} />
      <Sheet open={settingsOpen && o.owner} onClose={() => setSettingsOpen(false)} title="Paramètres d'OBS" size="lg">
        {settingsOpen && <SettingsPanel call={o.call} streaming={o.streaming} canRestart={o.guardian.online} onRestart={() => void o.run("guardian.restartObs")} onClose={() => setSettingsOpen(false)} />}
      </Sheet>
      <Sheet open={!!edit && !!o.selectedItem} onClose={() => setEdit(null)} title={`${edit === "filters" ? "Filtres" : "Propriétés"} · ${o.selectedItem?.name ?? ""}`}>
        {edit && o.selectedItem && <SourceEditor call={o.call} sceneName={o.editing} itemId={o.selectedItem.id} name={o.selectedItem.name} kind={o.selectedItem.kind} canEdit={o.ready && o.canLive} only={edit} />}
      </Sheet>
      <Confirm ask={ask} onClose={() => setAsk(null)} />
      <Toasts list={o.toasts.list} dismiss={o.toasts.dismiss} />
    </div>
  );
}

// ── Barre du haut ────────────────────────────────────────────────────────────────────────────────────────────────────

function TopBar({ o, desktop, chatOn, showChat, onChat, onAuto, invited }: { o: Obs; desktop: boolean; chatOn: boolean; showChat: boolean; onChat: () => void; onAuto: () => void; invited: boolean }) {
  const autoOn = !!o.roles && (o.roles.enabled || !!o.roles.autoEnabled);
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3 lg:h-12 lg:px-3.5">
      {!o.guest && !invited && (
        <Link href="/dashboard/controle-a-distance" aria-label="Retour au tableau de bord" className="-ml-1 grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-foreground/10 hover:text-foreground">
          <Icon name="back" className="size-5" />
        </Link>
      )}
      <h1 className="min-w-0 truncate text-[15px] font-semibold tracking-tight">Contrôle à distance</h1>
      {o.streaming && (
        <span role="status" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-live/50 bg-live/10 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-live">
          <span aria-hidden="true" className="live-dot" />
          <span className="max-sm:sr-only">En direct</span>
          <span className="tabular-nums">{clock(o.stats?.streamMs ?? 0)}</span>
        </span>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {o.guest && (
          <p className="max-w-[40vw] truncate text-[13px] text-muted" title="Tu pilotes cet OBS avec un lien d'invitation">
            Invité · {o.guest.label} · {o.guest.level === "view" ? "lecture seule" : o.guest.level === "scenes" ? "scènes et son" : "tous les droits"}
          </p>
        )}
        {!o.guest && !invited && (
          <button type="button" disabled={!o.roles} onClick={onAuto} aria-label="Régie automatique" className={btn("sm")}>
            <span aria-hidden="true" className={cx("size-2 rounded-full", autoOn ? "bg-ok" : "border border-faint")} />
            <span className="sm:hidden">Régie</span>
            <span className="max-sm:hidden">Régie auto</span>
          </button>
        )}
        {desktop && showChat && (
          <button type="button" aria-pressed={chatOn} onClick={onChat} className={cx(btn("sm"), chatOn && "!border-foreground/40 !bg-foreground/15")}>
            <Icon name="chat" className="size-4" />
            Chat
          </button>
        )}
      </div>
    </header>
  );
}

// ── Bande d'état : poste, profil, collection, flux reçu ──────────────────────────────────────────────────────────────

function StatusStrip({ o, desktop }: { o: Obs; desktop: boolean }) {
  const status = o.link === "denied" ? "Accès sur invitation" : o.link === "connecting" ? "Connexion…" : !o.agent.online ? "OBS hors ligne" : o.obsDown ? "OBS fermé" : null;
  const received = o.fluxName !== "";
  const ok = !status;
  return (
    <div className="mx-2 mt-2 flex h-12 shrink-0 items-center gap-3 overflow-x-auto rounded-xl border border-line bg-surface px-3 no-scrollbar">
      <span role="status" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-medium" title={o.latency != null ? `${o.latency} ms` : undefined}>
        <span aria-hidden="true" className={cx("size-2 rounded-full", ok ? "bg-ok" : o.link === "connecting" ? "bg-warn" : "bg-bad")} />
        {o.agent.name ?? "OBS"}
        <span className="font-mono text-xs font-normal tabular-nums text-muted">{status ?? (o.latency != null ? `${o.latency} ms` : "")}</span>
      </span>
      {desktop && !o.guest && (
        <>
          <label className="flex shrink-0 items-center gap-2 text-muted">
            Profil
            <select aria-label="Profil OBS" className={cx(field, "!h-8 !w-auto max-w-[13rem]")} disabled={!o.ready || !o.canLive || o.profiles.list.length === 0} value={o.profiles.current} onChange={(e) => o.setProfile(e.target.value)}>
              {o.profiles.list.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="flex shrink-0 items-center gap-2 text-muted">
            Collection
            <select aria-label="Collection de scènes" className={cx(field, "!h-8 !w-auto max-w-[13rem]")} disabled={!o.ready || !o.canLive || o.collections.list.length === 0} value={o.collections.current} onChange={(e) => o.setCollection(e.target.value)}>
              {o.collections.list.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </>
      )}
      <span role="status" className={cx("flex shrink-0 items-center gap-2 whitespace-nowrap", received ? "text-ok" : "text-warn")}>
        <span aria-hidden="true" className={cx("size-2 rounded-full", received ? "bg-ok" : "bg-warn")} />
        {received ? o.fluxName : o.noFluxSource ? "Aucun flux dans OBS" : "Aucun flux reçu"}
      </span>
      {o.noFluxSource && !o.guest && (
        <button type="button" disabled={o.fixing} onClick={() => void o.fixFlux()} className={cx(btn("sm"), "!border-warn/60 !text-warn")}>
          {o.fixing ? "Correction…" : "Corriger"}
        </button>
      )}
    </div>
  );
}

// ── Alertes ──────────────────────────────────────────────────────────────────────────────────────────────────────────

function Alerts({ o, invited }: { o: Obs; invited: boolean }) {
  let text = "";
  let action: { label: string; run: () => void } | null = null;
  if (o.link === "denied") text = o.guest || invited ? "Ce lien d'invitation n'est plus valable : il a été retiré ou il a expiré." : "Le contrôle à distance est réservé aux comptes invités.";
  else if (o.link === "connecting") text = "Connexion au serveur…";
  else if (o.link === "off") {
    text = "Connexion perdue : nouvelle tentative…";
    action = { label: "Réessayer maintenant", run: o.reconnect };
  } else if (!o.agent.online) text = "Cet OBS n'est plus en ligne. Ouvre OBS sur l'ordinateur : le contrôle reprend tout seul.";
  else if (o.obsDown) text = "OBS vient de se fermer. Le contrôle reprend dès qu'il est rouvert.";
  else if (o.loadErrors.length > 0) {
    text = `OBS n'a pas répondu à : ${o.loadErrors.join(" ; ")}`;
    action = { label: "Recharger", run: o.retry };
  }
  if (!text) return null;
  return (
    <div role="alert" className="mx-2 mt-2 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-warn/50 bg-warn/10 px-3.5 py-2.5 text-sm text-warn">
      <Icon name="alert" className="size-4" />
      <span className="min-w-0 flex-1 break-words">{text}</span>
      {action && (
        <button type="button" onClick={action.run} className={btn("sm")}>
          <Icon name="refresh" className="size-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}

function AudioAlert({ o }: { o: Obs }) {
  const r = o.roles;
  if (!r || !(r.audioState === "silent" || r.audioState === "muted" || r.audioState === "backup")) return null;
  return (
    <p role="alert" className="shrink-0 rounded-xl border border-warn/50 bg-warn/10 px-3.5 py-2.5 text-sm text-warn">
      {r.audioState === "backup" ? `Micro « ${r.audioSource} » muet : scène de secours à l'antenne, retour sur Live quand le son repart.` : r.audioState === "muted" ? `Micro « ${r.audioSource} » coupé : personne ne t'entend.` : `Silence sur « ${r.audioSource} » depuis plus de ${r.audioSeconds ?? 10} s : vérifie ton micro.`}
    </p>
  );
}

// ── Barre d'état, comme en bas d'OBS (grand écran) ───────────────────────────────────────────────────────────────────

function StatusBar({ o }: { o: Obs }) {
  const s = o.stats;
  return (
    <footer aria-label="État d'OBS" className="flex h-8 shrink-0 items-center justify-end gap-5 border-t border-line px-3.5 font-mono text-xs tabular-nums text-muted">
      <span title="Débit du direct">{o.streaming && s?.kbps != null ? `${s.kbps} kbit/s` : ""}</span>
      <span className="inline-flex items-center gap-1.5" title="Durée du direct">
        <span aria-hidden="true" className={cx("size-2 rounded-full", o.streaming ? "bg-live" : "border border-faint")} />
        {clock(o.streaming ? (s?.streamMs ?? 0) : 0)}
      </span>
      <span className="inline-flex items-center gap-1.5" title="Durée de l'enregistrement">
        <span aria-hidden="true" className={cx("size-2 rounded-full", o.recording ? "bg-bad" : "border border-faint")} />
        {clock(o.recording ? (s?.recMs ?? 0) : 0)}
      </span>
      <span>CPU : {s ? `${s.cpu} %` : "—"}</span>
      <span>{s ? `${s.fps} FPS` : "— FPS"}</span>
    </footer>
  );
}
