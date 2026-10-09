"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { coreFetch } from "../dashboard/coreClient";
import MultiChat, { type ChatDefaults } from "../dashboard/MultiChat";
import MultistreamPanel, { type MsState } from "./MultistreamPanel";
import ProgramPreview, { type FrameSink } from "./ProgramPreview";
import ProgramVideo, { type Watch } from "./ProgramVideo";
import { useRemote, type LinkEvent } from "./useRemote";

// Contrôle à distance : l'interface d'OBS dans un onglet. Chaque bouton agit sur le VRAI OBS du poste (par le plugin SYXTEE), et ce
// que l'on change dans OBS se reflète ici en moins d'une seconde. Le direct et l'enregistrement tournent sur l'ordinateur :
// ce navigateur (téléphone en 4G compris) ne fait que commander.
// Mise en page volontairement sobre (fond noir, filets fins, texte petit, une seule typo) : c'est un OBS, pas un tableau de bord.

type Item = { id: number; name: string; kind: string; on: boolean; flux?: boolean };
type Mix = { name: string; muted: boolean; db: number; mon: string; global: boolean };
type Trigger = "cut" | "cut_lowbitrate" | "sensitive";
type Roles = { enabled: boolean; source: string; scene: string; freezeSeconds: number; recoverSeconds: number; trigger: Trigger; liveScene: string; state?: string; autoEnabled?: boolean; droneScene?: string; droneSource?: string; autoRules?: { source: string; scene: string }[]; audioEnabled?: boolean; audioSource?: string; audioSeconds?: number; audioUnmute?: boolean; audioBackup?: boolean; directorEnabled?: boolean; directorKeySet?: boolean; directorKey?: string; directorClearKey?: boolean; directorCams?: { source: string; scene: string; label: string }[]; directorRules?: string; directorInterval?: number; directorHold?: number; directorState?: string; directorCam?: number; directorReason?: string; directorWorkspaceId?: string; directorProvider?: "mistral" | "anthropic" | "local"; directorModel?: string; audioState?: string };
type Stats = { cpu: number; fps: number; kbps: number | null; dropped: number; total: number; encoder: string; congestion: number; streamMs: number; recMs: number };
type Named = { current: string; list: string[] };
type Tab = "scenes" | "sources" | "mixer" | "controls" | "multi" | "chat";

const KINDS: Record<string, string> = {
  ffmpeg_source: "Média",
  vlc_source: "Média VLC",
  browser_source: "Navigateur",
  image_source: "Image",
  slideshow: "Diaporama",
  text_ft2_source: "Texte",
  text_gdiplus: "Texte",
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

const MON_OFF = "OBS_MONITORING_TYPE_NONE";
const MON_ON = "OBS_MONITORING_TYPE_MONITOR_ONLY";

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

// Palette de la page : noir pur, filets gris, bleu pour la scène du programme (comme OBS).
const panel = "flex min-h-0 min-w-0 flex-col rounded-xl border border-white/[0.08] bg-[#0b0b0d] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
const panelTitle = "flex items-baseline gap-2 border-b border-white/[0.08] px-3.5 py-2.5 text-[13px] font-semibold tracking-tight";
const flat = "inline-flex items-center justify-center whitespace-nowrap rounded-full border border-white/[0.14] bg-[#16161a] text-[13px] text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:bg-[#1e1e23] disabled:opacity-40";
const field = "h-7 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[13px] text-neutral-100 disabled:opacity-40";

/** Petit retour tactile (Android) sur les actions du direct. Silencieux ailleurs. */
const buzz = (ms = 12) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // non pris en charge
  }
};

