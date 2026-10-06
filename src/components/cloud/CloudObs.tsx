"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLiveStatus } from "../dashboard/LiveStatus";
import AudioMixer from "../mix/AudioMixer";
import DirectPanel, { type LiveState } from "../mix/DirectPanel";
import Drawer from "../mix/Drawer";
import ObsLinkPanel from "../mix/ObsLinkPanel";
import { RelayStreamsProvider } from "../mix/streams";
import Wordmark from "../Wordmark";
import { CommutateurDock, Dock, ScenesDock, SourcesDock, TransitionsDock, type TransitionKind } from "./Docks";
import SceneScreen from "./SceneScreen";
import { ArrowLeft, CaretDown, LinkSimple, Lock, LockOpen } from "@/components/icons";
import { saveAudioSettings } from "@/app/(studio)/commutateur/actions";
import { defaultScenes, moveItem, newItem, newScene, parseScenes, sceneRelayIds, uniqueName, type Scene } from "@/lib/cloud-scenes";
import { DEFAULT_AUDIO, type AudioMode, type AudioSettings } from "@/lib/mix-audio";
import { INITIAL_RELAYS, stepStats, tc, type MixRelay, type Protocol } from "@/lib/mix-sim";

// SYXTEE OBS CLOUD : l'interface d'OBS Studio, 100 % dans le cloud (aucun OBS à installer). Même rangement qu'OBS : aperçu et
// programme au centre, puis les docks Scènes, Sources, Mélangeur audio, Transitions de scènes, Contrôles. Choisir une scène
// l'affiche ; choisir une source l'entoure dans l'image. Le Commutateur (vue multiple de toutes les scènes, CUT / AUTO) est un dock de plus.
// MAQUETTE : la liste des relais est réelle, la composition, le direct et l'enregistrement sont simulés en attendant le serveur média.

export type RealRelay = { id: string; name: string; protocol: Protocol; live: boolean };

const HOST = "mix.syxtee.net";
const newToken = () => Array.from({ length: 24 }, () => "abcdefghijkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 32)]).join("");

const DOCKS = [
  ["commutateur", "Commutateur"],
  ["scenes", "Scènes"],
  ["sources", "Sources"],
  ["mixeur", "Mélangeur audio"],
  ["transitions", "Transitions de scènes"],
  ["controles", "Contrôles"],
] as const;
type DockId = (typeof DOCKS)[number][0];

const store = {
  get(key: string): unknown {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },
  set(key: string, v: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      // Stockage refusé (navigation privée) : les réglages restent valables pour la session.
    }
  },
};

