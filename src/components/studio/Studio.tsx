"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Backups from "./Backups";
import Connect from "./Connect";
import { useLink, type LinkEvent } from "./useLink";

// SYXTEE STUDIO : l'interface d'OBS, sur le site. Chaque bouton exécute une action sur l'OBS de l'utilisateur, à distance
// (via SYXTEE Link, le plugin installé dans OBS). Le live et le stream tournent sur l'ordinateur ; ce navigateur, y compris
// celui d'un téléphone, ne fait que commander.

type Item = { id: number; name: string; on: boolean };
type Mixer = { name: string; muted: boolean; db: number };
type Backup = { enabled: boolean; source: string; scene: string; freezeSeconds: number; recoverSeconds: number; state?: string };
type Stats = { fps: number; cpu: number; kbps: number; dropped: number; total: number };
type Tab = "control" | "saves" | "device";

const btn = "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full px-5 text-sm font-medium transition-colors disabled:opacity-40";
const card = "rounded-2xl border border-line bg-surface p-4";
const label = "font-mono text-xs uppercase tracking-[0.18em] text-muted";

const clockOf = (tc: unknown) => String(tc ?? "00:00:00").split(".")[0];
const dbToPct = (db: number) => Math.max(0, Math.min(100, ((db + 60) * 100) / 60));

