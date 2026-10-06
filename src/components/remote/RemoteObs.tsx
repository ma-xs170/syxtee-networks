"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ProgramPreview, { type FrameSink } from "./ProgramPreview";
import { useRemote, type LinkEvent } from "./useRemote";

// Contrôle à distance : l'interface d'OBS sur le site. Chaque bouton agit sur le VRAI OBS du poste (par le plugin SYXTEE), et ce
// que l'on change dans OBS se reflète ici en moins d'une seconde. Le direct et l'enregistrement tournent sur l'ordinateur :
// ce navigateur (téléphone en 4G compris) ne fait que commander.

type Item = { id: number; name: string; kind: string; on: boolean };
type Mix = { name: string; muted: boolean; db: number; mon: string };
type Trigger = "cut" | "cut_lowbitrate" | "sensitive";
type Roles = { enabled: boolean; source: string; scene: string; freezeSeconds: number; recoverSeconds: number; trigger: Trigger; liveScene: string; state?: string };
type Stats = { cpu: number; fps: number; kbps: number | null; dropped: number; total: number; encoder: string; congestion: number; streamMs: number; recMs: number };
type Named = { current: string; list: string[] };

const btn = "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full px-5 text-sm font-medium transition-[colors,transform] duration-150 active:scale-[0.98] disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100";
const ghost = "border border-line-strong hover:bg-foreground/5";
const card = "rounded-2xl border border-line bg-surface p-4";
const label = "font-mono text-xs uppercase tracking-[0.18em] text-muted";
const select = "h-10 max-w-full rounded-xl border border-line bg-background px-3 text-sm text-foreground disabled:opacity-40";

/** Types de sources d'OBS en français (inconnu : l'identifiant d'OBS tel quel). */
const KINDS: Record<string, string> = {
  ffmpeg_source: "Média",
  vlc_source: "Média VLC",
  browser_source: "Navigateur",
  image_source: "Image",
  slideshow: "Diaporama",
  text_ft2_source: "Texte",
  av_capture_input: "Caméra",
  av_capture_input_v2: "Caméra",
  dshow_input: "Caméra",
  v4l2_input: "Caméra",
  display_capture: "Capture d'écran",
  screen_capture: "Capture d'écran",
  window_capture: "Capture de fenêtre",
  monitor_capture: "Capture d'écran",
  coreaudio_input_capture: "Entrée audio",
  coreaudio_output_capture: "Sortie audio",
  wasapi_input_capture: "Entrée audio",
  wasapi_output_capture: "Sortie audio",
  pulse_input_capture: "Entrée audio",
  color_source_v3: "Couleur",
  color_source: "Couleur",
  scene: "Scène",
  group: "Groupe",
  syxtee_flux: "Flux SYXTEE",
};
const kindLabel = (k: string) => KINDS[k] ?? (k ? k.replace(/_/g, " ") : "Source");

const MON = [
  ["OBS_MONITORING_TYPE_NONE", "Aucun"],
  ["OBS_MONITORING_TYPE_MONITOR_ONLY", "Écoute seule"],
  ["OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT", "Écoute et sortie"],
] as const;

const TRIGGERS: { id: Trigger; title: string; text: string }[] = [
  { id: "cut", title: "Coupure seulement", text: "Bascule sur la scène de secours quand l'image se fige ou que le flux est coupé." },
  { id: "cut_lowbitrate", title: "Coupure et débit très bas", text: "Bascule aussi quand le débit du flux tombe sous 300 kbit/s, avant que l'image ne se fige." },
  { id: "sensitive", title: "Sensible", text: "Réagit aux micro-coupures : bascule dès 2 secondes d'image figée ou sous 800 kbit/s. Peut basculer un peu trop souvent." },
];