/** `demoToken` : pages de démo des captures (le jeton de session n'est pas demandé). */
export default function RemoteObs({ coreUrl, deviceId, demoToken, invite, chatDefaults, rights = { prises: true, cams: 6 } }: { coreUrl: string; deviceId: string; /** Droits de la formule pour la régie : prises (drone, autres sources) et caméras de la régie IA (le Core applique les mêmes limites). */ rights?: { prises: boolean; cams: number }; demoToken?: string; /** Chaînes du propriétaire pour le chat (absent pour un invité). */ chatDefaults?: ChatDefaults; /** Secret d'un lien d'invitation : l'invité pilote sans compte, avec les droits de son invitation. */ invite?: string }) {
  const [scenes, setScenes] = useState<string[]>([]);
  const [program, setProgram] = useState("");
  const [preview, setPreview] = useState("");
  const [studioMode, setStudioMode] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [sceneAudio, setSceneAudio] = useState<Set<string>>(new Set());
  const [mixer, setMixer] = useState<Mix[]>([]);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [meterHold, setMeterHold] = useState(false);
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
  const [fluxName, setFluxName] = useState("");
  const [fixing, setFixing] = useState(false);
  const [fixMsg, setFixMsg] = useState("");
  const [previewOn, setPreviewOn] = useState(true);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [pmode, setPmode] = useState<{ mode: "video" | "jpeg" | "idle"; reason: string }>({ mode: "idle", reason: "" });
  const [error, setError] = useState("");
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [obsDown, setObsDown] = useState(false);
  const [confirm, setConfirm] = useState<"start" | "stop" | null>(null);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("scenes");
  const pendingScene = useRef<{ scene: string; until: number } | null>(null);
  const [ms, setMs] = useState<MsState | null>(null);
  const [chatOn, setChatOn] = useState(true);
  const [sync, setSync] = useState(0);
  const frameSink: FrameSink = useRef(null);
  const previewSink: FrameSink = useRef(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const levelsRef = useRef<Record<string, number>>({});
  const hold = useRef(false);
  const levelFrame = useRef(0);
  const volumeSend = useRef<Record<string, { at: number; timer?: ReturnType<typeof setTimeout> }>>({});
  const dialog = useRef<HTMLDialogElement>(null);
  const devicePanel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hold.current = meterHold;
  }, [meterHold]);

  const later = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => setSync((n) => n + 1), 250);
  }, []);

  const onEvent = useCallback<LinkEvent>(
    (name, d) => {
      if (name === "CurrentProgramSceneChanged") {
        // Scène tapée en attente : OBS n'annonce la fin d'une transition qu'à son terme, et une transition précédente ne doit pas faire clignoter la sélection.
        const want = pendingScene.current;
        if (want && Date.now() < want.until && d.sceneName !== want.scene) return;
        pendingScene.current = null;
        setProgram(String(d.sceneName));
      }
      else if (name === "CurrentPreviewSceneChanged") setPreview(String(d.sceneName));
      else if (name === "link.multistream") setMs(d as unknown as MsState);
      else if (name === "StudioModeStateChanged") setStudioMode(!!d.studioModeEnabled);
      else if (name === "StreamStateChanged") setStreaming(!!d.outputActive);
      else if (name === "RecordStateChanged") {
        setRecording(!!d.outputActive);
        setPaused(String(d.outputState).includes("PAUSED"));
      } else if (name === "InputMuteStateChanged") setMixer((m) => m.map((i) => (i.name === d.inputName ? { ...i, muted: !!d.inputMuted } : i)));
      else if (name === "InputVolumeChanged") setMixer((m) => m.map((i) => (i.name === d.inputName ? { ...i, db: Number(d.inputVolumeDb) } : i)));
      else if (name === "SceneItemEnableStateChanged") setItems((l) => l.map((i) => (i.id === d.sceneItemId ? { ...i, on: !!d.sceneItemEnabled } : i)));
      else if (name === "link.levels") {
        // Regroupé sur l'image d'écran : au plus un rendu par image, au lieu d'un par message (qui saccadait toute l'interface).
        levelsRef.current = d as Record<string, number>;
        if (!hold.current && !levelFrame.current) {
          levelFrame.current = requestAnimationFrame(() => {
            levelFrame.current = 0;
            if (!hold.current) setLevels(levelsRef.current);
          });
        }
      } else if (name === "link.preview") frameSink.current?.(String(d.image));
      else if (name === "link.studioPreview") previewSink.current?.(String(d.image));
      else if (name === "link.previewState") setPreviewOn(!!d.enabled);
      else if (name === "link.previewMode") setPmode({ mode: d.mode as "video" | "jpeg" | "idle", reason: String(d.reason ?? "") });
      else if (name === "link.directorState") setRoles((r) => (r ? { ...r, directorState: String(d.state), directorCam: Number(d.cam ?? -1), directorReason: String(d.reason ?? "") } : r));
      else if (name === "link.audioState") setRoles((r) => (r ? { ...r, audioState: String(d.state) } : r));
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
  const { link, agent, call, latency, guest } = useRemote(coreUrl, onEvent, deviceId, demoToken, invite);
  const canLive = !guest || guest.level === "full";

  const run = useCallback(
    async <T = Record<string, unknown>,>(method: string, params?: Record<string, unknown>) => {
      try {
        const r = await call<T>(method, params);
        return r;
      } catch (e) {
        setError((e as Error).message);
        return null;
      }
    },
    [call],
  );

  /** Volume d'un fader : au plus un ordre toutes les 200 ms pendant le glissement, le dernier est toujours envoyé (sinon « Trop de commandes d'un coup »). */
  const sendVolume = useCallback(
    (name: string, db: number) => {
      const st = (volumeSend.current[name] ??= { at: 0 });
      clearTimeout(st.timer);
      const fire = () => {
        st.at = Date.now();
        void run("SetInputVolume", { inputName: name, inputVolumeDb: db });
      };
      const wait = 200 - (Date.now() - st.at);
      if (wait <= 0) fire();
      else st.timer = setTimeout(fire, wait);
    },
    [run],
  );

  /** Lecture d'état : un nouvel essai si OBS n'a pas répondu, et l'échec est signalé (jamais une liste vide muette). */
  const read = useCallback(
    async <T,>(method: string, params?: Record<string, unknown>): Promise<T | null> => {
      for (let n = 0; n < 2; n++) {
        try {
          return await call<T>(method, params);
        } catch (e) {
          if (n === 1) setLoadErrors((l) => [...l, `${method} : ${(e as Error).message}`]);
          else await new Promise((r) => setTimeout(r, 400));
        }
      }
      return null;
    },
    [call],
  );

  // Chargement complet de l'état d'OBS.
  const refresh = useCallback(async () => {
    setLoadErrors([]);
    const sl = await read<{ scenes: { sceneName: string }[]; currentProgramSceneName: string }>("GetSceneList");
    if (!sl) return;
    setObsDown(false);
    setError("");
    setScenes([...sl.scenes].reverse().map((s) => s.sceneName));
    setProgram(sl.currentProgramSceneName);
    // Par petits groupes : OBS répond à une demande à la fois, des dizaines en même temps finissent en délai dépassé.
    const [sm, st, rc] = await Promise.all([
      read<{ studioModeEnabled: boolean }>("GetStudioModeEnabled"),
      read<{ outputActive: boolean }>("GetStreamStatus"),
      read<{ outputActive: boolean; outputPaused: boolean }>("GetRecordStatus"),
    ]);
    const [il, pl, cl] = await Promise.all([
      read<{ inputs: { inputName: string; inputKind?: string; hasAudio?: boolean; inputMuted?: boolean; inputVolumeMul?: number; monitorType?: string; global?: boolean }[] }>("GetInputList"),
      read<{ profiles: string[]; currentProfileName: string }>("GetProfileList"),
      read<{ sceneCollections: string[]; currentSceneCollectionName: string }>("GetSceneCollectionList"),
    ]);
    const [tl, bk, pv] = await Promise.all([
      read<{ transitions: { transitionName: string }[]; currentSceneTransitionName: string }>("GetSceneTransitionList"),
      read<Roles>("link.getBackup"),
      read<{ enabled: boolean; mode?: "video" | "jpeg" | "idle"; reason?: string }>("link.getPreview"),
    ]);
    if (sm) {
      setStudioMode(!!sm.studioModeEnabled);
      if (sm.studioModeEnabled) setPreview((await read<{ currentPreviewSceneName: string }>("GetCurrentPreviewScene"))?.currentPreviewSceneName ?? "");
    }
    if (st) setStreaming(!!st.outputActive);
    if (rc) {
      setRecording(!!rc.outputActive);
      setPaused(!!rc.outputPaused);
    }
    if (tl) {
      setTransitions((tl.transitions ?? []).map((t) => t.transitionName));
      setTransition(tl.currentSceneTransitionName ?? "");
    }
    if (bk) setRoles(bk);
    if (pl) setProfiles({ current: pl.currentProfileName ?? "", list: pl.profiles ?? [] });
    if (cl) setCollections({ current: cl.currentSceneCollectionName ?? "", list: cl.sceneCollections ?? [] });
    if (pv) {
      setPreviewOn(pv.enabled !== false);
      setPmode({ mode: pv.mode ?? "idle", reason: pv.reason ?? "" });
    }
    if (il) {
      const inputs = il.inputs ?? [];
      setInputNames(inputs.map((i) => i.inputName));
      // Toutes les entrées audio d'OBS (les sources sans son, comme un texte, n'ont pas de piste).
      setMixer(
        inputs
          .filter((i) => i.hasAudio !== false)
          .map((i) => ({ name: i.inputName, muted: !!i.inputMuted, db: i.inputVolumeMul && i.inputVolumeMul > 0 ? 20 * Math.log10(i.inputVolumeMul) : -100, mon: i.monitorType ?? MON_OFF, global: !!i.global })),
      );
    }
  }, [read]);

  /** Adresse de lecture de l'aperçu vidéo : demandée au Core avec la session du compte (jamais en clair dans la page). */
  const watch = useCallback(async (): Promise<Watch> => {
    const r = invite
      ? await fetch(`${coreUrl}/v1/invite/preview/watch`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ invite }) })
      : demoToken
      ? await fetch(`${coreUrl}/v1/me/link/preview/watch`, { method: "POST", headers: { authorization: `Bearer ${demoToken}` } })
      : await coreFetch(coreUrl, "/v1/me/link/preview/watch", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as Watch;
  }, [coreUrl, demoToken, invite]);

  const ready = link === "on" && agent.online && !obsDown;

  // Chat : affiché ou non, choix gardé dans ce navigateur.
  useEffect(() => {
    try {
      if (localStorage.getItem("syxtee-remote-chat") === "off") setChatOn(false);
    } catch {
      // stockage indisponible
    }
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

  // Sorties multistream du PC (adresses et clés restent dans le plugin).
  useEffect(() => {
    if (!ready) return;
    let live = true;
    void call<MsState>("link.multistreamList").then((r) => live && r && setMs(r)).catch(() => {});
    return () => {
      live = false;
    };
  }, [ready, call]);
  // Comme dans OBS : en Mode Studio on édite la scène d'aperçu, sinon celle du programme.
  const editing = studioMode && preview ? preview : program;

  useEffect(() => {
    if (link !== "on" || !agent.online) return;
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [link, agent.online, refresh, sync]);

  // Sources de la scène éditée, puis les noms de toutes les sources visibles qui la composent (scènes imbriquées comprises) :
  // le mixer d'OBS ne montre que les entrées de la scène en cours, plus les périphériques audio globaux.
  useEffect(() => {
    if (!ready || !editing) return;
    let live = true;
    type Row = { sceneItemId: number; sourceName: string; sceneItemEnabled: boolean; inputKind?: string; sourceType?: string };
    const t = setTimeout(() => {
      void (async () => {
        const top = await read<{ sceneItems: Row[] }>("GetSceneItemList", { sceneName: editing });
        if (!live || !top) return;
        setItems([...(top.sceneItems ?? [])].reverse().map((i) => ({ id: i.sceneItemId, name: i.sourceName, kind: i.sourceType === "OBS_SOURCE_TYPE_SCENE" ? "scene" : (i.inputKind ?? ""), on: i.sceneItemEnabled })));
        const names = new Set<string>();
        const walk = async (rows: Row[], depth: number) => {
          for (const r of rows) {
            if (!r.sceneItemEnabled) continue;
            names.add(r.sourceName);
            if (r.sourceType === "OBS_SOURCE_TYPE_SCENE" && depth < 4) {
              const sub = await call<{ sceneItems: Row[] }>("GetSceneItemList", { sceneName: r.sourceName }).catch(() => null);
              if (sub) await walk(sub.sceneItems ?? [], depth + 1);
            }
          }
        };
        await walk(top.sceneItems ?? [], 0);
        if (live) setSceneAudio(names);
      })();
    }, 0);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [ready, editing, read, call, sync]);

  // « Flux reçu » : une source « Flux … » de la collection est en lecture.
  useEffect(() => {
    if (!ready) return;
    let live = true;
    const check = async () => {
      const flux = inputNames.filter((n) => n.startsWith("Flux"));
      if (flux.length === 0) return live && setFluxName("");
      const states = await Promise.all(flux.map((n) => call<{ mediaState: string }>("GetMediaInputStatus", { inputName: n }).then((r) => r.mediaState).catch(() => "")));
      const i = states.findIndex((s) => s.endsWith("PLAYING"));
      if (live) setFluxName(i >= 0 ? flux[i] : "");
    };
    const first = setTimeout(() => void check(), 0);
    const id = setInterval(() => void check(), 3000);
    return () => {
      live = false;
      clearTimeout(first);
      clearInterval(id);
    };
  }, [ready, inputNames, call]);

  // Écran allumé tant que le contrôle est ouvert (téléphone posé ou en main pendant le direct) ; redemandé au retour sur la page.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const get = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        // refusé (économie de batterie) : l'écran s'éteindra normalement
      }
    };
    const onVisible = () => document.visibilityState === "visible" && void get();
    void get();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

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
    buzz();
    if (studioMode) {
      setPreview(scene);
      void run("SetCurrentPreviewScene", { sceneName: scene });
    } else {
      // La sélection bleue suit le toucher tout de suite (sans attendre la fin de la transition) ; elle revient en arrière si OBS refuse.
      const before = program;
      pendingScene.current = { scene, until: Date.now() + 5000 };
      setProgram(scene);
      void run("SetCurrentProgramScene", { sceneName: scene }).then((r) => {
        if (r === null) {
          pendingScene.current = null;
          setProgram(before);
        }
      });
    }
  }

  const camSceneName = (c: { source: string; label: string }) => `Cam ${c.label.trim() || c.source}`.slice(0, 60);
  /** Crée dans OBS une scène qui ne contient que la source de la caméra, puis la rattache à la caméra. */
  async function createCamScene(i: number) {
    const c = roles?.directorCams?.[i];
    if (!roles || !c?.source) return;
    let name = camSceneName(c);
    if (scenes.includes(name)) name = `${name} ${i + 1}`;
    const made = await run("CreateScene", { sceneName: name });
    if (made === null) return;
    await run("CreateSceneItem", { sceneName: name, sourceName: c.source, sceneItemEnabled: true });
    saveRoles({ directorCams: (roles.directorCams ?? []).map((x, j) => (j === i ? { ...x, scene: name } : x)) });
    later();
  }
  function saveRoles(patch: Partial<Roles>) {
    if (!roles) return;
    const next = { ...roles, ...patch };
    setRoles(next);
    void run<Roles>("link.setBackup", next).then((r) => r && setRoles(r));
  }

  /** Active la régie automatique en un clic : choisit les scènes et sources évidentes (nom « direct », « perdue », « drone », source « Flux »). */
  function enableAuto() {
    if (!roles) return;
    const find = (re: RegExp) => scenes.find((n) => re.test(n)) ?? "";
    const liveScene = roles.liveScene || find(/direct|live/i) || program;
    const scene = roles.scene || find(/perdue|secours|brb|pause|coupure/i);
    const source = roles.source || fluxName || inputNames.find((n) => n.startsWith("Flux")) || "";
    const droneScene = roles.droneScene || find(/drone/i);
    const droneSource = roles.droneSource || inputNames.find((n) => /drone/i.test(n)) || "";
    const backupOk = !!(source && scene && liveScene);
    const droneOk = rights.prises && !!(droneSource && droneScene && liveScene);
    saveRoles({ liveScene, scene, source, droneScene, droneSource, enabled: backupOk, autoEnabled: droneOk });
  }
  // Les prises multiples, la garde audio et la régie IA demandent SYXTEE Link 0.7.0 : un agent plus ancien ignore ces réglages et les renvoie vides.
  const noPrises = !rights.prises;
  const noIa = rights.cams === 0;
  const upsell = (what: string, tier: string) => (
    <p className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-neutral-300">
      {what} : inclus avec la formule {tier}. <a href="/tarifs" className="underline underline-offset-2">Voir les formules</a>
    </p>
  );
  const oldAgent = agent.online && !!agent.version && agent.version.localeCompare("0.7.0", undefined, { numeric: true }) < 0;
  const autoOn = !!roles && (roles.enabled || !!roles.autoEnabled);
  const autoIncomplete = !!roles && !roles.enabled && !roles.autoEnabled && !(roles.liveScene && roles.scene && roles.source) && !(roles.droneSource && roles.droneScene && roles.liveScene);

  // Mixer de la scène éditée : ses sources visibles qui ont du son, plus les périphériques globaux (comme dans OBS).
  const visibleMixer = mixer.filter((i) => i.global || sceneAudio.has(i.name));
  const lost = link !== "on" || !agent.online;
  const statusText = link === "denied" ? "Accès sur invitation" : link === "connecting" ? "Connexion…" : !agent.online ? "OBS hors ligne" : obsDown ? "OBS fermé" : null;
  const received = fluxName !== "";
  // Aucune source « Flux … » dans OBS (et pas seulement pas de signal) : on propose de la créer.
  const noFluxSource = ready && scenes.length > 0 && !inputNames.some((n) => n.startsWith("Flux"));
  async function fixFlux() {
    setFixing(true);
    setFixMsg("");
    const r = await run<{ ok: boolean; message: string }>("link.fixFlux");
    setFixing(false);
    if (r) setFixMsg(r.message);
    later();
    setTimeout(() => setFixMsg(""), 8000);
  }

  const scenesPanel = (
    <section aria-label="Scènes" className={`${panel} ${tab === "scenes" ? "" : "max-lg:hidden"}`}>
      <h2 className={panelTitle}>
        Scènes <span className="font-normal text-neutral-500">{scenes.length}</span>
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {scenes.length === 0 ? (
          <p className="px-2 py-2 text-[13px] text-neutral-500">{ready ? "Aucune scène dans cette collection." : "En attente d'OBS…"}</p>
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
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
                    className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left max-lg:min-h-12 text-[13px] disabled:opacity-50 ${isProgram ? "bg-white/[0.13] text-white" : isPreview ? "outline outline-1 -outline-offset-1 outline-white/40" : "text-neutral-300 hover:bg-[#161616]"}`}
                  >
                    <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${isProgram ? "bg-white" : "bg-neutral-600"}`} />
                    <span className="min-w-0 flex-1 break-words leading-tight">{sc}</span>
                    {isProgram && <span className="shrink-0 text-[12px] opacity-80">direct</span>}
                    {isPreview && <span className="shrink-0 text-[12px] text-neutral-400">aperçu</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {studioMode && (
        <div className="grid gap-1.5 border-t border-[#262626] p-1.5">
          <select value={transition} onChange={(e) => (setTransition(e.target.value), void run("SetCurrentSceneTransition", { transitionName: e.target.value }))} aria-label="Transition" className={`${field} h-8`}>
            {transitions.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button type="button" onClick={() => run("TriggerStudioModeTransition")} className={`${flat} h-8`}>
            Transition
          </button>
        </div>
      )}
    </section>
  );

  const sourcesPanel = (
    <section aria-label="Sources de la scène" className={`${panel} ${tab === "sources" ? "" : "max-lg:hidden"}`}>
      <h2 className={panelTitle}>
        Sources <span className="min-w-0 truncate font-normal text-neutral-500">{editing || "—"}</span>
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {items.length === 0 ? (
          <p className="px-2 py-2 text-[13px] text-neutral-500">Aucune source dans cette scène.</p>
        ) : (
          <ul>
            {items.map((i) => (
              <li key={i.id} className="flex min-h-9 items-center gap-2 rounded px-2 hover:bg-[#101010]">
                <KindIcon kind={i.kind} />
                <span className={`min-w-0 flex-1 truncate text-[13px] ${i.on ? "text-neutral-100" : "text-neutral-500 line-through"}`}>{i.name}</span>
                <span className="shrink-0 text-[12px] text-neutral-500">{i.flux ? "Flux SYXTEE" : kindLabel(i.kind)}</span>
                <button
                  type="button"
                  aria-pressed={i.on}
                  aria-label={`${i.on ? "Masquer" : "Afficher"} ${i.name}`}
                  onClick={() => {
                    setItems((l) => l.map((x) => (x.id === i.id ? { ...x, on: !x.on } : x)));
                    void run("SetSceneItemEnabled", { sceneName: editing, sceneItemId: i.id, sceneItemEnabled: !i.on });
                  }}
                  className="grid size-8 shrink-0 place-items-center rounded text-neutral-300 hover:bg-[#1d1d1d]"
                >
                  <Eye on={i.on} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );

  const mixerPanel = (
    <section aria-label="Mélangeur audio" className={`${panel} ${tab === "mixer" ? "" : "max-lg:hidden"}`}>
      <h2 className={panelTitle}>Mixer audio</h2>
      <div className="min-h-0 flex-1 overflow-x-auto p-1.5">
        {visibleMixer.length === 0 ? (
          <p className="px-2 py-2 text-[13px] text-neutral-500">{ready ? "Aucune source audio dans cette scène." : "En attente d'OBS…"}</p>
        ) : (
          <ul className="flex h-full gap-2">
            {visibleMixer.map((i) => (
              <li key={i.name} className="flex h-full w-[5.5rem] shrink-0 flex-col items-center rounded bg-[#0d0d0d] px-1.5 py-1.5">
                <span className="line-clamp-3 min-h-[2.3em] w-full break-words text-center text-[11px] font-medium uppercase leading-tight text-neutral-200" title={i.name}>
                  {i.name}
                </span>
                <div className="mt-1 flex min-h-0 flex-1 items-stretch gap-1">
                  <input
                    type="range"
                    min={-60}
                    max={0}
                    step={0.5}
                    value={Number.isFinite(i.db) ? Math.max(-60, Math.min(0, i.db)) : -60}
                    aria-label={`Volume ${i.name}`}
                    onChange={(e) => {
                      const db = Number(e.target.value);
                      setMixer((m) => m.map((x) => (x.name === i.name ? { ...x, db } : x)));
                      sendVolume(i.name, db);
                    }}
                    style={{ writingMode: "vertical-lr", direction: "rtl", width: "1.5rem" }}
                    data-fader
                    className="cursor-pointer accent-white max-lg:!w-9"
                  />
                  <div className="relative w-1.5 overflow-hidden rounded-sm bg-[#1a1a1a]" role="meter" aria-label={`Niveau ${i.name}`} aria-valuemin={-60} aria-valuemax={0} aria-valuenow={Math.round(levels[i.name] ?? -60)}>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-600 via-emerald-500 to-red-500" style={{ height: `${i.muted ? 0 : dbToPct(levels[i.name] ?? -100)}%`, transition: "height 50ms linear" }} />
                  </div>
                </div>
                <span className="mt-1 text-[12px] tabular-nums text-neutral-300">{Number.isFinite(i.db) && i.db > -100 ? i.db.toFixed(1) : "-inf"}</span>
                <div className="mt-1 flex gap-1">
                  <button type="button" aria-pressed={i.muted} aria-label={`${i.muted ? "Réactiver" : "Couper"} ${i.name}`} title={i.muted ? "Réactiver le micro" : "Couper le micro"} onClick={() => (buzz(), run("SetInputMute", { inputName: i.name, inputMuted: !i.muted }))} className={`${flat} size-7 ${i.muted ? "!border-red-700 !text-red-400" : ""}`}>
                    <MicIcon off={i.muted} />
                  </button>
                  <button
                    type="button"
                    aria-pressed={i.mon !== MON_OFF}
                    aria-label={`Écoute de ${i.name}`}
                    title={i.mon === MON_OFF ? "Écouter cette piste" : "Arrêter l'écoute"}
                    onClick={() => {
                      const mon = i.mon === MON_OFF ? MON_ON : MON_OFF;
                      setMixer((m) => m.map((x) => (x.name === i.name ? { ...x, mon } : x)));
                      void run("SetInputAudioMonitorType", { inputName: i.name, monitorType: mon });
                    }}
                    className={`${flat} size-7 ${i.mon !== MON_OFF ? "!border-white/40 !text-white" : ""}`}
                  >
                    <HeadphonesIcon off={i.mon === MON_OFF} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex justify-end border-t border-[#262626] px-2 py-1">
        <button type="button" aria-pressed={meterHold} aria-label={meterHold ? "Reprendre les niveaux" : "Figer les niveaux"} title={meterHold ? "Reprendre les niveaux" : "Figer les niveaux"} onClick={() => setMeterHold((h) => !h)} className="grid size-6 place-items-center rounded text-neutral-400 hover:bg-[#1d1d1d]">
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
            {meterHold ? <path d="M8 5v14l11-7z" /> : <path d="M7 5h4v14H7zM13 5h4v14h-4z" />}
          </svg>
        </button>
      </div>
    </section>
  );

  const multiPanel = (
    <div className={`min-h-0 min-w-0 ${tab === "multi" ? "grid" : "max-lg:hidden lg:grid"} grid-rows-1`}>
      <MultistreamPanel state={ms} mainLive={streaming} call={call} ready={ready} canControl={canLive} canEdit={!guest} onChange={setMs} />
    </div>
  );

  const controlsPanel = (
    <div className={`flex min-h-0 min-w-0 flex-col gap-2 overflow-y-auto overscroll-contain ${tab === "controls" ? "" : "max-lg:hidden"}`}>
     <div className="flex shrink-0 flex-col gap-2">
      <section aria-label="Contrôles" className={panel}>
        <h2 className={panelTitle}>Contrôles</h2>
        <div className="grid gap-1.5 p-2">
          <button type="button" disabled={!ready || !canLive} onClick={() => setConfirm(streaming ? "stop" : "start")} className={`${flat} h-10 ${streaming ? "!border-red-700 !bg-red-700 !text-white" : ""}`}>
            {streaming ? `Arrêter le direct · ${clock(stats?.streamMs ?? 0)}` : "Partir en direct"}
          </button>
          <button type="button" disabled={!ready || !canLive} onClick={() => void run(recording ? "StopRecord" : "StartRecord")} className={`${flat} h-10 ${recording ? "!border-red-700 !bg-red-700 !text-white" : ""}`}>
            {recording ? `Arrêter l'enregistrement · ${clock(stats?.recMs ?? 0)}` : "Démarrer l'enregistrement"}
          </button>
          {recording && (
            <button type="button" onClick={() => run(paused ? "ResumeRecord" : "PauseRecord")} className={`${flat} h-8`}>
              {paused ? "Reprendre l'enregistrement" : "Mettre en pause"}
            </button>
          )}
        </div>
      </section>
      <section aria-label="Flux" className={`${panel} shrink-0`}>
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]">
          <span className="font-semibold">Flux</span>
          <span className="min-w-0 truncate text-neutral-300" title={stats?.encoder}>
            {streaming ? `${stats?.kbps != null ? `${stats.kbps} kbit/s` : "…"} · ${stats?.encoder || "en direct"}` : recording ? "enregistrement" : "—"}
          </span>
        </div>
        {streaming && stats && stats.congestion > 0.3 && <p className="px-3 pb-2 text-[12px] text-amber-400">Réseau du PC saturé.</p>}
      </section>
     </div>
    </div>
  );

  const chatBox = chatDefaults ? (
    <div data-theme="dark" className="h-full min-h-0 bg-black text-neutral-100">
      <MultiChat defaults={chatDefaults} height="h-full" compact />
    </div>
  ) : null;

  const programLabel = (
    <p className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden whitespace-nowrap text-[13px] max-sm:[&>span:first-child]:hidden">
      <span className="text-neutral-500">Programme</span>
      <span className="truncate text-neutral-100">{program || "—"}</span>
      <span className={streaming ? "text-red-500" : "text-neutral-500"}>{streaming ? "en direct" : "hors direct"}</span>
    </p>
  );

  return (
    <div className="flex h-dvh w-full min-w-0 max-w-[100vw] flex-col overflow-hidden overscroll-none bg-[#070708] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-[13px] text-neutral-100 [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] [touch-action:manipulation]">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#262626] px-3.5">
        <h1 className="flex items-center gap-2.5 text-[14px] font-medium">
          Contrôle à distance
          {streaming && (
            <span role="status" className="inline-flex items-center gap-1.5 rounded border border-red-700 bg-red-700/20 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-red-300">
              <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-red-500 motion-reduce:animate-none" />
              EN DIRECT {clock(stats?.streamMs ?? 0)}
            </span>
          )}
        </h1>
        {guest ? (
          <p className="truncate text-[12px] text-neutral-400" title="Tu pilotes cet OBS avec un lien d'invitation">
            Invité · {guest.label} · {guest.level === "view" ? "lecture seule" : guest.level === "scenes" ? "scènes et son" : "tous les droits"}
          </p>
        ) : (
          <Link href="/dashboard/controle-a-distance" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/[0.14] bg-[#16161a] px-3.5 text-[13px] text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:bg-[#1e1e23] max-lg:h-9">
            <span aria-hidden="true">←</span> Retour
          </Link>
        )}
      </header>

      <div className="relative mx-2 mt-2 flex h-11 shrink-0 items-center gap-3 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0b0b0d] px-3 [scrollbar-width:none]">
        <span role="status" className="shrink-0 whitespace-nowrap font-medium" title={latency != null ? `${latency} ms` : undefined}>
          {agent.name ?? "OBS"}
          {(statusText || latency != null) && <span className="ml-2 text-[12px] font-normal text-neutral-500">{statusText ?? `${latency} ms`}</span>}
        </span>
        <label className="flex shrink-0 items-center gap-1.5 text-neutral-400 max-lg:hidden">
          Profil
          <select aria-label="Profil OBS" className={`${field} max-w-[13rem]`} disabled={!ready || !canLive || profiles.list.length === 0} value={profiles.current} onChange={(e) => void run("SetCurrentProfile", { profileName: e.target.value }).then((r) => r && later())}>
            {profiles.list.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="flex shrink-0 items-center gap-1.5 text-neutral-400 max-lg:hidden">
          Collection
          <select aria-label="Collection de scènes" className={`${field} max-w-[13rem]`} disabled={!ready || !canLive || collections.list.length === 0} value={collections.current} onChange={(e) => void run("SetCurrentSceneCollection", { sceneCollectionName: e.target.value }).then((r) => r && later())}>
            {collections.list.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <span role="status" className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap ${received ? "text-emerald-400" : "text-amber-300"}`}>
          <span aria-hidden="true" className={`size-2 rounded-full ${received ? "bg-emerald-400" : "bg-amber-300"}`} />
          {received ? fluxName : noFluxSource ? "Aucun flux dans OBS" : "Aucun flux reçu"}
        </span>
        {noFluxSource && !guest && (
          <button type="button" disabled={fixing} onClick={() => void fixFlux()} className={`${flat} h-7 shrink-0 gap-1.5 !border-amber-600 px-3.5 !text-amber-200`}>
            {fixing ? "Correction…" : "Corriger"}
          </button>
        )}
        {fixMsg && (
          <span role="status" className="shrink-0 whitespace-nowrap text-[12px] text-neutral-300">
            {fixMsg}
          </span>
        )}
        <div className={`relative shrink-0 ${guest ? "hidden" : ""}`} ref={devicePanel}>
          <button type="button" aria-expanded={deviceOpen} disabled={!roles} onClick={() => setDeviceOpen((o) => !o)} className={`${flat} h-7 gap-1.5 px-3.5`}>
            <span aria-hidden="true" className={`size-1.5 rounded-full ${autoOn ? "bg-emerald-400" : "bg-neutral-600"}`} /> <span className="max-lg:hidden">Régie auto</span><span className="lg:hidden">Régie</span>
          </button>
          {deviceOpen && roles && (
            <div role="dialog" aria-label="Appareil" className="fixed inset-x-2 top-24 z-40 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-md border border-[#333] bg-[#0b0b0b] p-4 shadow-xl sm:inset-x-auto sm:left-3 sm:w-[26rem]">
              <div className="mb-4 grid gap-3 border-b border-[#262626] pb-4 lg:hidden">
                <PopSelect label="Profil" value={profiles.current} options={profiles.list} onChange={(v) => void run("SetCurrentProfile", { profileName: v }).then((r) => r && later())} />
                <PopSelect label="Collection de scènes" value={collections.current} options={collections.list} onChange={(v) => void run("SetCurrentSceneCollection", { sceneCollectionName: v }).then((r) => r && later())} />
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">Mode studio</p>
                  <Switch label="Mode studio" on={studioMode} disabled={!ready} onClick={() => void run("SetStudioModeEnabled", { studioModeEnabled: !studioMode })} />
                </div>
              </div>
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div>
                  <p className="font-medium">{autoOn ? "Régie auto activée" : "Régie auto éteinte"}</p>
                  <p className="text-[12px] text-neutral-500">{autoOn ? "Secours et drone gérés tout seuls." : "Un clic : on choisit les scènes évidentes pour toi."}</p>
                </div>
                <button
                  type="button"
                  onClick={() => (autoOn ? saveRoles({ enabled: false, autoEnabled: false }) : enableAuto())}
                  className={`${flat} h-8 px-4 ${autoOn ? "" : "!border-white/30 !bg-white !text-black hover:!bg-white/90"}`}
                >
                  {autoOn ? "Désactiver" : "Activer"}
                </button>
              </div>
              {autoIncomplete && <p className="-mt-2 mb-3 text-[12px] text-amber-300">On n&apos;a pas tout trouvé : choisis les scènes ci-dessous, puis réactive.</p>}
              {oldAgent && (
                <p role="alert" className="mb-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-200">
                  Ton SYXTEE Link est en version {agent.version}. Les sections « Autres prises », « Garde audio » et « Régie IA » demandent la version 0.7.0 : mets-le à jour pour les utiliser.
                </p>
              )}
              <h2 className="text-[13px] font-semibold">Régie automatique</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                SYXTEE change de scène pour toi, mais seulement quand ta <strong className="font-medium text-neutral-300">scène Live</strong> est à l&apos;antenne : rien ne bouge tant que tu ne l&apos;as pas mise en direct.
              </p>
              {roles.state === "drone" && <p className="mt-2 rounded border border-[#2a2a2a] bg-[#111] px-2.5 py-1.5 text-[12px] text-emerald-300">En ce moment : belle prise du drone à l&apos;antenne.</p>}
              {roles.state === "backup" && <p className="mt-2 rounded border border-[#3a2a1a] bg-[#1a1208] px-2.5 py-1.5 text-[12px] text-amber-200">En ce moment : scène de secours à l&apos;antenne (connexion coupée).</p>}

              <h3 className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-neutral-400">1 · Ta scène Live</h3>
              <div className="mt-2 grid gap-3">
                <PopSelect label="La scène que tu mets en direct" value={roles.liveScene} options={scenes} onChange={(v) => saveRoles({ liveScene: v })} />
              </div>

              <h3 className="mt-5 text-[12px] font-semibold uppercase tracking-wide text-neutral-400">2 · Si ta connexion coupe</h3>
              <div className="mt-2 grid gap-3">
                <PopSelect label="Scène de secours" value={roles.scene} options={scenes} onChange={(v) => saveRoles({ scene: v })} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Passer sur le secours</p>
                  <p className="text-[12px] text-neutral-500">Affiche le secours quand l&apos;image se fige, puis revient seul quand elle repart.</p>
                </div>
                <Switch label="Passer sur le secours" on={roles.enabled} disabled={!roles.source || !roles.scene || !roles.liveScene} onClick={() => saveRoles({ enabled: !roles.enabled })} />
              </div>
              {(!roles.source || !roles.scene || !roles.liveScene) && <p className="mt-2 text-[12px] text-neutral-500">Choisis la scène Live et la scène de secours. Si le flux n&apos;est pas dans OBS, clique sur « Corriger » en haut de la page.</p>}

              <h3 className="mt-5 text-[12px] font-semibold uppercase tracking-wide text-neutral-400">3 · Auto-gérance (drone)</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">Quand la caméra drone envoie une belle image (qui bouge, pas noire), SYXTEE passe dessus tout seul, puis revient sur ta scène Live quand la prise s&apos;arrête. Si tu changes de scène à la main, elle se met en pause 30 secondes.</p>
              <div className="mt-2 grid gap-3">
                <PopSelect label="Source du drone" value={roles.droneSource ?? ""} options={inputNames} onChange={(v) => saveRoles({ droneSource: v })} />
                <PopSelect label="Scène du drone (n'importe laquelle)" value={roles.droneScene ?? ""} options={scenes} onChange={(v) => saveRoles({ droneScene: v })} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Auto-gérance</p>
                  <p className="text-[12px] text-neutral-500">{roles.autoEnabled ? "Active : elle surveille le drone." : "Éteinte."}</p>
                </div>
                <Switch label="Auto-gérance" on={!!roles.autoEnabled} disabled={noPrises || !roles.droneSource || !roles.droneScene || !roles.liveScene} onClick={() => saveRoles({ autoEnabled: !roles.autoEnabled })} />
              </div>
              {noPrises && upsell("L'auto-gérance du drone et les autres prises", "Signature")}
              <h3 className="mt-5 text-[12px] font-semibold uppercase tracking-wide text-neutral-400">Autres prises</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">Même principe pour une autre caméra, un écran ou un invité : belle image sur la source, on passe sur sa scène. Le drone passe en premier, puis la liste dans l&apos;ordre.</p>
              {(roles.autoRules ?? []).map((r, i) => (
                <div key={i} className="mt-2 grid gap-2 rounded-lg border border-white/10 p-2.5">
                  <PopSelect label={`Source ${i + 1}`} value={r.source} options={inputNames} onChange={(v) => saveRoles({ autoRules: (roles.autoRules ?? []).map((x, j) => (j === i ? { ...x, source: v } : x)) })} />
                  <PopSelect label={`Scène ${i + 1}`} value={r.scene} options={scenes} onChange={(v) => saveRoles({ autoRules: (roles.autoRules ?? []).map((x, j) => (j === i ? { ...x, scene: v } : x)) })} />
                  <button type="button" onClick={() => saveRoles({ autoRules: (roles.autoRules ?? []).filter((_, j) => j !== i) })} className={`${flat} h-7 justify-self-start px-3`}>
                    Retirer
                  </button>
                </div>
              ))}
              {(roles.autoRules ?? []).length < 8 && (
                <button type="button" disabled={oldAgent || noPrises} onClick={() => saveRoles({ autoRules: [...(roles.autoRules ?? []), { source: "", scene: "" }] })} className={`${flat} mt-2 h-8 px-4`}>
                  Ajouter une prise
                </button>
              )}
              {(roles.autoRules ?? []).some((r) => !r.source || !r.scene) && <p className="mt-2 text-[12px] text-amber-300">Une prise sans source ou sans scène est ignorée.</p>}
              <h3 className="mt-5 text-[12px] font-semibold uppercase tracking-wide text-neutral-400">4 · Garde audio</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">Quand ta scène Live est à l&apos;antenne, SYXTEE te prévient si ton micro se tait ou se coupe.</p>
              <div className="mt-2 grid gap-3">
                <PopSelect label="Micro à surveiller" value={roles.audioSource ?? ""} options={inputNames} onChange={(v) => saveRoles({ audioSource: v })} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Alerte silence</p>
                  <p className="text-[12px] text-neutral-500">{roles.audioEnabled ? `Active : alerte après ${roles.audioSeconds ?? 10} s sans son.` : "Éteinte."}</p>
                </div>
                <Switch label="Alerte silence" on={!!roles.audioEnabled} disabled={oldAgent || !roles.audioSource || !roles.liveScene} onClick={() => saveRoles({ audioEnabled: !roles.audioEnabled })} />
              </div>
              <label className="mt-3 flex items-center justify-between gap-3 text-[13px]">
                <span>Délai avant l&apos;alerte</span>
                <select disabled={oldAgent}
                  value={roles.audioSeconds ?? 10}
                  onChange={(e) => saveRoles({ audioSeconds: Number(e.target.value) })}
                  className="h-8 rounded border border-white/15 bg-transparent px-2 text-[13px]"
                >
                  {[5, 10, 20, 30, 60].map((n) => (
                    <option key={n} value={n} className="bg-[#0b0b0d]">
                      {n} secondes
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Remettre le micro tout seul</p>
                  <p className="text-[12px] text-neutral-500">S&apos;il est coupé par erreur pendant ta scène Live.</p>
                </div>
                <Switch label="Remettre le micro" on={!!roles.audioUnmute} disabled={oldAgent || !roles.audioSource} onClick={() => saveRoles({ audioUnmute: !roles.audioUnmute })} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Passer sur le secours</p>
                  <p className="text-[12px] text-neutral-500">Affiche ta scène de secours tant que le micro est muet, puis revient sur Live quand le son repart.</p>
                </div>
                <Switch label="Secours si micro muet" on={!!roles.audioBackup} disabled={oldAgent || !roles.audioSource || !roles.scene} onClick={() => saveRoles({ audioBackup: !roles.audioBackup })} />
              </div>
              {!roles.scene && <p className="mt-2 text-[12px] text-neutral-500">Choisis d&apos;abord ta scène de secours (étape 2).</p>}
              <h3 className="mt-5 text-[12px] font-semibold uppercase tracking-wide text-neutral-400">5 · Régie IA (plusieurs caméras)</h3>
              {noIa && upsell("La régie IA", "Signature")}
              {!noIa && rights.cams < 6 && <p className="mt-1 text-[12px] text-neutral-500">Ta formule permet jusqu'à {rights.cams} caméras (6 avec Prestige).</p>}
              <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                Pour 2 caméras ou plus (Osmo, iPhone, drone, téléphones en SRTLA) : toutes les quelques secondes, une IA regarde chaque caméra et met au programme celle où il se passe quelque chose, selon tes consignes. Une caméra coupée ou figée n&apos;est jamais choisie. Chaque caméra a besoin de sa propre scène OBS : choisis la source, puis « Créer la scène » si elle n&apos;existe pas encore.
              </p>
              {(roles.directorCams ?? []).map((c, i) => (
                <div key={i} className="mt-2 grid gap-2 rounded-lg border border-white/10 p-2.5">
                  <label className="grid gap-1 text-[12px] text-neutral-400">
                    Rôle (lu par l&apos;IA)
                    <input disabled={oldAgent}
                      defaultValue={c.label}
                      maxLength={80}
                      placeholder="ex. Osmo à la main"
                      onBlur={(e) => saveRoles({ directorCams: (roles.directorCams ?? []).map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                      className="h-8 rounded border border-white/15 bg-transparent px-2 text-[13px] text-neutral-100"
                    />
                  </label>
                  <PopSelect label={`Source caméra ${i + 1}`} value={c.source} options={inputNames} onChange={(v) => saveRoles({ directorCams: (roles.directorCams ?? []).map((x, j) => (j === i ? { ...x, source: v } : x)) })} />
                  <PopSelect label={`Scène caméra ${i + 1}`} value={c.scene} options={scenes} onChange={(v) => saveRoles({ directorCams: (roles.directorCams ?? []).map((x, j) => (j === i ? { ...x, scene: v } : x)) })} />
                  <div className="flex flex-wrap gap-2">
                    {c.source && !c.scene && (
                      <button type="button" onClick={() => void createCamScene(i)} className={`${flat} h-7 px-3`}>
                        Créer la scène « {camSceneName(c)} »
                      </button>
                    )}
                    <button type="button" onClick={() => saveRoles({ directorCams: (roles.directorCams ?? []).filter((_, j) => j !== i) })} className={`${flat} h-7 px-3`}>
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
              {(roles.directorCams ?? []).length < rights.cams && (
                <button type="button" disabled={oldAgent} onClick={() => saveRoles({ directorCams: [...(roles.directorCams ?? []), { source: "", scene: "", label: "" }] })} className={`${flat} mt-2 h-8 px-4`}>
                  Ajouter une caméra
                </button>
              )}
              <label className="mt-3 grid gap-1 text-[12px] text-neutral-400">
                Consignes (en français, comme à un réalisateur)
                <textarea disabled={oldAgent}
                  defaultValue={roles.directorRules ?? ""}
                  maxLength={1000}
                  rows={4}
                  onBlur={(e) => e.target.value !== (roles.directorRules ?? "") && saveRoles({ directorRules: e.target.value })}
                  className="rounded border border-white/15 bg-transparent p-2 text-[13px] leading-relaxed text-neutral-100"
                />
              </label>
              <label className="mt-3 grid gap-1 text-[12px] text-neutral-400">
                IA utilisée
                <select disabled={oldAgent} value={roles.directorProvider ?? "mistral"} onChange={(e) => saveRoles({ directorProvider: e.target.value as "mistral" | "anthropic" | "local" })} className="h-8 rounded border border-white/15 bg-transparent px-2 text-[13px] text-neutral-100">
                  <option value="local" className="bg-[#0b0b0d]">Sur ton PC (gratuit, rien ne sort)</option>
                  <option value="mistral" className="bg-[#0b0b0d]">Mistral (offre gratuite)</option>
                  <option value="anthropic" className="bg-[#0b0b0d]">Claude d&apos;Anthropic (payant)</option>
                </select>
              </label>
              {roles.directorProvider === "local" ? (
                <div className="mt-3 grid gap-2 text-[12px] text-neutral-400">
                  <label className="grid gap-1">
                    Modèle Ollama (vide : gemma3:4b)
                    <input
                      disabled={oldAgent}
                      defaultValue={roles.directorModel ?? ""}
                      maxLength={80}
                      placeholder="gemma3:4b"
                      onBlur={(e) => e.target.value.trim() !== (roles.directorModel ?? "") && saveRoles({ directorModel: e.target.value.trim() })}
                      className="h-8 rounded border border-white/15 bg-transparent px-2 text-[13px] text-neutral-100"
                    />
                  </label>
                  <p className="leading-relaxed">Installe Ollama (ollama.com) sur le PC d&apos;OBS, puis lance « ollama pull gemma3:4b » dans un terminal (environ 3 Go). Aucune clé, aucun envoi : l&apos;IA tourne sur ce PC.</p>
                </div>
              ) : (
                <>
              <label className="mt-3 grid gap-1 text-[12px] text-neutral-400">
                Clé API {(roles.directorProvider ?? "mistral") === "mistral" ? "Mistral" : "Anthropic"}, facultative {roles.directorKeySet ? "(enregistrée sur ce PC)" : "(reste sur ton PC)"}
                <input disabled={oldAgent}
                  type="password"
                  autoComplete="off"
                  placeholder={roles.directorKeySet ? "••••••••  (laisser vide pour garder)" : roles.directorProvider === "anthropic" ? "sk-ant-…" : "Clé de console.mistral.ai"}
                  onBlur={(e) => {
                    if (e.target.value.trim()) {
                      saveRoles({ directorKey: e.target.value.trim() });
                      e.target.value = "";
                    }
                  }}
                  className="h-8 rounded border border-white/15 bg-transparent px-2 text-[13px] text-neutral-100"
                />
              </label>
              {roles.directorProvider === "anthropic" && <label className="mt-3 grid gap-1 text-[12px] text-neutral-400">
                Identifiant d&apos;espace de travail Anthropic (seulement si ta clé n&apos;est pas rattachée à un espace)
                <input
                  disabled={oldAgent}
                  defaultValue={roles.directorWorkspaceId ?? ""}
                  maxLength={100}
                  placeholder="wrkspc_…"
                  onBlur={(e) => e.target.value.trim() !== (roles.directorWorkspaceId ?? "") && saveRoles({ directorWorkspaceId: e.target.value.trim() })}
                  className="h-8 rounded border border-white/15 bg-transparent px-2 text-[13px] text-neutral-100"
                />
              </label>}
                </>
              )}
              {roles.directorProvider !== "local" && roles.directorKeySet && (
                <button type="button" onClick={() => saveRoles({ directorClearKey: true })} className={`${flat} mt-2 h-7 justify-self-start px-3`}>
                  Effacer la clé
                </button>
              )}
              <div className="mt-3 flex items-center justify-between gap-3 text-[13px]">
                <label className="flex items-center gap-2">
                  Analyse toutes les
                  <select disabled={oldAgent} value={roles.directorInterval ?? 4} onChange={(e) => saveRoles({ directorInterval: Number(e.target.value) })} className="h-8 rounded border border-white/15 bg-transparent px-2">
                    {[2, 4, 6, 10].map((n) => (
                      <option key={n} value={n} className="bg-[#0b0b0d]">
                        {n} s
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  Garde au moins
                  <select disabled={oldAgent} value={roles.directorHold ?? 6} onChange={(e) => saveRoles({ directorHold: Number(e.target.value) })} className="h-8 rounded border border-white/15 bg-transparent px-2">
                    {[3, 6, 10, 20].map((n) => (
                      <option key={n} value={n} className="bg-[#0b0b0d]">
                        {n} s
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Régie IA</p>
                  <p className="text-[12px] text-neutral-500">
                    {roles.directorEnabled
                      ? roles.directorState === "cam" && roles.directorCam != null && roles.directorCam >= 0
                        ? `Active : « ${roles.directorCams?.filter((c) => c.source && c.scene)[roles.directorCam]?.label || "caméra " + (roles.directorCam + 1)} » au programme.`
                        : "Active : elle regarde tes caméras."
                      : "Éteinte."}
                  </p>
                </div>
                <Switch
                  label="Régie IA"
                  on={!!roles.directorEnabled}
                  disabled={oldAgent || noIa || !roles.liveScene || (roles.directorCams ?? []).filter((c) => c.source && c.scene).length < 2}
                  onClick={() => saveRoles({ directorEnabled: !roles.directorEnabled })}
                />
              </div>
              {roles.directorEnabled && roles.directorState === "error" && (
                <p role="alert" className="mt-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-200">
                  La régie IA n&apos;arrive pas à joindre l&apos;IA : {roles.directorReason || "erreur inconnue"}
                </p>
              )}
              {(roles.directorCams ?? []).filter((c) => c.source && c.scene).length < 2 && <p className="mt-2 text-[12px] text-neutral-500">Il faut ta scène Live et au moins 2 caméras complètes (source et scène).</p>}
              <p className="mt-2 text-[12px] text-neutral-500">{roles.directorProvider === "local" ? "L'IA tourne sur ce PC avec Ollama : elle choisit la caméra selon tes consignes, sans clé ni envoi." : roles.directorKeySet ? "Avec ta clé API, l'IA choisit la caméra selon tes consignes." : "Sans clé API (gratuit) : la régie reprend sur une caméra vivante dès que celle à l'antenne tombe. Ajoute une clé pour que l'IA choisisse selon tes consignes."}</p>
              <p className="mt-2 text-[12px] text-neutral-500">{roles.directorProvider === "local" ? "Rien n'est envoyé hors du PC : les vignettes de tes caméras sont analysées en local par Ollama. Désactive la régie IA pour arrêter." : <>Chaque analyse envoie de petites vignettes de tes caméras à {(roles.directorProvider ?? "mistral") === "mistral" ? "Mistral (offre gratuite d'expérimentation sur console.mistral.ai, avec des limites de débit)" : "Anthropic (facturé par appel)"} avec ta clé (un appel toutes les {roles.directorInterval ?? 4} s en direct). Désactive la régie IA pour ne rien envoyer.</>}</p>
              <fieldset className="mt-4">
                <legend className="text-[13px] font-semibold">Sensibilité du secours</legend>
                <div className="mt-2 grid gap-2">
                  {TRIGGERS.map((t) => (
                    <label key={t.id} className={`cursor-pointer rounded border p-2.5 ${roles.trigger === t.id ? "border-white/50" : "border-[#2e2e2e] hover:border-[#444]"}`}>
                      <span className="flex items-center gap-2 font-medium">
                        <input type="radio" name="trigger" checked={roles.trigger === t.id} onChange={() => saveRoles({ trigger: t.id })} className="accent-current" />
                        {t.title}
                      </span>
                      <span className="mt-1 block pl-6 text-[12px] text-neutral-500">{t.text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
        </div>
        {chatDefaults && (
          <button type="button" aria-pressed={chatOn} onClick={toggleChat} className={`${flat} ml-auto h-7 shrink-0 px-3.5 max-lg:hidden ${chatOn ? "!border-white/30 !bg-white/[0.14] !text-white" : ""}`}>
            Chat
          </button>
        )}
        <label className={`${chatDefaults ? "" : "ml-auto "}flex shrink-0 items-center gap-2 max-lg:hidden`}>
          <span className="sr-only">Mode studio</span>
          <button type="button" role="switch" aria-label="Mode studio" aria-checked={studioMode} disabled={!ready} onClick={() => void run("SetStudioModeEnabled", { studioModeEnabled: !studioMode })} className={`${flat} h-7 px-3.5 ${studioMode ? "!border-white/30 !bg-white/[0.14] !text-white" : ""}`}>
            Mode studio
          </button>
        </label>
      </div>

      {(lost || (obsDown && !lost) || error || loadErrors.length > 0) && (
        <div role="alert" className="mx-2 mt-2 shrink-0 rounded-md border border-[#3a2a1a] bg-[#1a1208] px-3 py-1.5 text-[13px] text-amber-200">
          {link === "denied"
            ? guest || invite
              ? "Ce lien d'invitation n'est plus valable : il a été retiré ou il a expiré."
              : "Le contrôle à distance est réservé aux comptes invités."
            : link === "connecting"
              ? "Connexion au serveur…"
              : link === "off"
                ? "Connexion perdue : nouvelle tentative…"
                : !agent.online
                  ? "Cet OBS n'est plus en ligne. Ouvre OBS sur l'ordinateur : le contrôle reprend tout seul."
                  : obsDown
                    ? "OBS vient de se fermer. Le contrôle reprend dès qu'il est rouvert."
                    : error || `OBS n'a pas répondu à : ${loadErrors.join(" ; ")}`}
        </div>
      )}

      {/* Programme (et, en Mode Studio, aperçu à gauche) */}
      <div className="flex min-h-0 min-w-0 flex-1 lg:gap-0">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2 max-lg:landscape:flex-row">
        {roles && (roles.audioState === "silent" || roles.audioState === "muted" || roles.audioState === "backup") && (
          <p role="alert" className="shrink-0 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[13px] text-amber-200">
            {roles.audioState === "backup" ? `Micro « ${roles.audioSource} » muet : scène de secours à l'antenne, retour sur Live quand le son repart.` : roles.audioState === "muted" ? `Micro « ${roles.audioSource} » coupé : personne ne t'entend.` : `Silence sur « ${roles.audioSource} » depuis plus de ${roles.audioSeconds ?? 10} s : vérifie ton micro.`}
          </p>
        )}
        <section aria-label="Programme" className={`relative grid min-h-0 shrink-0 grid-rows-[auto_1fr] rounded-xl border border-white/[0.08] bg-[#0b0b0d] ${tab === "chat" ? "max-lg:max-h-0 max-lg:overflow-hidden max-lg:border-0 max-lg:landscape:max-h-none" : tab === "scenes" || tab === "sources" || tab === "mixer" ? "max-lg:aspect-[16/12]" : "max-lg:aspect-[16/8]"} max-lg:h-auto max-lg:landscape:aspect-auto max-lg:landscape:h-full max-lg:landscape:w-[56%] max-lg:landscape:shrink-0 lg:h-[64%]`}>
          <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2">
            {programLabel}
            <div className="flex shrink-0 gap-1.5">
              {!muted && pmode.mode === "video" && <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume de l'aperçu" className="w-20 accent-white max-sm:hidden" />}
              <button type="button" disabled={!previewOn || pmode.mode !== "video"} title={pmode.mode === "video" ? undefined : "Le son n'est disponible qu'avec l'aperçu vidéo"} aria-pressed={!muted} onClick={() => setMuted((m) => !m)} className={`${flat} h-7 gap-1.5 px-3.5`}>
                <SpeakerIcon off={muted} /> {muted ? "Muet" : "Son"}
              </button>
              <button
                type="button"
                disabled={!ready}
                onClick={() => {
                  const next = !previewOn;
                  setPreviewOn(next);
                  void run("link.setPreview", { enabled: next });
                }}
                className={`${flat} h-7 px-3.5`}
              >
                {previewOn ? (<><span className="max-sm:hidden">Couper l&apos;aperçu</span><span className="sm:hidden">Aperçu</span></>) : (<><span className="max-sm:hidden">Activer l&apos;aperçu</span><span className="sm:hidden">Aperçu</span></>)}
              </button>
            </div>
          </div>
          <div className={`min-h-0 ${studioMode ? "grid grid-cols-2 gap-2 px-2 pb-2" : "px-2 pb-2"}`}>
            {studioMode && (
              <div className="relative h-full min-h-0">
                <span className="absolute left-2 top-1 z-10 text-[12px] text-neutral-400">Aperçu : {preview || "—"}</span>
                <ProgramPreview sinkRef={previewSink} program={preview} live={false} title="Aperçu" tag="APERÇU" />
              </div>
            )}
            <div className="h-full min-h-0">
              {previewOn && pmode.mode === "jpeg" ? (
                <div className="relative h-full">
                  <ProgramPreview sinkRef={frameSink} program={program} live={streaming} title="Programme" tag={streaming ? "" : "HORS DIRECT"} />
                  <p role="status" className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/70 px-2 py-0.5 text-center text-[12px] text-neutral-400">
                    Aperçu en images, sans son{pmode.reason ? ` : ${pmode.reason}` : ""}
                  </p>
                </div>
              ) : previewOn ? (
                <ProgramVideo watch={watch} program={program} muted={muted} volume={volume} />
              ) : (
                <div className="grid h-full place-items-center text-center text-neutral-500">
                  <div>
                    <p>Aperçu coupé</p>
                    <p className="mt-0.5 text-[12px]">Il ne consomme rien sur le PC tant qu&apos;il est coupé.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Mobile : panneaux en onglets (en paysage : à droite de l'aperçu) */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 lg:contents">
        <nav role="tablist" aria-label="Panneaux" className={`grid shrink-0 ${chatDefaults ? "grid-cols-6" : "grid-cols-5"} border-[#262626] bg-black max-lg:order-last max-lg:-mx-2 max-lg:-mb-2 max-lg:border-t max-lg:px-1 max-lg:pt-1 lg:hidden`}>
          {(
            [
              ["scenes", "Scènes"],
              ["sources", "Sources"],
              ["mixer", "Mixer"],
              ["controls", "Direct"],
              ["multi", "Multi"],
              ...(chatDefaults ? ([["chat", "Chat"]] as const) : []),
            ] as const
          ).map(([id, text]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] transition-colors active:scale-[0.97] ${tab === id ? "text-white" : "text-neutral-500"}`}>
              {tab === id && <span aria-hidden="true" className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-white" />}
              <TabIcon id={id} />
              <span className="max-w-full truncate">{text}</span>
            </button>
          ))}
        </nav>

        <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-2 max-lg:grid-cols-[minmax(0,1fr)] max-lg:grid-rows-1 lg:grid-cols-[minmax(9rem,1.1fr)_minmax(10rem,1.8fr)_minmax(12rem,2.2fr)_minmax(10rem,1fr)_minmax(13rem,1.5fr)]">
          {scenesPanel}
          {sourcesPanel}
          {mixerPanel}
          {controlsPanel}
          {multiPanel}
          {chatBox && tab === "chat" && <div className="min-h-0 min-w-0 lg:hidden">{chatBox}</div>}
        </div>
        </div>
      </main>
      {chatBox && chatOn && <aside aria-label="Chat" className="hidden min-h-0 w-[22rem] shrink-0 py-2 pr-2 lg:block xl:w-[26rem]">{chatBox}</aside>}
      </div>

      <dialog
        ref={dialog}
        onClose={() => setConfirm(null)}
        onClick={(e) => e.target === dialog.current && setConfirm(null)}
        aria-labelledby="confirm-title"
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-md border border-[#333] bg-[#0b0b0b] p-0 text-neutral-100 backdrop:bg-black/70"
      >
        <div className="p-5">
          <h2 id="confirm-title" className="text-[15px] font-semibold">
            {confirm === "stop" ? "Arrêter le direct ?" : "Partir en direct ?"}
          </h2>
          <p className="mt-2 text-[13px] text-neutral-400">
            {confirm === "stop" ? `Le direct de ${agent.name ?? "ce poste"} s'arrête tout de suite pour tes spectateurs (${clock(stats?.streamMs ?? 0)} de direct).` : `OBS sur ${agent.name ?? "ce poste"} commence à diffuser vers ta plateforme avec la scène « ${program} ».`}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => {
                const a = confirm;
                setConfirm(null);
                void run(a === "stop" ? "StopStream" : "StartStream");
              }}
              className={`${flat} h-9 px-4 ${confirm === "stop" ? "!border-red-700 !bg-red-700" : "!border-white/30 !bg-white/[0.14]"}`}
            >
              {confirm === "stop" ? "Arrêter le direct" : "Partir en direct"}
            </button>
            <button type="button" onClick={() => setConfirm(null)} className={`${flat} h-9 px-4`}>
              Annuler
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function Switch({ label, on, disabled, onClick }: { label: string; on: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-label={label} aria-checked={on} disabled={disabled} onClick={onClick} className={`relative h-5 w-9 shrink-0 rounded-full disabled:opacity-40 ${on ? "bg-emerald-500" : "bg-[#333]"}`}>
      <span className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition-transform motion-reduce:transition-none ${on ? "translate-x-4" : ""}`} />
    </button>
  );
}

function PopSelect({ label: text, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-1 text-[12px] text-neutral-400">
      {text}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${field} h-8 w-full`}>
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

const ico = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

function Svg({ children, size = "size-4" }: { children: ReactNode; size?: string }) {
  return (
    <svg {...ico} className={size}>
      {children}
    </svg>
  );
}

function TabIcon({ id }: { id: Tab }) {
  return (
    <Svg size="size-[22px]">
      {id === "scenes" ? (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M8 5l-2 5M14 5l-2 5M20 5l-2 5" />
        </>
      ) : id === "sources" ? (
        <>
          <path d="M12 3l9 5-9 5-9-5 9-5Z" />
          <path d="M3 13l9 5 9-5" />
        </>
      ) : id === "mixer" ? (
        <>
          <path d="M6 4v16M12 4v16M18 4v16" />
          <circle cx="6" cy="9" r="2" fill="currentColor" />
          <circle cx="12" cy="15" r="2" fill="currentColor" />
          <circle cx="18" cy="8" r="2" fill="currentColor" />
        </>
      ) : id === "multi" ? (
        <>
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      ) : id === "chat" ? (
        <path d="M4 5h16v11H9l-5 4V5Z" />
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M10 8.5v7l6-3.5-6-3.5Z" />
        </>
      )}
    </Svg>
  );
}

function Eye({ on }: { on: boolean }) {
  return (
    <Svg>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" className={on ? "" : "opacity-40"} />
      <circle cx="12" cy="12" r="3" className={on ? "" : "opacity-40"} />
      {!on && <path d="M4 4l16 16" />}
    </Svg>
  );
}

function MicIcon({ off }: { off: boolean }) {
  return (
    <Svg>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      {off && <path d="M4 4l16 16" />}
    </Svg>
  );
}

function HeadphonesIcon({ off }: { off: boolean }) {
  return (
    <Svg>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
      {off && <path d="M4 4l16 16" />}
    </Svg>
  );
}

function SpeakerIcon({ off }: { off: boolean }) {
  return (
    <Svg>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      {off ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7" />}
    </Svg>
  );
}

function KindIcon({ kind }: { kind: string }) {
  const p =
    kind === "browser_source" ? (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
      </>
    ) : kind.startsWith("text") ? (
      <path d="M5 6h14M12 6v13" />
    ) : kind === "scene" ? (
      <>
        <rect x="3" y="5" width="18" height="14" rx="1.5" />
        <path d="M3 10h18" />
      </>
    ) : kind.includes("audio") ? (
      <path d="M4 10v4h3l5 4V6L7 10H4Z" />
    ) : (
      <>
        <rect x="3" y="5" width="18" height="14" rx="1.5" />
        <path d="M3 10h18M9 5v14" />
      </>
    );
  return (
    <span className="shrink-0 text-neutral-400">
      <Svg>{p}</Svg>
    </span>
  );
}
