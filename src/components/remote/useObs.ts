"use client";

import { readSelection } from "./destinationSelection";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { coreFetch } from "../dashboard/coreClient";
import type { MsState } from "./MultistreamPanel";
import type { FrameSink } from "./ProgramPreview";
import type { Watch } from "./ProgramVideo";
import type { Item, Mix, Named, Rights, Roles, Stats } from "./types";
import { buzz, useToasts } from "./ui";
import { useRemote, type LinkEvent } from "./useRemote";

// État et actions du Contrôle à distance. Chaque action agit sur le VRAI OBS du poste (par le plugin SYXTEE) ; ce que l'on change dans OBS
// revient ici par événements en moins d'une seconde. Les changements locaux sont immédiats (optimistes) et reviennent en arrière si OBS refuse.

export const MON_OFF = "OBS_MONITORING_TYPE_NONE";
export const MON_ON = "OBS_MONITORING_TYPE_MONITOR_ONLY";

type Row = { sceneItemId: number; sourceName: string; sceneItemEnabled: boolean; inputKind?: string; sourceType?: string };

export type UseObsArgs = { coreUrl: string; deviceId: string; demoToken?: string; invite?: string; rights: Rights };

export function useObs({ coreUrl, deviceId, demoToken, invite }: UseObsArgs) {
  const [scenes, setScenes] = useState<string[]>([]);
  const [program, setProgram] = useState("");
  const [preview, setPreview] = useState("");
  const [studioMode, setStudioMode] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [sceneAudio, setSceneAudio] = useState<Set<string>>(new Set());
  const [mixer, setMixer] = useState<Mix[]>([]);
  const [levels, setLevels] = useState<Record<string, number>>({});
  /** Niveaux par canal [gauche, droite], en dB (plugin récent) ; absent : on retombe sur `levels` pour les deux. */
  const [levelsLR, setLevelsLR] = useState<Record<string, [number, number]>>({});
  const [meterHold, setMeterHold] = useState(false);
  const [transitions, setTransitions] = useState<string[]>([]);
  const [transition, setTransition] = useState("");
  const [profiles, setProfiles] = useState<Named>({ current: "", list: [] });
  const [collections, setCollections] = useState<Named>({ current: "", list: [] });
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  /** Ordre de départ ou d'arrêt envoyé, en attente de la confirmation d'OBS : le bouton ne se double pas. */
  const [streamBusy, setStreamBusy] = useState(false);
  const [recBusy, setRecBusy] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [roles, setRolesState] = useState<Roles | null>(null);
  const [inputNames, setInputNames] = useState<string[]>([]);
  const [fluxName, setFluxName] = useState("");
  const [fixing, setFixing] = useState(false);
  const [previewOn, setPreviewOn] = useState(true);
  const [pmode, setPmode] = useState<{ mode: "video" | "jpeg" | "idle"; reason: string }>({ mode: "idle", reason: "" });
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [obsDown, setObsDown] = useState(false);
  const [ms, setMs] = useState<MsState | null>(null);
  const [sync, setSync] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<{ scene: string; id: number } | null>(null);
  const toasts = useToasts();
  const { push } = toasts;

  const frameSink: FrameSink = useRef(null);
  const previewSink: FrameSink = useRef(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const levelsRef = useRef<Record<string, number>>({});
  const levelsLRRef = useRef<Record<string, [number, number]>>({});
  /** Depuis quand une entrée est figée à 0 dB : un ancien plugin envoie 0 dB pour une source qui n'a encore rien émis (jauge pleine à tort). */
  const pinnedSince = useRef<Record<string, number>>({});
  const hold = useRef(false);
  const levelFrame = useRef(0);
  const volumeSend = useRef<Record<string, { at: number; timer?: ReturnType<typeof setTimeout> }>>({});
  /** Faders en cours de glissement : les échos d'OBS ne les déplacent pas sous le doigt. */
  const dragging = useRef(new Set<string>());
  const pendingScene = useRef<{ scene: string; until: number } | null>(null);
  const refreshSeq = useRef(0);
  const rolesRef = useRef<Roles | null>(null);
  const rolesSeq = useRef(0);
  const busyTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    hold.current = meterHold;
  }, [meterHold]);

  const setRoles = useCallback((r: Roles | null | ((x: Roles | null) => Roles | null)) => {
    const next = typeof r === "function" ? r(rolesRef.current) : r;
    rolesRef.current = next;
    setRolesState(next);
  }, []);

  const later = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => setSync((n) => n + 1), 250);
  }, []);

  /** Garde un indicateur « en attente » au plus `ms` millisecondes, même si OBS ne confirme jamais. */
  const hold_ = useCallback((key: "stream" | "rec", set: (b: boolean) => void, ms = 10_000) => {
    set(true);
    clearTimeout(busyTimers.current[key]);
    busyTimers.current[key] = setTimeout(() => set(false), ms);
  }, []);
  const release = useCallback((key: "stream" | "rec", set: (b: boolean) => void) => {
    clearTimeout(busyTimers.current[key]);
    set(false);
  }, []);

  const onEvent = useCallback<LinkEvent>(
    (name, d) => {
      if (name === "CurrentProgramSceneChanged") {
        // Scène tapée en attente : OBS n'annonce la fin d'une transition qu'à son terme, et une transition précédente ne doit pas faire clignoter la sélection.
        const want = pendingScene.current;
        if (want && Date.now() < want.until && d.sceneName !== want.scene) return;
        pendingScene.current = null;
        setProgram(String(d.sceneName));
      } else if (name === "CurrentPreviewSceneChanged") setPreview(String(d.sceneName));
      else if (name === "link.multistream") setMs(d as unknown as MsState);
      else if (name === "StudioModeStateChanged") setStudioMode(!!d.studioModeEnabled);
      else if (name === "StreamStateChanged") {
        setStreaming(!!d.outputActive);
        // Les états intermédiaires (démarrage, arrêt en cours) gardent le bouton occupé ; l'état final le libère.
        const st = String(d.outputState ?? "");
        if (!st.endsWith("STARTING") && !st.endsWith("STOPPING") && !st.endsWith("RECONNECTING")) release("stream", setStreamBusy);
      } else if (name === "RecordStateChanged") {
        setRecording(!!d.outputActive);
        setPaused(String(d.outputState).includes("PAUSED"));
        const st = String(d.outputState ?? "");
        if (!st.endsWith("STARTING") && !st.endsWith("STOPPING")) release("rec", setRecBusy);
      } else if (name === "InputMuteStateChanged") setMixer((m) => m.map((i) => (i.name === d.inputName ? { ...i, muted: !!d.inputMuted } : i)));
      else if (name === "InputVolumeChanged") {
        if (dragging.current.has(String(d.inputName))) return;
        setMixer((m) => m.map((i) => (i.name === d.inputName ? { ...i, db: Number(d.inputVolumeDb) } : i)));
      } else if (name === "SceneItemEnableStateChanged") setItems((l) => l.map((i) => (i.id === d.sceneItemId ? { ...i, on: !!d.sceneItemEnabled } : i)));
      else if (name === "link.levels") {
        // Regroupé sur l'image d'écran : au plus un rendu par image, au lieu d'un par message (qui saccadait toute l'interface).
        levelsRef.current = d as Record<string, number>;
        if (!hold.current && !levelFrame.current) {
          levelFrame.current = requestAnimationFrame(() => {
            levelFrame.current = 0;
            if (!hold.current) {
              // Un vrai son bouge ; 0 dB immobile plus de 1,5 s = source muette, comptée comme silence.
              const now = Date.now();
              const lv = { ...levelsRef.current };
              const lr = { ...levelsLRRef.current };
              for (const k of Object.keys(lv)) {
                if (lv[k] < -0.5) {
                  delete pinnedSince.current[k];
                  continue;
                }
                const since = (pinnedSince.current[k] ??= now);
                if (now - since > 1500) {
                  lv[k] = -100;
                  lr[k] = [-100, -100];
                }
              }
              setLevels(lv);
              setLevelsLR(lr);
            }
          });
        }
      } else if (name === "link.levelsLR") levelsLRRef.current = d as Record<string, [number, number]>;
      else if (name === "link.preview") frameSink.current?.(String(d.image));
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
      else if (["SceneListChanged", "CurrentSceneCollectionChanged", "CurrentProfileChanged", "InputCreated", "InputRemoved", "SceneCreated", "SceneRemoved", "SourceRenamed", "InputNameChanged", "SceneNameChanged", "SceneItemCreated", "SceneItemRemoved", "SceneItemListIndexingChanged"].includes(name)) later();
    },
    [later, release, setRoles],
  );

  const { link, agent, guardian, call, latency, guest, reconnect } = useRemote(coreUrl, onEvent, deviceId, demoToken, invite);
  const canLive = !guest || guest.level === "full";
  /** Scènes et son : tout sauf le niveau « lecture seule ». */
  const canScenes = !guest || guest.level !== "view";
  /** Propriétaire du compte (ni invité ni lien d'invitation) : seul à voir les paramètres d'OBS et la régie. */
  const owner = !guest && !invite;
  const ready = link === "on" && agent.online && !obsDown;
  const lost = link !== "on" || !agent.online;

  useEffect(
    () => () => {
      clearTimeout(refreshTimer.current);
      cancelAnimationFrame(levelFrame.current);
      Object.values(busyTimers.current).forEach(clearTimeout);
      Object.values(volumeSend.current).forEach((v) => clearTimeout(v.timer));
    },
    [],
  );

  /** Lance un ordre ; l'erreur d'OBS devient un message qui disparaît seul. Renvoie `null` en cas d'échec. */
  const run = useCallback(
    async <T = Record<string, unknown>>(method: string, params?: Record<string, unknown>) => {
      try {
        return await call<T>(method, params);
      } catch (e) {
        push((e as Error).message);
        return null;
      }
    },
    [call, push],
  );

  /** Lecture d'état : un nouvel essai si OBS n'a pas répondu, et l'échec est signalé (jamais une liste vide muette). */
  const read = useCallback(
    async <T>(method: string, params?: Record<string, unknown>, seq?: number): Promise<T | null> => {
      for (let n = 0; n < 2; n++) {
        try {
          return await call<T>(method, params);
        } catch (e) {
          if (seq !== undefined && seq !== refreshSeq.current) return null;
          if (n === 1) setLoadErrors((l) => [...l, `${method} : ${(e as Error).message}`]);
          else await new Promise((r) => setTimeout(r, 400));
        }
      }
      return null;
    },
    [call],
  );

  // Chargement complet de l'état d'OBS. Un chargement plus récent annule les écritures du précédent (changement de collection, relance d'OBS).
  const refresh = useCallback(async () => {
    const seq = ++refreshSeq.current;
    const stale = () => seq !== refreshSeq.current;
    setLoadErrors([]);
    const sl = await read<{ scenes: { sceneName: string }[]; currentProgramSceneName: string }>("GetSceneList", undefined, seq);
    if (!sl || stale()) return;
    setObsDown(false);
    setScenes([...sl.scenes].reverse().map((s) => s.sceneName));
    setProgram(sl.currentProgramSceneName);
    // Par petits groupes : OBS répond à une demande à la fois, des dizaines en même temps finissent en délai dépassé.
    const [sm, st, rc] = await Promise.all([read<{ studioModeEnabled: boolean }>("GetStudioModeEnabled", undefined, seq), read<{ outputActive: boolean }>("GetStreamStatus", undefined, seq), read<{ outputActive: boolean; outputPaused: boolean }>("GetRecordStatus", undefined, seq)]);
    const [il, pl, cl] = await Promise.all([
      read<{ inputs: { inputName: string; inputKind?: string; hasAudio?: boolean; audioActive?: boolean; mixerHidden?: boolean; inputMuted?: boolean; inputVolumeMul?: number; monitorType?: string; global?: boolean }[] }>("GetInputList", undefined, seq),
      read<{ profiles: string[]; currentProfileName: string }>("GetProfileList", undefined, seq),
      read<{ sceneCollections: string[]; currentSceneCollectionName: string }>("GetSceneCollectionList", undefined, seq),
    ]);
    const [tl, bk, pv] = await Promise.all([
      read<{ transitions: { transitionName: string }[]; currentSceneTransitionName: string }>("GetSceneTransitionList", undefined, seq),
      read<Roles>("link.getBackup", undefined, seq),
      read<{ enabled: boolean; mode?: "video" | "jpeg" | "idle"; reason?: string }>("link.getPreview", undefined, seq),
    ]);
    if (stale()) return;
    if (sm) {
      setStudioMode(!!sm.studioModeEnabled);
      if (sm.studioModeEnabled) {
        const p = await read<{ currentPreviewSceneName: string }>("GetCurrentPreviewScene", undefined, seq);
        if (stale()) return;
        setPreview(p?.currentPreviewSceneName ?? "");
      }
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
    if (bk) {
      setRoles(bk);
      // Drone, autres caméras, garde audio et régie IA n'existent plus dans la régie : un ancien réglage encore actif ne doit pas changer
      // la scène d'OBS en cachette (prise « belle image » qui bascule, régie IA qui cherche une scène disparue). On les coupe une fois.
      if (!guest && (bk.autoEnabled || bk.directorEnabled || bk.audioEnabled || bk.audioBackup)) {
        const off = { ...bk, autoEnabled: false, directorEnabled: false, audioEnabled: false, audioBackup: false };
        void call<Roles>("link.setBackup", off).then((r) => setRoles(r ?? off)).catch(() => {});
      }
    }
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
          // Comme le mélangeur d'OBS : pas de piste pour une source sans son réel ni pour une source masquée du mélangeur.
          .filter((i) => i.hasAudio !== false && i.audioActive !== false && i.mixerHidden !== true)
          .map((i) => ({ name: i.inputName, muted: !!i.inputMuted, db: i.inputVolumeMul && i.inputVolumeMul > 0 ? 20 * Math.log10(i.inputVolumeMul) : -100, mon: i.monitorType ?? MON_OFF, global: !!i.global })),
      );
    }
    setLoaded(true);
  }, [read, setRoles, call, guest]);

  useEffect(() => {
    if (link !== "on" || !agent.online) return;
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [link, agent.online, refresh, sync]);

  // Liaison perdue : les anciennes données restent affichées mais grisées (ready = faux) ; on les recharge au retour.
  useEffect(() => {
    if (link === "on" && agent.online) return;
    clearTimeout(busyTimers.current.stream);
    clearTimeout(busyTimers.current.rec);
    const t = setTimeout(() => (setStreamBusy(false), setRecBusy(false)), 0);
    return () => clearTimeout(t);
  }, [link, agent.online]);

  // Sorties multistream du PC (adresses et clés restent dans le plugin).
  useEffect(() => {
    if (!ready) return;
    let live = true;
    void call<MsState>("link.multistreamList")
      .then((r) => live && r && setMs(r))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [ready, call, sync]);

  /** Comme dans OBS : en Mode Studio on édite la scène d'aperçu, sinon celle du programme. */
  const editing = studioMode && preview ? preview : program;

  // Sources de la scène éditée, puis les noms de toutes les sources visibles qui la composent (scènes imbriquées comprises) :
  // le mixer d'OBS ne montre que les entrées de la scène en cours, plus les périphériques audio globaux.
  useEffect(() => {
    if (!ready || !editing) return;
    let live = true;
    const t = setTimeout(() => {
      void (async () => {
        const top = await read<{ sceneItems: Row[] }>("GetSceneItemList", { sceneName: editing });
        if (!live || !top) return;
        setItems([...(top.sceneItems ?? [])].reverse().map((i) => ({ id: i.sceneItemId, name: i.sourceName, kind: i.sourceType === "OBS_SOURCE_TYPE_SCENE" ? "scene" : (i.inputKind ?? ""), on: i.sceneItemEnabled })));
        const names = new Set<string>();
        const seen = new Set<string>([editing]);
        const walk = async (rows: Row[], depth: number) => {
          for (const r of rows) {
            if (!r.sceneItemEnabled) continue;
            names.add(r.sourceName);
            // Une scène déjà visitée n'est pas relue (boucles et doublons).
            if (r.sourceType === "OBS_SOURCE_TYPE_SCENE" && depth < 4 && !seen.has(r.sourceName)) {
              seen.add(r.sourceName);
              const sub = await call<{ sceneItems: Row[] }>("GetSceneItemList", { sceneName: r.sourceName }).catch(() => null);
              if (!live) return;
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

  // La sélection d'une source disparue (supprimée dans OBS) est oubliée.
  const selectedItem = selected?.scene === editing ? items.find((i) => i.id === selected.id) : undefined;
  useEffect(() => {
    if (selected && selected.scene === editing && items.length > 0 && !items.some((i) => i.id === selected.id)) {
      const t = setTimeout(() => setSelected(null), 0);
      return () => clearTimeout(t);
    }
  }, [items, selected, editing]);

  // « Flux reçu » : une source « Flux … » de la collection est en lecture. Onglet caché : pas d'interrogation.
  useEffect(() => {
    if (!ready) return;
    let live = true;
    const check = async () => {
      if (document.hidden) return;
      const flux = inputNames.filter((n) => n.startsWith("Flux"));
      if (flux.length === 0) return live && setFluxName("");
      const states = await Promise.all(flux.map((n) => call<{ mediaState: string }>("GetMediaInputStatus", { inputName: n }).then((r) => r.mediaState, () => "")));
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
    let gone = false;
    const get = async () => {
      try {
        if (lock && !lock.released) return;
        const l = (await navigator.wakeLock?.request("screen")) ?? null;
        if (gone) void l?.release().catch(() => {});
        else lock = l;
      } catch {
        // refusé (économie de batterie) : l'écran s'éteindra normalement
      }
    };
    const onVisible = () => document.visibilityState === "visible" && void get();
    void get();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────────────────────────────────────────────

  const pick = useCallback(
    (scene: string) => {
      buzz();
      if (studioMode) {
        setPreview(scene);
        void run("SetCurrentPreviewScene", { sceneName: scene }).then((r) => r === null && later());
      } else {
        // La sélection suit le toucher tout de suite (sans attendre la fin de la transition) ; elle revient en arrière si OBS refuse.
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
    },
    [studioMode, program, run, later],
  );

  const toggleStudio = useCallback(() => {
    const next = !studioMode;
    setStudioMode(next);
    void run("SetStudioModeEnabled", { studioModeEnabled: next }).then((r) => r === null && setStudioMode(!next));
  }, [studioMode, run]);

  const startStream = useCallback(() => {
    buzz(30);
    hold_("stream", setStreamBusy);
    // Sorties cochées dans Destinations : la première lance le direct d'OBS, les autres s'y rattachent. Aucune cochée : direct d'OBS seul.
    const picked = new Set(readSelection(deviceId));
    const ids = (ms?.outputs ?? []).filter((x) => picked.has(x.id) && x.hasKey && !x.active && !x.starting).map((x) => x.id);
    if (!ids.length) {
      void run("StartStream").then((r) => r === null && release("stream", setStreamBusy));
      return;
    }
    void (async () => {
      for (const id of ids) {
        const r = await run<MsState>("link.multistreamStart", { id });
        if (r) setMs(r);
        else if (id === ids[0]) return release("stream", setStreamBusy);
      }
    })();
  }, [run, hold_, release, ms, deviceId]);
  const stopStream = useCallback(() => {
    buzz(30);
    hold_("stream", setStreamBusy);
    void run("StopStream").then((r) => r === null && release("stream", setStreamBusy));
  }, [run, hold_, release]);
  const toggleRecord = useCallback(() => {
    buzz();
    hold_("rec", setRecBusy);
    void run(recording ? "StopRecord" : "StartRecord").then((r) => r === null && release("rec", setRecBusy));
  }, [recording, run, hold_, release]);
  const togglePause = useCallback(() => void run(paused ? "ResumeRecord" : "PauseRecord"), [paused, run]);

  const toggleMute = useCallback(
    (name: string) => {
      buzz();
      const cur = mixer.find((m) => m.name === name);
      if (!cur) return;
      const next = !cur.muted;
      setMixer((m) => m.map((i) => (i.name === name ? { ...i, muted: next } : i)));
      void run("SetInputMute", { inputName: name, inputMuted: next }).then((r) => r === null && setMixer((m) => m.map((i) => (i.name === name ? { ...i, muted: !next } : i))));
    },
    [mixer, run],
  );
  const toggleMonitor = useCallback(
    (name: string) => {
      const cur = mixer.find((m) => m.name === name);
      if (!cur) return;
      const mon = cur.mon === MON_OFF ? MON_ON : MON_OFF;
      setMixer((m) => m.map((i) => (i.name === name ? { ...i, mon } : i)));
      void run("SetInputAudioMonitorType", { inputName: name, monitorType: mon }).then((r) => r === null && setMixer((m) => m.map((i) => (i.name === name ? { ...i, mon: cur.mon } : i))));
    },
    [mixer, run],
  );

  /** Volume d'un fader : au plus un ordre toutes les 200 ms pendant le glissement, le dernier est toujours envoyé (sinon « Trop de commandes d'un coup »). */
  const setVolume = useCallback(
    (name: string, db: number) => {
      setMixer((m) => m.map((x) => (x.name === name ? { ...x, db } : x)));
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
  const dragVolume = useCallback((name: string, on: boolean) => {
    if (on) dragging.current.add(name);
    else setTimeout(() => dragging.current.delete(name), 600);
  }, []);

  const toggleItem = useCallback(
    (item: Item) => {
      const next = !item.on;
      setItems((l) => l.map((x) => (x.id === item.id ? { ...x, on: next } : x)));
      void run("SetSceneItemEnabled", { sceneName: editing, sceneItemId: item.id, sceneItemEnabled: next }).then((r) => r === null && setItems((l) => l.map((x) => (x.id === item.id ? { ...x, on: !next } : x))));
    },
    [editing, run],
  );

  const setProfile = useCallback((v: string) => void run("SetCurrentProfile", { profileName: v }).then((r) => r && later()), [run, later]);
  const setCollection = useCallback((v: string) => void run("SetCurrentSceneCollection", { sceneCollectionName: v }).then((r) => r && later()), [run, later]);
  const changeTransition = useCallback(
    (t: string) => {
      setTransition(t);
      void run("SetCurrentSceneTransition", { transitionName: t });
    },
    [run],
  );
  const runTransition = useCallback(() => void run("TriggerStudioModeTransition"), [run]);

  const setPreviewEnabled = useCallback(
    (next: boolean) => {
      setPreviewOn(next);
      void run("link.setPreview", { enabled: next }).then((r) => r === null && setPreviewOn(!next));
    },
    [run],
  );

  /** Régie : on part toujours de la dernière valeur connue (même entre deux rendus), et une réponse ancienne n'écrase pas un réglage plus récent. */
  const saveRoles = useCallback(
    (patch: Partial<Roles>) => {
      const cur = rolesRef.current;
      if (!cur) return;
      const next = { ...cur, ...patch };
      setRoles(next);
      const seq = ++rolesSeq.current;
      void run<Roles>("link.setBackup", next).then((r) => {
        if (seq !== rolesSeq.current) return;
        if (r) setRoles(r);
        else later();
      });
    },
    [run, setRoles, later],
  );

  async function fixFlux() {
    setFixing(true);
    const r = await run<{ ok: boolean; message: string }>("link.fixFlux");
    setFixing(false);
    if (r) push(r.message, r.ok ? "info" : "error");
    later();
  }

  const camSceneName = (c: { source: string; label: string }) => `Cam ${c.label.trim() || c.source}`.slice(0, 60);
  /** Crée dans OBS une scène qui ne contient que la source de la caméra, puis la rattache à la caméra. */
  async function createCamScene(i: number) {
    const c = rolesRef.current?.directorCams?.[i];
    if (!c?.source) return;
    let name = camSceneName(c);
    if (scenes.includes(name)) name = `${name} ${i + 1}`;
    const made = await run("CreateScene", { sceneName: name });
    if (made === null) return;
    await run("CreateSceneItem", { sceneName: name, sourceName: c.source, sceneItemEnabled: true });
    saveRoles({ directorCams: (rolesRef.current?.directorCams ?? []).map((x, j) => (j === i ? { ...x, scene: name } : x)) });
    later();
  }

  /** Active la régie automatique en un clic : choisit les scènes et sources évidentes (nom « direct », « perdue », source « Flux »). */
  function enableAuto() {
    const roles = rolesRef.current;
    if (!roles) return;
    const find = (re: RegExp) => scenes.find((n) => re.test(n)) ?? "";
    const liveScene = roles.liveScene || find(/direct|live/i) || program;
    const scene = roles.scene || find(/perdue|secours|brb|pause|coupure/i);
    const source = roles.source || fluxName || inputNames.find((n) => n.startsWith("Flux")) || "";
    // La source surveillée se choisit seule (caméra à l'antenne) : seules les deux scènes sont nécessaires.
    const backupOk = !!(scene && liveScene);
    saveRoles({ liveScene, scene, source, enabled: backupOk, autoEnabled: false, directorEnabled: false, audioEnabled: false, audioBackup: false });
  }

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

  // Mixer de la scène éditée : ses sources visibles qui ont du son, plus les périphériques globaux (comme dans OBS).
  const visibleMixer = useMemo(() => mixer.filter((i) => i.global || sceneAudio.has(i.name)), [mixer, sceneAudio]);
  const noFluxSource = ready && scenes.length > 0 && !inputNames.some((n) => n.startsWith("Flux"));
  const oldAgent = agent.online && !!agent.version && agent.version.localeCompare("0.7.0", undefined, { numeric: true }) < 0;

  return {
    // liaison
    link, agent, guardian, latency, guest, reconnect, call, run, ready, lost, canLive, canScenes, owner, obsDown, loaded, loadErrors, retry: () => setSync((n) => n + 1), oldAgent,
    // OBS
    scenes, program, preview, studioMode, items, mixer, visibleMixer, levels, levelsLR, meterHold, setMeterHold, transitions, transition, profiles, collections,
    streaming, recording, paused, streamBusy, recBusy, stats, roles, inputNames, fluxName, fixing, previewOn, pmode, ms, setMs, editing, selected, setSelected, selectedItem, noFluxSource,
    // sinks
    frameSink, previewSink,
    // actions
    pick, toggleStudio, startStream, stopStream, toggleRecord, togglePause, toggleMute, toggleMonitor, setVolume, dragVolume, toggleItem, setProfile, setCollection, changeTransition, runTransition,
    setPreviewEnabled, saveRoles, fixFlux, createCamScene, camSceneName, enableAuto, watch,
    toasts,
  };
}

export type Obs = ReturnType<typeof useObs>;