const dbToPct = (db: number) => Math.max(0, Math.min(100, ((db + 60) * 100) / 60));
const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s / 60) % 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** `demoToken` : pages de démo des captures (le jeton de session n'est pas demandé). */
export default function RemoteObs({ coreUrl, deviceId, demoToken }: { coreUrl: string; deviceId: string; demoToken?: string }) {
  const [scenes, setScenes] = useState<string[]>([]);
  const [program, setProgram] = useState("");
  const [preview, setPreview] = useState("");
  const [studioMode, setStudioMode] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [mixer, setMixer] = useState<Mix[]>([]);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [transitions, setTransitions] = useState<string[]>([]);
  const [transition, setTransition] = useState("");
  const [profiles, setProfiles] = useState<Named>({ current: "", list: [] });
  const [collections, setCollections] = useState<Named>({ current: "", list: [] });
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [roles, setRoles] = useState<Roles | null>(null);
  const [inputNames, setInputNames] = useState<string[]>([]);
  const [fluxState, setFluxState] = useState<"none" | "waiting" | "received">("none");
  const [previewOn, setPreviewOn] = useState(true);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState("");
  const [obsDown, setObsDown] = useState(false);
  const [confirm, setConfirm] = useState<"start" | "stop" | null>(null);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [sync, setSync] = useState(0);
  const frameSink: FrameSink = useRef(null);
  const previewSink: FrameSink = useRef(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dialog = useRef<HTMLDialogElement>(null);
  const devicePanel = useRef<HTMLDivElement>(null);

  const later = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => setSync((n) => n + 1), 250);
  }, []);

  const onEvent = useCallback<LinkEvent>(
    (name, d) => {
      if (name === "CurrentProgramSceneChanged") setProgram(String(d.sceneName));
      else if (name === "CurrentPreviewSceneChanged") setPreview(String(d.sceneName));
      else if (name === "StudioModeStateChanged") setStudioMode(!!d.studioModeEnabled);
      else if (name === "StreamStateChanged") setStreaming(!!d.outputActive);
      else if (name === "RecordStateChanged") {
        setRecording(!!d.outputActive);
        setPaused(String(d.outputState).includes("PAUSED"));
      } else if (name === "InputMuteStateChanged") setMixer((m) => m.map((i) => (i.name === d.inputName ? { ...i, muted: !!d.inputMuted } : i)));
      else if (name === "InputVolumeChanged") setMixer((m) => m.map((i) => (i.name === d.inputName ? { ...i, db: Number(d.inputVolumeDb) } : i)));
      else if (name === "SceneItemEnableStateChanged") setItems((l) => l.map((i) => (i.id === d.sceneItemId ? { ...i, on: !!d.sceneItemEnabled } : i)));
      else if (name === "link.levels") setLevels(d as Record<string, number>);
      else if (name === "link.preview") frameSink.current?.(String(d.image));
      else if (name === "link.studioPreview") previewSink.current?.(String(d.image));
      else if (name === "link.previewState") setPreviewOn(!!d.enabled);
      else if (name === "link.backupState") setRoles((r) => (r ? { ...r, state: String(d.state) } : r));
      else if (name === "link.stats") {
        const st = (d.stream ?? {}) as Record<string, unknown>;
        const rc = (d.record ?? {}) as Record<string, unknown>;
        setStats({
          cpu: Math.round(Number(d.cpuUsage ?? 0)),
          fps: Math.round(Number(d.activeFps ?? 0)),
          kbps: st.kbps == null ? null : Math.round(Number(st.kbps)),
          dropped: Number(st.outputSkippedFrames ?? 0),
          total: Number(st.outputTotalFrames ?? 0),
          encoder: String(st.encoder ?? ""),
          congestion: Number(st.outputCongestion ?? 0),
          streamMs: Number(st.outputDuration ?? 0),
          recMs: Number(rc.outputDuration ?? 0),
        });
      } else if (name === "link.obsClosed") setObsDown(true);
      else if (name === "link.obsOpened") setSync((n) => n + 1);
      else if (
        ["SceneListChanged", "CurrentSceneCollectionChanged", "CurrentProfileChanged", "InputCreated", "SceneCreated", "SourceRenamed", "SceneItemCreated", "SceneItemRemoved", "SceneItemListIndexingChanged"].includes(name)
      )
        later();
    },
    [later],
  );
  const { link, agent, call, latency } = useRemote(coreUrl, onEvent, deviceId, demoToken);

  const run = useCallback(
    async <T = Record<string, unknown>,>(method: string, params?: Record<string, unknown>) => {
      try {
        const r = await call<T>(method, params);
        setError("");
        return r;
      } catch (e) {
        setError((e as Error).message);
        return null;
      }
    },
    [call],
  );

  // Chargement complet de l'état d'OBS.
  const refresh = useCallback(async () => {
    const sl = await run<{ scenes: { sceneName: string }[]; currentProgramSceneName: string }>("GetSceneList");
    if (!sl) return;
    setObsDown(false);
    setScenes([...sl.scenes].reverse().map((s) => s.sceneName));
    setProgram(sl.currentProgramSceneName);
    const [sm, st, rc, il, tl, bk, pl, cl, pv] = await Promise.all([
      run<{ studioModeEnabled: boolean }>("GetStudioModeEnabled"),
      run<{ outputActive: boolean }>("GetStreamStatus"),
      run<{ outputActive: boolean; outputPaused: boolean }>("GetRecordStatus"),
      run<{ inputs: { inputName: string; inputKind?: string; hasAudio?: boolean; inputMuted?: boolean; inputVolumeMul?: number; monitorType?: string }[] }>("GetInputList"),
      run<{ transitions: { transitionName: string }[]; currentSceneTransitionName: string }>("GetSceneTransitionList"),
      run<Roles>("link.getBackup"),
      run<{ profiles: string[]; currentProfileName: string }>("GetProfileList"),
      run<{ sceneCollections: string[]; currentSceneCollectionName: string }>("GetSceneCollectionList"),
      run<{ enabled: boolean }>("link.getPreview"),
    ]);
    setStudioMode(!!sm?.studioModeEnabled);
    if (sm?.studioModeEnabled) setPreview((await run<{ currentPreviewSceneName: string }>("GetCurrentPreviewScene"))?.currentPreviewSceneName ?? "");
    setStreaming(!!st?.outputActive);
    setRecording(!!rc?.outputActive);
    setPaused(!!rc?.outputPaused);
    setTransitions((tl?.transitions ?? []).map((t) => t.transitionName));
    setTransition(tl?.currentSceneTransitionName ?? "");
    setRoles(bk);
    setProfiles({ current: pl?.currentProfileName ?? "", list: pl?.profiles ?? [] });
    setCollections({ current: cl?.currentSceneCollectionName ?? "", list: cl?.sceneCollections ?? [] });
    setPreviewOn(pv?.enabled !== false);
    const inputs = il?.inputs ?? [];
    setInputNames(inputs.map((i) => i.inputName));
    setMixer(
      inputs
        .filter((i) => i.hasAudio !== false && i.inputMuted !== undefined)
        .map((i) => ({ name: i.inputName, muted: !!i.inputMuted, db: i.inputVolumeMul && i.inputVolumeMul > 0 ? 20 * Math.log10(i.inputVolumeMul) : -100, mon: i.monitorType ?? "OBS_MONITORING_TYPE_NONE" })),
    );
  }, [run]);

  const ready = link === "on" && agent.online && !obsDown;
  // Comme dans OBS : en Mode Studio on édite la scène d'aperçu, sinon celle du programme.
  const editing = studioMode && preview ? preview : program;

  useEffect(() => {
    if (link !== "on" || !agent.online) return;
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [link, agent.online, refresh, sync]);

  // Sources de la scène éditée.
  useEffect(() => {
    if (!ready || !editing) return;
    let live = true;
    const t = setTimeout(() => {
      void run<{ sceneItems: { sceneItemId: number; sourceName: string; sceneItemEnabled: boolean; inputKind?: string; sourceType?: string }[] }>("GetSceneItemList", { sceneName: editing }).then((r) => {
        if (live && r)
          setItems(
            [...r.sceneItems].reverse().map((i) => ({ id: i.sceneItemId, name: i.sourceName, kind: i.sourceType === "OBS_SOURCE_TYPE_SCENE" ? "scene" : (i.inputKind ?? ""), on: i.sceneItemEnabled })),
          );
      });
    }, 0);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [ready, editing, run, sync]);

  // « Flux reçu » : une source « Flux … » de la collection est en lecture.
  useEffect(() => {
    if (!ready) return;
    let live = true;
    const check = async () => {
      const flux = inputNames.filter((n) => n.startsWith("Flux"));
      if (flux.length === 0) return live && setFluxState("none");
      const states = await Promise.all(flux.map((n) => call<{ mediaState: string }>("GetMediaInputStatus", { inputName: n }).then((r) => r.mediaState).catch(() => "")));
      if (live) setFluxState(states.some((s) => s.endsWith("PLAYING")) ? "received" : "waiting");
    };
    const first = setTimeout(() => void check(), 0);
    const id = setInterval(() => void check(), 3000);
    return () => {
      live = false;
      clearTimeout(first);
      clearInterval(id);
    };
  }, [ready, inputNames, call]);

  // Fenêtre de confirmation du direct.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (confirm && !d.open) d.showModal();
    if (!confirm && d.open) d.close();
  }, [confirm]);

  // Popover « Appareil » : se ferme au clic ailleurs et sur Échap.
  useEffect(() => {
    if (!deviceOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!devicePanel.current?.contains(e.target as Node)) setDeviceOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDeviceOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [deviceOpen]);

  function pick(scene: string) {
    if (studioMode) {
      setPreview(scene);
      void run("SetCurrentPreviewScene", { sceneName: scene });
    } else void run("SetCurrentProgramScene", { sceneName: scene });
  }

  function saveRoles(patch: Partial<Roles>) {
    if (!roles) return;
    const next = { ...roles, ...patch };
    setRoles(next);
    void run<Roles>("link.setBackup", next).then((r) => r && setRoles(r));
  }

  const inScene = new Set(items.map((i) => i.name));
  const mixerSorted = [...mixer].sort((x, y) => Number(inScene.has(y.name)) - Number(inScene.has(x.name)));
  const lost = link !== "on" || !agent.online;

  const statusText = link === "denied" ? "Accès sur invitation" : link === "connecting" ? "Connexion…" : !agent.online ? "OBS hors ligne" : obsDown ? "OBS fermé" : null;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:px-5">
          <Link href="/dashboard/controle-a-distance" className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-3 text-sm text-muted transition-colors hover:text-foreground">
            <span aria-hidden="true">←</span> Retour
          </Link>
          <h1 className="text-sm font-semibold tracking-tight">Contrôle à distance</h1>
          <span role="status" className="flex items-center gap-2 font-mono text-xs text-muted">
            <span aria-hidden="true" className={`size-2 rounded-full ${ready ? "bg-foreground" : "border border-muted"}`} />
            <span className="max-w-[16ch] truncate text-foreground">{agent.name ?? "OBS"}</span>
            {statusText ?? (latency != null ? `${latency} ms` : "")}
          </span>
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
            <label className="flex items-center gap-2 text-xs text-muted">
              Profil
              <select aria-label="Profil OBS" className={select} disabled={!ready} value={profiles.current} onChange={(e) => void run("SetCurrentProfile", { profileName: e.target.value })}>
                {profiles.list.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-muted">
              Collection
              <select aria-label="Collection de scènes" className={select} disabled={!ready} value={collections.current} onChange={(e) => void run("SetCurrentSceneCollection", { sceneCollectionName: e.target.value })}>
                {collections.list.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted" role="status">
              <span aria-hidden="true" className={`size-2 rounded-full ${fluxState === "received" ? "bg-foreground" : "border border-muted"}`} />
              {fluxState === "received" ? "Flux reçu" : "Aucun flux reçu"}
            </span>
            <div className="relative" ref={devicePanel}>
              <button type="button" aria-expanded={deviceOpen} disabled={!roles} onClick={() => setDeviceOpen((o) => !o)} className={`${btn} ${ghost} h-10 px-4`}>
                Appareil
              </button>
              {deviceOpen && roles && (
                <div role="dialog" aria-label="Appareil" className="fixed inset-x-3 top-28 z-40 max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-2xl border border-line-strong bg-surface p-4 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[26rem] sm:max-h-[80dvh]">
                  <h2 className={label}>Rôles des scènes</h2>
                  <div className="mt-3 grid gap-3">
                    <PopSelect label="Scène Live" value={roles.liveScene} options={scenes} onChange={(v) => saveRoles({ liveScene: v })} />
                    <PopSelect label="Scène Bug (secours)" value={roles.scene} options={scenes} onChange={(v) => saveRoles({ scene: v })} />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Bascule automatique</p>
                      <p className="text-xs text-muted">{roles.state === "backup" ? "Secours actif en ce moment" : "Passe seule sur la scène Bug, puis revient."}</p>
                    </div>
                    <button type="button" role="switch" aria-checked={roles.enabled} disabled={!roles.source || !roles.scene} onClick={() => saveRoles({ enabled: !roles.enabled })} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${roles.enabled ? "bg-accent" : "bg-foreground/15"}`}>
                      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-on-accent transition-transform motion-reduce:transition-none ${roles.enabled ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                  {(!roles.source || !roles.scene) && <p className="mt-2 text-xs text-muted">Choisis la scène Bug, et ajoute la source « Flux SYXTEE » à ta scène Live (fenêtre SYXTEE d&apos;OBS, Réglages, Corriger).</p>}
                  <fieldset className="mt-4">
                    <legend className={label}>Déclenchement</legend>
                    <div className="mt-2 grid gap-2">
                      {TRIGGERS.map((t) => (
                        <label key={t.id} className={`cursor-pointer rounded-xl border p-3 text-sm transition-colors ${roles.trigger === t.id ? "border-foreground" : "border-line hover:border-line-strong"}`}>
                          <span className="flex items-center gap-2 font-medium">
                            <input type="radio" name="trigger" checked={roles.trigger === t.id} onChange={() => saveRoles({ trigger: t.id })} className="accent-current" />
                            {t.title}
                          </span>
                          <span className="mt-1 block pl-6 text-xs text-muted">{t.text}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted">
              Mode studio
              <button type="button" role="switch" aria-label="Mode studio" aria-checked={studioMode} disabled={!ready} onClick={() => void run("SetStudioModeEnabled", { studioModeEnabled: !studioMode })} className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-40 ${studioMode ? "bg-accent" : "bg-foreground/15"}`}>
                <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-on-accent transition-transform motion-reduce:transition-none ${studioMode ? "translate-x-5" : ""}`} />
              </button>
            </label>
          </div>
        </div>
      </header>

      {lost && (
        <div role="alert" className="border-b border-accent/40 bg-accent/10 px-4 py-2.5 text-center text-sm">
          {link === "denied"
            ? "Le contrôle à distance est réservé aux comptes invités."
            : link === "connecting"
              ? "Connexion au serveur…"
              : link === "off"
                ? "Connexion perdue : nouvelle tentative…"
                : "Cet OBS n'est plus en ligne. Ouvre OBS sur l'ordinateur : le contrôle reprend tout seul."}
        </div>
      )}
      {obsDown && !lost && (
        <div role="alert" className="border-b border-accent/40 bg-accent/10 px-4 py-2.5 text-center text-sm">
          OBS vient de se fermer. Le contrôle reprend dès qu&apos;il est rouvert.
        </div>
      )}

      <main className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 content-start gap-3 p-3 sm:p-5 lg:grid-cols-12">
        {error && (
          <p role="alert" className="rounded-xl border border-line px-4 py-3 text-sm text-red-400 lg:col-span-12">
            {error}
          </p>
        )}

        {/* Programme (et, en Mode Studio, aperçu) */}
        <section aria-label="Programme" className="order-1 grid gap-2 lg:col-span-7">
          <div className={studioMode ? "grid grid-cols-1 gap-3 md:grid-cols-2" : ""}>
            {studioMode && <ProgramPreview sinkRef={previewSink} program={preview} live={false} title="Aperçu" tag="APERÇU" />}
            {previewOn ? (
              <ProgramPreview sinkRef={frameSink} program={program} live={streaming} title="Programme" tag={streaming ? "" : "HORS DIRECT"} />
            ) : (
              <div className="grid aspect-video place-items-center rounded-2xl border border-line bg-surface-2 text-center">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted">Aperçu coupé</p>
                  <p className="mt-1 text-sm text-foreground">{program || "—"}</p>
                  <p className="mt-0.5 text-xs text-muted">{streaming ? "En direct" : "Hors direct"}</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm">
              <span className="font-medium">{program || "—"}</span>
              <span className={`ml-3 font-mono text-[11px] uppercase tracking-[0.14em] ${streaming ? "text-live" : "text-muted"}`}>{streaming ? "en direct" : "hors direct"}</span>
            </p>
            <div className="flex gap-2">
              <button type="button" disabled title="Le son de l'aperçu arrive avec la vidéo en direct" aria-pressed={!muted} onClick={() => setMuted((m) => !m)} className={`${btn} ${ghost} h-9 px-4 text-xs`}>
                {muted ? "Muet" : "Son"}
              </button>
              <button
                type="button"
                disabled={!ready}
                onClick={() => {
                  const next = !previewOn;
                  setPreviewOn(next);
                  void run("link.setPreview", { enabled: next });
                }}
                className={`${btn} ${ghost} h-9 px-4 text-xs`}
              >
                {previewOn ? "Couper l'aperçu" : "Activer l'aperçu"}
              </button>
            </div>
          </div>
        </section>

        {/* Scènes */}
        <section aria-label="Scènes" className={`${card} order-2 lg:col-span-5`}>
          <h2 className={label}>Scènes</h2>
          {scenes.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{ready ? "Aucune scène dans cette collection." : "En attente d'OBS…"}</p>
          ) : (
            <ul className="mt-3 grid gap-1.5">
              {scenes.map((sc) => {
                const isProgram = sc === program;
                const isPreview = studioMode && sc === preview && !isProgram;
                return (
                  <li key={sc}>
                    <button
                      type="button"
                      disabled={!ready}
                      aria-pressed={studioMode ? isPreview : isProgram}
                      onClick={() => pick(sc)}
                      className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-sm font-medium transition-colors disabled:opacity-50 ${isProgram ? "border-foreground bg-accent text-on-accent" : isPreview ? "border-foreground" : "border-line hover:border-line-strong hover:bg-foreground/5"}`}
                    >
                      <span className="truncate">{sc}</span>
                      {isProgram && <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider opacity-70">Programme</span>}
                      {isPreview && <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted">Aperçu</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {studioMode && (
            <div className="mt-3 grid gap-2">
              <select value={transition} onChange={(e) => (setTransition(e.target.value), void run("SetCurrentSceneTransition", { transitionName: e.target.value }))} aria-label="Transition" className={`${select} h-11`}>
                {transitions.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <button type="button" onClick={() => run("TriggerStudioModeTransition")} className={`${btn} bg-accent text-on-accent hover:bg-accent-hover`}>
                Envoyer l&apos;aperçu en direct
              </button>
            </div>
          )}
        </section>

        {/* Contrôles */}
        <section aria-label="Contrôles" className={`${card} order-3 grid content-start gap-3 lg:col-span-4 lg:order-4`}>
          <h2 className={label}>Contrôles</h2>
          <button type="button" disabled={!ready} onClick={() => setConfirm(streaming ? "stop" : "start")} className={`${btn} ${streaming ? "bg-live text-white" : "bg-accent text-on-accent hover:bg-accent-hover"}`}>
            {streaming ? `En direct ${clock(stats?.streamMs ?? 0)} · arrêter` : "Partir en direct"}
          </button>
          <div className="flex gap-2">
            <button type="button" disabled={!ready} onClick={() => void run(recording ? "StopRecord" : "StartRecord")} className={`${btn} ${ghost} flex-1 ${recording ? "border-live text-live" : ""}`}>
              {recording ? `${paused ? "Pause" : "REC"} ${clock(stats?.recMs ?? 0)} · arrêter` : "Démarrer l'enregistrement"}
            </button>
            {recording && (
              <button type="button" onClick={() => run(paused ? "ResumeRecord" : "PauseRecord")} className={`${btn} ${ghost} px-4`}>
                {paused ? "Reprendre" : "Pause"}
              </button>
            )}
          </div>
        </section>

        {/* Sources de la scène active */}
        <section aria-label="Sources de la scène" className={`${card} order-4 lg:order-3 lg:col-span-4`}>
          <h2 className={label}>Sources · {editing || "scène"}</h2>
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Aucune source dans cette scène.</p>
          ) : (
            <ul className="mt-3 grid gap-1.5">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${i.on ? "" : "text-muted line-through"}`}>{i.name}</span>
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-muted">{kindLabel(i.kind)}</span>
                  </span>
                  <button
                    type="button"
                    aria-pressed={i.on}
                    aria-label={`${i.on ? "Masquer" : "Afficher"} ${i.name}`}
                    onClick={() => {
                      setItems((l) => l.map((x) => (x.id === i.id ? { ...x, on: !x.on } : x)));
                      void run("SetSceneItemEnabled", { sceneName: editing, sceneItemId: i.id, sceneItemEnabled: !i.on });
                    }}
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-line hover:bg-foreground/5"
                  >
                    <Eye on={i.on} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Flux : état de sortie d'OBS */}
        <section aria-label="Flux" className={`${card} order-6 lg:order-5 lg:col-span-4`}>
          <h2 className={label}>Flux</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
            {(
              [
                ["Débit", streaming ? (stats?.kbps != null ? `${stats.kbps} kbit/s` : "…") : "—"],
                ["Perdues", streaming ? `${stats?.dropped ?? 0}${stats?.total ? ` / ${stats.total}` : ""}` : "—"],
                ["Images/s", stats ? String(stats.fps) : "—"],
                ["CPU", stats ? `${stats.cpu} %` : "—"],
                ["Encodeur", streaming && stats?.encoder ? stats.encoder : "—"],
                ["Durée", streaming ? clock(stats?.streamMs ?? 0) : "—"],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="min-w-0 rounded-xl border border-line px-2 py-2">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">{k}</dt>
                <dd className="mt-0.5 truncate text-sm font-medium tabular-nums" title={v}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          {streaming && stats && stats.congestion > 0.3 && <p className="mt-3 text-xs text-accent">Le réseau du PC est saturé : le direct risque de saccader.</p>}
        </section>

        {/* Mélangeur audio */}
        <section aria-label="Mélangeur audio" className={`${card} order-5 lg:order-6 lg:col-span-12`}>
          <h2 className={label}>Mélangeur audio</h2>
          {mixer.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Aucune source audio dans OBS.</p>
          ) : (
            <ul className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {mixerSorted.map((i) => (
                <li key={i.name} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {i.name}
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted">{inScene.has(i.name) ? "Dans la scène" : "Globale"}</span>
                    </span>
                    <button type="button" aria-pressed={i.muted} onClick={() => run("SetInputMute", { inputName: i.name, inputMuted: !i.muted })} className="rounded-full border border-line px-3 py-1 text-xs hover:bg-foreground/5">
                      {i.muted ? "Muet" : "Actif"}
                    </button>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
                    <div className="h-full w-full origin-left rounded-full bg-foreground transition-transform duration-150 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${i.muted ? 0 : dbToPct(levels[i.name] ?? -100) / 100})` }} />
                  </div>
                  <label className="mt-3 flex items-center gap-3 text-xs text-muted">
                    <span className="w-14 font-mono tabular-nums">{Number.isFinite(i.db) && i.db > -100 ? `${Math.round(i.db)} dB` : "-∞"}</span>
                    <input
                      type="range"
                      min={-60}
                      max={0}
                      step={1}
                      value={Number.isFinite(i.db) ? Math.max(-60, Math.min(0, i.db)) : -60}
                      aria-label={`Volume ${i.name}`}
                      onChange={(e) => {
                        const db = Number(e.target.value);
                        setMixer((m) => m.map((x) => (x.name === i.name ? { ...x, db } : x)));
                        void run("SetInputVolume", { inputName: i.name, inputVolumeDb: db });
                      }}
                      className="w-full accent-current"
                    />
                  </label>
                  <label className="mt-2 flex items-center gap-3 text-xs text-muted">
                    <span className="w-14">Écoute</span>
                    <select
                      aria-label={`Écoute de ${i.name}`}
                      value={i.mon}
                      onChange={(e) => {
                        const mon = e.target.value;
                        setMixer((m) => m.map((x) => (x.name === i.name ? { ...x, mon } : x)));
                        void run("SetInputAudioMonitorType", { inputName: i.name, monitorType: mon });
                      }}
                      className={`${select} h-9 w-full text-xs`}
                    >
                      {MON.map(([v, t]) => (
                        <option key={v} value={v}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <dialog
        ref={dialog}
        onClose={() => setConfirm(null)}
        onClick={(e) => e.target === dialog.current && setConfirm(null)}
        aria-labelledby="confirm-title"
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-background p-0 text-foreground backdrop:bg-background/80 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <h2 id="confirm-title" className="text-lg font-semibold tracking-tight">
            {confirm === "stop" ? "Arrêter le direct ?" : "Partir en direct ?"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {confirm === "stop" ? `Le direct de ${agent.name ?? "ce poste"} s'arrête tout de suite pour tes spectateurs (${clock(stats?.streamMs ?? 0)} de direct).` : `OBS sur ${agent.name ?? "ce poste"} commence à diffuser vers ta plateforme avec la scène « ${program} ».`}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              autoFocus
              onClick={() => {
                const a = confirm;
                setConfirm(null);
                void run(a === "stop" ? "StopStream" : "StartStream");
              }}
              className={`${btn} ${confirm === "stop" ? "bg-live text-white" : "bg-accent text-on-accent hover:bg-accent-hover"}`}
            >
              {confirm === "stop" ? "Arrêter le direct" : "Partir en direct"}
            </button>
            <button type="button" onClick={() => setConfirm(null)} className={`${btn} ${ghost}`}>
              Annuler
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function PopSelect({ label: text, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-1 text-xs text-muted">
      {text}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={select}>
        <option value="">Choisir…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Eye({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" className={on ? "" : "opacity-40"} />
      <circle cx="12" cy="12" r="3" className={on ? "" : "opacity-40"} />
      {!on && <path d="M4 4l16 16" />}
    </svg>
  );
}