export default function Studio({ coreUrl }: { coreUrl: string }) {
  const [tab, setTab] = useState<Tab>("control");
  const [scenes, setScenes] = useState<string[]>([]);
  const [program, setProgram] = useState("");
  const [preview, setPreview] = useState("");
  const [studioMode, setStudioMode] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [transitions, setTransitions] = useState<string[]>([]);
  const [transition, setTransition] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [clock, setClock] = useState({ live: "", rec: "" });
  const [mixer, setMixer] = useState<Mixer[]>([]);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [inputs, setInputs] = useState<string[]>([]);
  const [backup, setBackup] = useState<Backup | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [frame, setFrame] = useState("");
  const [obsDown, setObsDown] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<"stream" | "record" | null>(null);
  const [sync, setSync] = useState(0);
  const [jobEvent, setJobEvent] = useState<{ kind: string; state: string; progress: number; message: string } | null>(null);
  const lastBytes = useRef<{ t: number; b: number } | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const onEvent = useCallback<LinkEvent>((name, d) => {
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
    else if (name === "link.preview") setFrame(String(d.image));
    else if (name === "link.backupState") setBackup((b) => (b ? { ...b, state: String(d.state) } : b));
    else if (name === "link.job") setJobEvent(d as never);
    else if (name === "link.obsClosed") setObsDown(true);
    else if (name === "link.obsOpened" || name === "SceneListChanged") setSync((n) => n + 1);
  }, []);
  const { link, agent, call } = useLink(coreUrl, onEvent);

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
    const sl = await run<{ scenes: { sceneName: string }[]; currentProgramSceneName: string; currentPreviewSceneName?: string }>("GetSceneList");
    if (!sl) return;
    setObsDown(false);
    setScenes([...sl.scenes].reverse().map((s) => s.sceneName));
    setProgram(sl.currentProgramSceneName);
    const [sm, st, rc, il, tl, bk] = await Promise.all([
      run<{ studioModeEnabled: boolean }>("GetStudioModeEnabled"),
      run<{ outputActive: boolean }>("GetStreamStatus"),
      run<{ outputActive: boolean; outputPaused: boolean }>("GetRecordStatus"),
      run<{ inputs: { inputName: string }[] }>("GetInputList"),
      run<{ transitions: { transitionName: string }[]; currentSceneTransitionName: string }>("GetSceneTransitionList"),
      run<Backup>("link.getBackup"),
    ]);
    setStudioMode(!!sm?.studioModeEnabled);
    if (sm?.studioModeEnabled) setPreview((await run<{ currentPreviewSceneName: string }>("GetCurrentPreviewScene"))?.currentPreviewSceneName ?? "");
    setStreaming(!!st?.outputActive);
    setRecording(!!rc?.outputActive);
    setPaused(!!rc?.outputPaused);
    const names = (il?.inputs ?? []).map((i) => i.inputName);
    setInputs(names);
    setTransitions((tl?.transitions ?? []).map((t) => t.transitionName));
    setTransition(tl?.currentSceneTransitionName ?? "");
    setBackup(bk);
    // Les entrées sans audio répondent par une erreur : on les écarte.
    const rows = await Promise.all(
      names.map(async (name) => {
        try {
          const [m, v] = await Promise.all([call<{ inputMuted: boolean }>("GetInputMute", { inputName: name }), call<{ inputVolumeDb: number }>("GetInputVolume", { inputName: name })]);
          return { name, muted: !!m.inputMuted, db: Number(v.inputVolumeDb) } as Mixer;
        } catch {
          return null;
        }
      }),
    );
    setMixer(rows.filter((r): r is Mixer => r !== null));
  }, [run, call]);

  const ready = link === "on" && agent.online && !obsDown;

  useEffect(() => {
    if (link !== "on" || !agent.online) return;
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [link, agent.online, refresh, sync]);

  // Sources de la scène du programme.
  useEffect(() => {
    if (!ready || !program) return;
    let live = true;
    const t = setTimeout(() => {
      void run<{ sceneItems: { sceneItemId: number; sourceName: string; sceneItemEnabled: boolean }[] }>("GetSceneItemList", { sceneName: program }).then((r) => {
        if (live && r) setItems([...r.sceneItems].reverse().map((i) => ({ id: i.sceneItemId, name: i.sourceName, on: i.sceneItemEnabled })));
      });
    }, 0);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [ready, program, run]);

  // Durées et statistiques, toutes les 2 secondes tant que l'onglet est visible.
  useEffect(() => {
    if (!ready) return;
    const tick = async () => {
      if (document.hidden) return;
      const [s, r, st] = await Promise.all([
        call<{ outputTimecode: string; outputBytes: number; outputSkippedFrames: number; outputTotalFrames: number; outputActive: boolean }>("GetStreamStatus").catch(() => null),
        call<{ outputTimecode: string }>("GetRecordStatus").catch(() => null),
        call<{ activeFps: number; cpuUsage: number }>("GetStats").catch(() => null),
      ]);
      setClock({ live: clockOf(s?.outputTimecode), rec: clockOf(r?.outputTimecode) });
      let kbps = 0;
      if (s?.outputActive) {
        const now = Date.now();
        if (lastBytes.current && s.outputBytes >= lastBytes.current.b) kbps = Math.round(((s.outputBytes - lastBytes.current.b) * 8) / ((now - lastBytes.current.t) / 1000) / 1000);
        lastBytes.current = { t: now, b: s.outputBytes };
      } else lastBytes.current = null;
      if (st) setStats({ fps: Math.round(st.activeFps), cpu: Math.round(st.cpuUsage), kbps, dropped: s?.outputSkippedFrames ?? 0, total: s?.outputTotalFrames ?? 0 });
    };
    const first = setTimeout(() => void tick(), 0);
    const id = setInterval(() => void tick(), 2000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [ready, call]);

  function toggle(kind: "stream" | "record") {
    const active = kind === "stream" ? streaming : recording;
    if (active && confirm !== kind) {
      setConfirm(kind);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirm(null), 3000);
      return;
    }
    setConfirm(null);
    void run(kind === "stream" ? (active ? "StopStream" : "StartStream") : active ? "StopRecord" : "StartRecord");
  }

  function pick(scene: string) {
    if (studioMode) {
      setPreview(scene);
      void run("SetCurrentPreviewScene", { sceneName: scene });
    } else void run("SetCurrentProgramScene", { sceneName: scene });
  }

  function saveBackup(patch: Partial<Backup>) {
    if (!backup) return;
    const next = { ...backup, ...patch };
    setBackup(next);
    void run<Backup>("link.setBackup", next).then((r) => r && setBackup(r));
  }

  const tabs: [Tab, string][] = [
    ["control", "Contrôle"],
    ["saves", "Mes scènes"],
    ["device", "Connexion"],
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <Image src="/logo-400.png" alt="" width={18} height={25} className="ink-img" priority />
          <h1 className="text-sm font-semibold tracking-[0.18em]">
            SYXTEE <span className="font-normal text-muted">STUDIO</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {(streaming || recording) && (
            <span className="flex items-center gap-2 font-mono text-xs text-live">
              <span className="live-dot" aria-hidden="true" />
              {streaming ? `LIVE ${clock.live}` : `REC ${clock.rec}`}
            </span>
          )}
          <span className="flex items-center gap-2 font-mono text-xs text-muted" role="status">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${ready ? "bg-foreground" : "bg-accent/30"}`} />
            {link === "denied" ? "Accès sur invitation" : link === "connecting" ? "Connexion…" : !agent.online ? "OBS hors ligne" : obsDown ? "OBS fermé" : (agent.name ?? "OBS")}
          </span>
          <Link href="/dashboard" className="text-sm text-muted transition-colors hover:text-foreground">
            Dashboard
          </Link>
        </div>
      </header>

      <nav className="flex gap-6 border-b border-line px-4 sm:px-6" role="tablist" aria-label="Sections du Studio">
        {tabs.map(([id, text]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 py-3 text-sm transition-colors ${tab === id ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {text}
          </button>
        ))}
      </nav>

      <div className="mx-auto w-full max-w-[1200px] flex-1 p-4 sm:p-6">
        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-line px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {tab === "control" && !ready && <Connect coreUrl={coreUrl} link={link} agent={agent} obsDown={obsDown} compact />}

        {tab === "control" && ready && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="grid content-start gap-4">
              <section aria-label="Aperçu du programme" className="overflow-hidden rounded-2xl border border-line bg-black">
                <div className="relative aspect-video w-full">
                  {frame ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={frame} alt={`Programme : ${program}`} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-wider text-muted">Aperçu en attente…</div>
                  )}
                  <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-md bg-black/70 px-2 py-1 font-mono text-[11px] text-white">{program}</span>
                  {streaming && <span className="absolute right-3 top-3 rounded-md bg-live px-2 py-1 font-mono text-[11px] font-semibold text-white">EN DIRECT</span>}
                </div>
              </section>

              {stats && (
                <dl className="grid grid-cols-4 gap-2 text-center" aria-label="Statistiques d'OBS">
                  {[
                    ["FPS", String(stats.fps)],
                    ["CPU", `${stats.cpu} %`],
                    ["Débit", streaming ? `${stats.kbps} kb/s` : "—"],
                    ["Perdues", streaming ? `${stats.dropped}` : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-line px-2 py-2">
                      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">{k}</dt>
                      <dd className="mt-0.5 text-sm font-medium tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <section aria-label="Diffusion" className={`${card} grid gap-3 sm:grid-cols-2`}>
                <button type="button" onClick={() => toggle("stream")} className={`${btn} ${streaming ? "bg-live text-white" : "bg-accent text-on-accent hover:bg-accent-hover"}`}>
                  {streaming ? (confirm === "stream" ? "Confirmer l'arrêt du live" : "En direct · arrêter") : "Lancer le live"}
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => toggle("record")} className={`${btn} flex-1 border border-line-strong ${recording ? "border-live text-live" : "hover:bg-accent/10"}`}>
                    {recording ? (confirm === "record" ? "Confirmer l'arrêt" : paused ? "En pause · arrêter" : "Enregistrement · arrêter") : "Enregistrer"}
                  </button>
                  {recording && (
                    <button type="button" onClick={() => run(paused ? "ResumeRecord" : "PauseRecord")} className={`${btn} border border-line-strong px-4 hover:bg-accent/10`}>
                      {paused ? "Reprendre" : "Pause"}
                    </button>
                  )}
                </div>
              </section>

              <section aria-label="Scènes" className={card}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className={label}>Scènes</h2>
                  <label className="flex items-center gap-2 text-xs text-muted">
                    Mode Studio
                    <span className="relative inline-block h-6 w-11">
                      <input type="checkbox" checked={studioMode} onChange={(e) => void run("SetStudioModeEnabled", { studioModeEnabled: e.target.checked })} className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" aria-label="Mode Studio" />
                      <span className="absolute inset-0 rounded-full bg-accent/20 transition-colors peer-checked:bg-accent" />
                      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-muted transition-transform peer-checked:translate-x-5 peer-checked:bg-on-accent" />
                    </span>
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {scenes.map((s) => {
                    const isProgram = s === program;
                    const isPreview = studioMode && s === preview && !isProgram;
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={isProgram}
                        onClick={() => pick(s)}
                        className={`relative min-h-14 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors ${isProgram ? "border-foreground bg-accent text-on-accent" : isPreview ? "border-foreground" : "border-line hover:border-line-strong hover:bg-accent/10"}`}
                      >
                        {s}
                        {isProgram && <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider opacity-70">Programme</span>}
                        {isPreview && <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Aperçu</span>}
                      </button>
                    );
                  })}
                </div>
                {studioMode && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select value={transition} onChange={(e) => (setTransition(e.target.value), void run("SetCurrentSceneTransition", { transitionName: e.target.value }))} aria-label="Transition" className="h-11 rounded-xl border border-line bg-background px-3 text-sm">
                      {transitions.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => run("TriggerStudioModeTransition")} className={`${btn} bg-accent text-on-accent hover:bg-accent-hover`}>
                      Transition
                    </button>
                  </div>
                )}
              </section>
            </div>

            <div className="grid content-start gap-4">
              <section aria-label="Sources de la scène" className={card}>
                <h2 className={label}>Sources · {program}</h2>
                {items.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">Aucune source dans cette scène.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-line">
                    {items.map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                        <span className={`truncate text-sm ${i.on ? "" : "text-muted line-through"}`}>{i.name}</span>
                        <button
                          type="button"
                          aria-pressed={i.on}
                          aria-label={`${i.on ? "Masquer" : "Afficher"} ${i.name}`}
                          onClick={() => {
                            setItems((l) => l.map((x) => (x.id === i.id ? { ...x, on: !x.on } : x)));
                            void run("SetSceneItemEnabled", { sceneName: program, sceneItemId: i.id, sceneItemEnabled: !i.on });
                          }}
                          className="rounded-full border border-line px-3 py-1 text-xs hover:bg-accent/10"
                        >
                          {i.on ? "Visible" : "Masquée"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-label="Audio" className={card}>
                <h2 className={label}>Audio</h2>
                {mixer.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">Aucune source audio dans OBS.</p>
                ) : (
                  <ul className="mt-3 grid gap-3">
                    {mixer.map((i) => (
                      <li key={i.name} className="rounded-xl border border-line p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-medium">{i.name}</span>
                          <button type="button" aria-pressed={i.muted} onClick={() => run("SetInputMute", { inputName: i.name, inputMuted: !i.muted })} className="rounded-full border border-line px-3 py-1 text-xs hover:bg-accent/10">
                            {i.muted ? "Muet" : "Actif"}
                          </button>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent/10" aria-hidden="true">
                          <div className="h-full rounded-full bg-foreground transition-[width] duration-150" style={{ width: `${i.muted ? 0 : dbToPct(levels[i.name] ?? -100)}%` }} />
                        </div>
                        <label className="mt-3 flex items-center gap-3 text-xs text-muted">
                          <span className="w-14 font-mono tabular-nums">{Number.isFinite(i.db) ? `${Math.round(i.db)} dB` : "-∞"}</span>
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
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {backup && (
                <section aria-label="Secours automatique" className={card}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className={label}>Secours automatique</h2>
                      <p className="mt-2 max-w-[44ch] text-sm text-muted">Si l&apos;image de la source se fige, OBS passe seul sur ta scène de secours, puis revient. Tout se passe sur ton PC.</p>
                    </div>
                    <button type="button" aria-pressed={backup.enabled} disabled={!backup.source || !backup.scene} onClick={() => saveBackup({ enabled: !backup.enabled })} className={`${btn} ${backup.enabled ? "bg-accent text-on-accent" : "border border-line-strong hover:bg-accent/10"}`}>
                      {backup.enabled ? (backup.state === "backup" ? "Secours actif" : "Activé") : "Désactivé"}
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Select label="Source surveillée" value={backup.source} options={inputs} onChange={(v) => saveBackup({ source: v })} />
                    <Select label="Scène de secours" value={backup.scene} options={scenes} onChange={(v) => saveBackup({ scene: v })} />
                    <label className="grid gap-1 text-xs text-muted">
                      Bascule après
                      <select value={backup.freezeSeconds} onChange={(e) => saveBackup({ freezeSeconds: Number(e.target.value) })} className="h-10 rounded-xl border border-line bg-background px-3 text-sm text-foreground">
                        {[2, 3, 4, 6, 10].map((n) => (
                          <option key={n} value={n}>
                            {n} s figée
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {tab === "saves" && <Backups coreUrl={coreUrl} ready={ready} call={call} job={jobEvent} />}
        {tab === "device" && <Connect coreUrl={coreUrl} link={link} agent={agent} obsDown={obsDown} />}
      </div>
    </div>
  );
}

function Select({ label: text, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-1 text-xs text-muted">
      {text}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-xl border border-line bg-background px-3 text-sm text-foreground">
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