export default function CloudObs({ account, real, coreUrl, initialAudio = DEFAULT_AUDIO, persist = true }: { account: string; real: RealRelay[]; coreUrl: string; initialAudio?: AudioSettings; persist?: boolean }) {
  const { state: liveState } = useLiveStatus();
  const [useReal, setUseReal] = useState(real.length > 0);
  const [demoRelays, setDemoRelays] = useState<MixRelay[]>(INITIAL_RELAYS);
  const [ping, setPing] = useState(21);

  // Relais réels : nom, protocole et état viennent du compte ; le débit du relais en direct vient du Core.
  const realRelays = useMemo<MixRelay[]>(
    () =>
      real.slice(0, 8).map((r, i) => {
        const live = liveState?.relays?.find((x) => x.id === r.id)?.live ?? r.live;
        return {
          id: r.id, n: i + 1, name: r.name, device: r.protocol.toUpperCase(), protocol: r.protocol, status: live ? "live" : "offline", scene: "street",
          kbps: live && liveState?.relay_id === r.id ? (liveState?.kbps ?? 0) : 0, fps: 0, res: "-", latencyMs: 0, lossPct: 0, links: 0, uptime: 0, volume: 0, mute: !live, solo: false, real: true,
        };
      }),
    [real, liveState],
  );
  const relays = useReal ? realRelays : demoRelays;
  const demo = !useReal;

  useEffect(() => {
    const t = setInterval(() => {
      setDemoRelays((r) => stepStats(r));
      setPing(18 + Math.round(Math.random() * 8));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const patchRelay = useCallback((id: string, patch: Partial<MixRelay>) => setDemoRelays((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r))), []);
  const liveIds = useReal ? relays.filter((r) => r.status !== "offline").map((r) => r.id) : [];

  return (
    <RelayStreamsProvider coreUrl={useReal ? coreUrl : ""} liveIds={liveIds}>
      {/* key : un jeu de scènes par mode (démo / mes relais), les identifiants de relais ne sont pas les mêmes. */}
      <Desk key={useReal ? "real" : "demo"} account={account} relays={relays} demo={demo} canReal={real.length > 0} onToggleReal={() => setUseReal((v) => !v)} onPatch={patchRelay} ping={ping} initialAudio={initialAudio} persist={persist} />
    </RelayStreamsProvider>
  );
}

function Desk({ account, relays, demo, canReal, onToggleReal, onPatch, ping, initialAudio, persist }: { account: string; relays: MixRelay[]; demo: boolean; canReal: boolean; onToggleReal: () => void; onPatch: (id: string, p: Partial<MixRelay>) => void; ping: number; initialAudio: AudioSettings; persist: boolean }) {
  const scenesKey = `syxtee-cloud-scenes-${demo ? "demo" : "real"}`;
  const [scenes, setScenes] = useState<Scene[]>(() => defaultScenes(relays));
  const [loaded, setLoaded] = useState(false);
  const [programId, setProgramId] = useState(() => scenes[0]?.id ?? "");
  const [previewId, setPreviewId] = useState(() => scenes[1]?.id ?? scenes[0]?.id ?? "");
  const [studio, setStudio] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [transition, setTransition] = useState<TransitionKind>("mix");
  const [duration, setDuration] = useState(500);
  const [programMs, setProgramMs] = useState(0);
  const [hidden, setHidden] = useState<DockId[]>([]);
  const [docksMenu, setDocksMenu] = useState(false);
  const [protection, setProtection] = useState(false);
  const [slate, setSlate] = useState(false);
  const [audio, setAudioState] = useState<AudioSettings>(initialAudio);
  const [askMode, setAskMode] = useState<AudioMode | null>(null);
  const [master, setMaster] = useState(0);
  const [masterMute, setMasterMute] = useState(false);
  const [listen, setListen] = useState<string | null>(null);
  const [live, setLive] = useState<LiveState>("idle");
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [rec, setRec] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [clock, setClock] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [token, setToken] = useState("k7m2xq9dr4vh8tnw3bcf5pzs");
  const [toast, setToast] = useState<string | null>(null);
  const docksBox = useRef<HTMLDivElement>(null);
  const locked = protection;

  // Scènes et docks mémorisés dans ce navigateur (V1, comme les caméras DJI), relus après l'affichage pour ne pas casser l'hydratation.
  useEffect(() => {
    const saved = parseScenes(store.get(scenesKey), relays.map((r) => r.id));
    const h = store.get("syxtee-cloud-docks");
    /* eslint-disable react-hooks/set-state-in-effect */
    if (saved) {
      setScenes(saved);
      setProgramId(saved[0].id);
      setPreviewId((saved[1] ?? saved[0]).id);
    }
    if (Array.isArray(h)) setHidden(h.filter((x): x is DockId => DOCKS.some(([id]) => id === x)));
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [scenesKey, relays]);
  useEffect(() => {
    if (loaded) store.set(scenesKey, scenes);
  }, [loaded, scenes, scenesKey]);
  useEffect(() => {
    if (loaded) store.set("syxtee-cloud-docks", hidden);
  }, [loaded, hidden]);

  useEffect(() => {
    const t = setInterval(() => {
      setClock((c) => c + 1);
      setLiveSeconds((s) => s + 1);
      setRecSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Menu Docks : clic à côté ou Échap pour fermer.
  useEffect(() => {
    if (!docksMenu) return;
    const away = (e: PointerEvent) => !docksBox.current?.contains(e.target as Node) && setDocksMenu(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setDocksMenu(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [docksMenu]);

  const say = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast((cur) => (cur === m ? null : cur)), 2600);
  }, []);
  const mockOnly = (what: string) => say(`${what} : disponible quand le serveur média sera branché (maquette).`);
  const byId = useCallback((id: string) => relays.find((r) => r.id === id), [relays]);

  // Comme OBS : en Mode Studio on édite la scène d'aperçu, sinon celle du programme.
  const editId = studio ? previewId : programId;
  const editScene = scenes.find((s) => s.id === editId);
  const fadeMs = transition === "cut" ? 0 : duration;

  const patchScene = (id: string, fn: (s: Scene) => Scene) => setScenes((all) => all.map((s) => (s.id === id ? fn(s) : s)));

  // Choisir une scène l'affiche : en direct (programme) hors Mode Studio, en aperçu en Mode Studio.
  const pickScene = (id: string) => {
    if (locked) return;
    setSelectedItem(null);
    if (studio) setPreviewId(id);
    else {
      setProgramMs(fadeMs);
      setProgramId(id);
      setPreviewId(id);
    }
  };
  const sceneToProgram = (id: string) => {
    if (locked) return;
    setSelectedItem(null);
    setProgramMs(fadeMs);
    if (studio && id !== programId) setPreviewId(programId);
    setProgramId(id);
  };
  const send = (ms: number) => {
    if (locked || !studio || previewId === programId) return;
    setProgramMs(ms);
    setProgramId(previewId);
    setPreviewId(programId);
    setSelectedItem(null);
  };

  const addScene = () => {
    const s = newScene(uniqueName("Scène", scenes.map((x) => x.name)));
    setScenes((all) => [...all, s]);
    pickScene(s.id);
  };
  const removeScene = (id: string) => {
    if (scenes.length < 2) return;
    const rest = scenes.filter((s) => s.id !== id);
    setScenes(rest);
    if (programId === id) setProgramId(rest[0].id);
    if (previewId === id || !rest.some((s) => s.id === previewId)) setPreviewId((rest.find((s) => s.id !== programId) ?? rest[0]).id);
    setSelectedItem(null);
  };

  // Réglages audio : mémorisés par compte. Changer de mode pendant un direct ou un REC demande une confirmation.
  const applyAudio = useCallback(
    (patch: Partial<AudioSettings>) => {
      const next = { ...audio, ...patch };
      setAudioState(next);
      if (persist) void saveAudioSettings(next).then((r) => !r.ok && say("Réglage audio non mémorisé (migration 0031 à appliquer)."));
    },
    [audio, persist, say],
  );
  const changeAudio = (patch: Partial<AudioSettings>) => {
    if (locked) return;
    if (patch.mode && patch.mode !== audio.mode && (live === "live" || rec)) return setAskMode(patch.mode);
    applyAudio(patch);
  };

  const toggleLive = () => {
    if (live === "live") return setLive("idle");
    setLive("starting");
    setTimeout(() => {
      setLive("live");
      setLiveSeconds(0);
    }, 1500);
  };
  const toggleRec = () => {
    if (rec) return setRec(false);
    setRecSeconds(0);
    setRec(true);
  };

  const shown = (id: DockId) => !hidden.includes(id);
  const toggleDock = (id: DockId) => setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
  const online = relays.filter((r) => r.status !== "offline").length;
  const programRelays = sceneRelayIds(scenes.find((s) => s.id === programId));
  const previewRelays = studio ? sceneRelayIds(scenes.find((s) => s.id === previewId)) : [];

  const frame = "relative aspect-video w-full [container-type:size] lg:aspect-auto lg:h-full lg:min-h-0 lg:flex-1";
  const pane = (title: string, tone: string, child: React.ReactNode) => (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
      <p className={`font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${tone}`}>{title}</p>
      <div className={frame}>
        <div className="absolute inset-0 grid place-items-center">{child}</div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col gap-2 p-2 lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between gap-x-3 rounded-lg border border-line bg-surface px-2 pt-[env(safe-area-inset-top)] sm:px-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" aria-label="Retour au dashboard" title="Retour au dashboard" className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-muted transition-colors hover:bg-foreground/10 hover:text-foreground">
            <ArrowLeft size={16} aria-hidden="true" />
          </Link>
          <span className="hidden min-[420px]:inline">
            <Wordmark name="COMMUTATEUR" />
          </span>
          <span className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted sm:inline">OBS CLOUD</span>
          {canReal ? (
            <button type="button" onClick={onToggleReal} title={demo ? "Passer à mes vrais relais" : "Revenir à la démonstration"} className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted transition-colors hover:bg-foreground/10 hover:text-foreground">
              {demo ? "DÉMO" : "MES RELAIS"}
            </button>
          ) : (
            demo && <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted">DÉMO</span>
          )}
          <div ref={docksBox} className="relative">
            <button type="button" aria-haspopup="menu" aria-expanded={docksMenu} onClick={() => setDocksMenu((v) => !v)} className="inline-flex h-8 items-center gap-1 rounded-md border border-line px-2.5 text-xs font-medium transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50">
              Docks
              <CaretDown size={12} aria-hidden="true" />
            </button>
            {docksMenu && (
              <ul role="menu" aria-label="Docks" className="absolute left-0 top-10 z-40 w-56 rounded-lg border border-line-strong bg-background p-1 shadow-lg">
                {DOCKS.map(([id, name]) => (
                  <li key={id} role="none">
                    <button type="button" role="menuitemcheckbox" aria-checked={shown(id)} onClick={() => toggleDock(id)} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50">
                      {name}
                      <span aria-hidden="true" className="font-mono text-[10px] text-muted">{shown(id) ? "✓" : ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={() => setProtection((v) => !v)} aria-pressed={protection} className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 font-mono text-[11px] font-semibold tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 ${protection ? "border-live bg-live/15 text-foreground" : "border-line-strong text-muted hover:text-foreground"}`}>
            {protection ? <Lock size={14} weight="fill" aria-hidden="true" /> : <LockOpen size={14} aria-hidden="true" />}
            <span className="hidden sm:inline">PROTECTION </span>
            {protection ? "ON" : "OFF"}
          </button>
          <button type="button" onClick={() => setDrawer(true)} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-line px-2.5 text-xs font-medium transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50">
            <LinkSimple size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Lien OBS</span>
          </button>
        </div>
      </header>

      {protection && (
        <p role="status" className="shrink-0 rounded-md border border-live bg-live/15 px-3 py-0.5 text-center font-mono text-[10px] font-semibold tracking-[0.2em]">
          PROTECTION ACTIVE · scènes, sources, audio, direct et enregistrement verrouillés
        </p>
      )}

      {/* Centre : aperçu / programme, et le Commutateur à droite. */}
      <div className="flex min-h-0 shrink-0 flex-col gap-2 lg:flex-[1.25] lg:shrink lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 rounded-lg border border-line bg-surface p-2 sm:flex-row">
          {studio ? (
            <>
              {pane("Aperçu", "text-emerald-500", <SceneScreen sceneId={previewId} scenes={scenes} byId={byId} kind="preview" ms={0} selectedItem={selectedItem} tag={scenes.find((s) => s.id === previewId)?.name} />)}
              <div className="flex shrink-0 flex-row items-center justify-center gap-2 sm:flex-col">
                <button type="button" disabled={locked || previewId === programId} onClick={() => send(fadeMs)} className="h-9 rounded-md bg-accent px-3 font-mono text-[11px] font-semibold tracking-wider text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40">
                  TRANSITION
                </button>
                <button type="button" disabled={locked || previewId === programId} onClick={() => send(0)} className="h-9 rounded-md border border-line-strong px-3 font-mono text-[11px] font-semibold tracking-wider hover:bg-foreground/10 disabled:cursor-not-allowed disabled:opacity-40">
                  CUT
                </button>
              </div>
              {pane("Programme", "text-live", <SceneScreen sceneId={programId} scenes={scenes} byId={byId} kind="program" ms={programMs} slate={slate} tag={scenes.find((s) => s.id === programId)?.name} />)}
            </>
          ) : (
            pane("Programme", "text-live", <SceneScreen sceneId={programId} scenes={scenes} byId={byId} kind="edit" ms={programMs} slate={slate} selectedItem={selectedItem} tag={scenes.find((s) => s.id === programId)?.name} />)
          )}
        </div>
        {shown("commutateur") && (
          <div className="h-72 shrink-0 lg:h-auto lg:w-[22rem] xl:w-[26rem]">
            <CommutateurDock scenes={scenes} byId={byId} programId={programId} previewId={previewId} studio={studio} locked={locked} onPick={pickScene} onProgram={sceneToProgram} onCut={() => send(0)} onAuto={() => send(fadeMs)} />
          </div>
        )}
      </div>

      {/* Bas : les docks d'OBS, dans son ordre. */}
      <div className="flex shrink-0 flex-col gap-2 lg:min-h-0 lg:flex-1 lg:flex-row">
        {shown("scenes") && (
          <div className="h-56 lg:h-auto lg:w-52 lg:shrink-0">
            <ScenesDock scenes={scenes} programId={programId} previewId={previewId} studio={studio} locked={locked} onPick={pickScene} onAdd={addScene} onRemove={removeScene} onRename={(id, name) => patchScene(id, (s) => ({ ...s, name }))} />
          </div>
        )}
        {shown("sources") && (
          <div className="h-56 lg:h-auto lg:w-60 lg:shrink-0">
            <SourcesDock
              scene={editScene}
              relays={relays}
              selected={selectedItem}
              locked={locked}
              onSelect={(id) => setSelectedItem((cur) => (cur === id ? null : id))}
              onAdd={(relayId) => {
                const it = newItem(relayId);
                if (editScene) patchScene(editScene.id, (s) => ({ ...s, items: [...s.items, it] }));
                setSelectedItem(it.id);
              }}
              onRemove={(id) => {
                if (editScene) patchScene(editScene.id, (s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
                setSelectedItem(null);
              }}
              onToggle={(id) => editScene && patchScene(editScene.id, (s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, visible: !i.visible } : i)) }))}
              onMove={(id, dir) => editScene && patchScene(editScene.id, (s) => ({ ...s, items: moveItem(s.items, id, dir) }))}
            />
          </div>
        )}
        {shown("mixeur") && (
          <div className="h-64 min-w-0 lg:h-auto lg:flex-1">
            <AudioMixer
              relays={relays}
              program={programRelays}
              preview={previewRelays}
              slate={slate}
              programMs={programMs}
              locked={locked}
              master={master}
              onMaster={setMaster}
              masterMute={masterMute}
              onMasterMute={() => !locked && setMasterMute((v) => !v)}
              onPatch={(id, p) => (demo ? onPatch(id, p) : mockOnly("Le mixage de tes vrais relais"))}
              settings={audio}
              onSettings={changeAudio}
              listen={listen}
              onListen={(id) => setListen((cur) => (cur === id ? null : id))}
              className="h-full"
            />
          </div>
        )}
        {shown("transitions") && (
          <div className="lg:w-44 lg:shrink-0">
            <TransitionsDock transition={transition} onTransition={setTransition} duration={duration} onDuration={setDuration} locked={locked} />
          </div>
        )}
        {shown("controles") && (
          <div className="lg:w-56 lg:shrink-0">
            <Dock title="Contrôles">
              <div className="grid gap-1.5 p-0.5">
                <label className="flex items-center justify-between gap-2 rounded-md border border-line px-2 py-1 text-xs">
                  Mode Studio
                  <input
                    type="checkbox"
                    role="switch"
                    checked={studio}
                    disabled={locked}
                    onChange={(e) => {
                      setStudio(e.target.checked);
                      setSelectedItem(null);
                      if (e.target.checked && previewId === programId) setPreviewId((scenes.find((s) => s.id !== programId) ?? scenes[0]).id);
                    }}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </label>
                <DirectPanel locked={locked} live={live} liveSeconds={liveSeconds} onLive={toggleLive} rec={rec} recSeconds={recSeconds} onRec={toggleRec} slate={slate} onSlate={() => setSlate((v) => !v)} onShot={() => say("Capture du PROGRAMME enregistrée (simulation).")} onMarker={() => say("Marqueur posé à cet instant (simulation).")} />
              </div>
            </Dock>
          </div>
        )}
      </div>

      {/* Barre d'état, comme celle d'OBS. */}
      <footer className="flex h-7 shrink-0 flex-wrap items-center gap-x-4 gap-y-0.5 overflow-hidden rounded-lg border border-line bg-surface px-3 font-mono text-[11px] tabular-nums text-muted">
        <span className={live === "live" ? "text-live" : ""}>
          {live === "live" && <span className="live-dot mr-1.5 inline-block align-middle" aria-hidden="true" />}
          LIVE {tc(live === "live" ? liveSeconds : 0)}
        </span>
        <span className={rec ? "text-live" : ""}>REC {tc(rec ? recSeconds : 0)}</span>
        <span>Cloud · {ping} ms</span>
        <span>
          Relais {online}/{relays.length}
        </span>
        <span>TC {tc(clock)}</span>
        <span className="ml-auto hidden max-w-[12rem] truncate sm:inline" data-sensitive>
          {account}
        </span>
      </footer>

      <Drawer open={drawer} title="Ton lien OBS" onClose={() => setDrawer(false)}>
        <ObsLinkPanel token={token} host={HOST} locked={locked} onRegenerate={() => setToken(newToken())} cams={relays.map((r) => r.n).sort((a, b) => a - b)} />
      </Drawer>

      {askMode && (
        <dialog
          ref={(d) => {
            if (d && !d.open) d.showModal();
          }}
          onClose={() => setAskMode(null)}
          aria-labelledby="mode-title"
          className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-background p-6 text-foreground backdrop:bg-background/80"
        >
          <h2 id="mode-title" className="text-lg font-semibold">
            Passer en {askMode === "podcast" ? "PODCAST" : "BROADCAST"} en plein direct ?
          </h2>
          <p className="mt-2 text-sm text-muted">
            {askMode === "podcast" ? "Tous les micros non coupés vont s'ouvrir dans le direct, quelle que soit la scène." : "Seuls les relais de la scène au PROGRAMME resteront audibles. Les autres seront coupés."} Le changement se fait en un fondu de 150 ms.
          </p>
          <div className="mt-5 flex gap-2">
            <button type="button" autoFocus onClick={() => (applyAudio({ mode: askMode }), setAskMode(null))} className="h-10 rounded-lg bg-accent px-5 text-sm font-medium text-on-accent hover:bg-accent-hover">
              Changer de mode
            </button>
            <button type="button" onClick={() => setAskMode(null)} className="h-10 rounded-lg border border-line px-5 text-sm hover:bg-foreground/10">
              Annuler
            </button>
          </div>
        </dialog>
      )}

      {toast && (
        <p role="status" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line-strong bg-background px-5 py-2.5 text-sm shadow-lg lg:bottom-10">
          {toast}
        </p>
      )}
    </div>
  );
}
