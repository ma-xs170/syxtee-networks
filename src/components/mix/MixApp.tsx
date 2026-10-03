"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveStatus } from "../dashboard/LiveStatus";
import AudioMixer from "./AudioMixer";
import ControlPanel, { type LiveState } from "./ControlPanel";
import Multiview, { type TransitionKind } from "./Multiview";
import ObsLinkCard from "./ObsLinkCard";
import RelayRows from "./RelayRows";
import TopBar from "./TopBar";
import { INITIAL_RELAYS, isOn, stepStats, type MixRelay, type Protocol } from "@/lib/mix-sim";

// SYXTEE MIX : régie multi-relais. MAQUETTE : l'interface est complète, la liste des relais est réelle (si tu en as),
// le reste (composition PROGRAM, mixage, enregistrement, direct, lien RTMP unique) est simulé en attendant le backend
// (MediaMTX + FFmpeg sur le VPS, API /api/mix). Toute la logique d'état est ici ; les composants voisins ne font qu'afficher.

export type RealRelay = { id: string; name: string; protocol: Protocol; live: boolean };

const HOST = "mix.syxtee.net";
const newToken = () => Array.from({ length: 24 }, () => "abcdefghijkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 32)]).join("");

export default function MixApp({ account, real, coreUrl }: { account: string; real: RealRelay[]; coreUrl: string }) {
  const { state: liveState } = useLiveStatus();
  const [useReal, setUseReal] = useState(real.length > 0);
  const [demoRelays, setDemoRelays] = useState<MixRelay[]>(INITIAL_RELAYS);

  // Relais réels : nom, protocole et état viennent de ton compte ; les chiffres de bitrate du relais en direct viennent du Core.
  const realRelays = useMemo<MixRelay[]>(
    () =>
      real.slice(0, 8).map((r, i) => {
        const live = liveState?.relays?.find((x) => x.id === r.id)?.live ?? r.live;
        return {
          id: r.id,
          n: i + 1,
          name: r.name,
          device: r.protocol.toUpperCase(),
          protocol: r.protocol,
          status: live ? "live" : "offline",
          scene: "street",
          kbps: live && liveState?.relay_id === r.id ? (liveState?.kbps ?? 0) : 0,
          fps: 0,
          res: "–",
          latencyMs: 0,
          lossPct: 0,
          links: 0,
          uptime: 0,
          volume: 0,
          mute: !live,
          solo: false,
          afv: false,
          real: true,
        };
      }),
    [real, liveState],
  );
  const relays = useReal ? realRelays : demoRelays;
  const demo = !useReal;

  const [program, setProgram] = useState("r1");
  const [preview, setPreview] = useState("r2");
  const [selected, setSelected] = useState("r1");
  const [protection, setProtection] = useState(false);
  const [askUnlock, setAskUnlock] = useState(false);
  const [transition, setTransition] = useState<TransitionKind>("mix");
  const [duration, setDuration] = useState(500);
  const [fade, setFade] = useState<{ from: string; to: string; ms: number } | null>(null);
  const [slate, setSlate] = useState(false);
  const [live, setLive] = useState<LiveState>("idle");
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [rec, setRec] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [clock, setClock] = useState(0);
  const [master, setMaster] = useState(0);
  const [token, setToken] = useState("k7m2xq9dr4vh8tnw3bcf5pzs");
  const [ping, setPing] = useState(21);
  const [toast, setToast] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const view = useRef<HTMLDivElement>(null);
  const locked = protection;

  // Sources par défaut quand on change de jeu de relais.
  const ids = relays.map((r) => r.id).join(",");
  useEffect(() => {
    const list = ids ? ids.split(",") : [];
    const ok = (id: string) => list.includes(id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!ok(program)) setProgram(list[0] ?? "");
    if (!ok(preview)) setPreview(list[1] ?? list[0] ?? "");
    if (!ok(selected)) setSelected(list[0] ?? "");
  }, [ids, program, preview, selected]);

  // Une seconde de simulation : chiffres des relais, ping, chronomètres.
  useEffect(() => {
    const t = setInterval(() => {
      setDemoRelays((r) => stepStats(r));
      setPing(18 + Math.round(Math.random() * 8));
      setClock((c) => c + 1);
      setLiveSeconds((s) => s + 1);
      setRecSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const say = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast((cur) => (cur === m ? null : cur)), 2600);
  }, []);

  const patchRelay = useCallback((id: string, patch: Partial<MixRelay>) => setDemoRelays((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r))), []);

  // Une modification de caméra n'a lieu que si la PROTECTION est coupée.
  const doPreview = (id: string) => !locked && setPreview(id);
  const doCut = useCallback(() => {
    if (locked || preview === program) return;
    setProgram(preview);
    setPreview(program);
  }, [locked, preview, program]);
  const doAuto = useCallback(() => {
    if (locked || preview === program) return;
    if (transition === "cut") return doCut();
    setFade({ from: program, to: preview, ms: duration });
    setTimeout(() => {
      setProgram(preview);
      setPreview(program);
      setFade(null);
    }, duration);
  }, [locked, preview, program, transition, duration, doCut]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void view.current?.requestFullscreen?.();
  }, []);
  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  // Clavier : 1 à 8 = PREVIEW, Entrée = CUT, Espace = AUTO, F = plein écran.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, dialog, [role=alertdialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[1-8]$/.test(e.key)) {
        const r = relays.find((x) => x.n === Number(e.key));
        if (r && !locked) setPreview(r.id);
      } else if (e.key === "Enter" && t.tagName !== "BUTTON") doCut();
      else if (e.key === " " && t.tagName !== "BUTTON") {
        e.preventDefault();
        doAuto();
      } else if (e.key.toLowerCase() === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [relays, locked, doCut, doAuto, toggleFullscreen]);

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

  const sel = relays.find((r) => r.id === selected);
  const online = relays.filter(isOn).length;
  const mockOnly = (what: string) => say(`${what} : disponible quand le serveur MIX sera branché (maquette).`);

  return (
    <div className="space-y-2">
      <TopBar protection={protection} onProtection={() => (protection ? setAskUnlock(true) : setProtection(true))} online={online} total={relays.length} ping={ping} account={account} demo={demo} />

      {protection && (
        <p role="status" className="rounded-md border border-live bg-live/15 px-3 py-1 text-center font-mono text-[11px] font-semibold tracking-[0.2em]">
          PROTECTION ACTIVE · changements de caméras verrouillés
        </p>
      )}

      {/* La largeur du multiview suit la HAUTEUR de l'écran (16:9 + le reste de la page) : tout tient sans défiler. */}
      <div className="grid gap-2 lg:grid-cols-[minmax(0,min(calc((100dvh_-_20.5rem)*16/9),calc(100%_-_16.75rem)))_16.25rem] lg:justify-center">
        <Multiview
          ref={view}
          relays={relays}
          program={program}
          preview={preview}
          slate={slate}
          fade={fade}
          locked={locked}
          transition={transition}
          onTransition={setTransition}
          duration={duration}
          onDuration={setDuration}
          onPreview={doPreview}
          onProgram={(id) => !locked && (setPreview(program), setProgram(id))}
          onCut={doCut}
          onAuto={doAuto}
          clock={clock}
          fullscreen={fullscreen}
          onFullscreen={toggleFullscreen}
          coreUrl={useReal ? coreUrl : ""}
        />
        <div className="space-y-2">
          <ControlPanel
            locked={locked}
            live={live}
            liveSeconds={liveSeconds}
            onLive={toggleLive}
            rec={rec}
            recSeconds={recSeconds}
            onRec={toggleRec}
            slate={slate}
            onSlate={() => setSlate((v) => !v)}
            onShot={() => say("Capture du PROGRAMME enregistrée (simulation).")}
            onMarker={() => say("Marqueur posé à cet instant (simulation).")}
            selected={sel}
            onRename={(name) => (demo ? patchRelay(selected, { name }) : mockOnly("Renommer un relais ici"))}
            onDisconnect={() => (demo ? patchRelay(selected, { status: "offline", kbps: 0, fps: 0, links: 0, mute: true }) : mockOnly("Déconnecter"))}
            onRegenerate={() => mockOnly("Régénérer la clé d'un relais ici")}
          />
          <RelayRows
            relays={relays}
            program={program}
            preview={preview}
            selected={selected}
            locked={locked}
            onSelect={(id) => {
              setSelected(id);
              doPreview(id);
            }}
            realCount={real.length}
            useReal={useReal}
            onUseReal={setUseReal}
          />
        </div>
      </div>

      <AudioMixer relays={relays} program={program} locked={locked || !demo} master={master} onMaster={setMaster} onPatch={(id, p) => patchRelay(id, p)} />
      <ObsLinkCard token={token} host={HOST} locked={locked} onRegenerate={() => setToken(newToken())} cams={relays.map((r) => r.n).sort((a, b) => a - b)} />

      {askUnlock && (
        <dialog
          ref={(d) => {
            if (d && !d.open) d.showModal();
          }}
          onClose={() => setAskUnlock(false)}
          aria-labelledby="unlock-title"
          className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-background p-6 text-foreground backdrop:bg-background/80"
        >
          <h2 id="unlock-title" className="text-lg font-semibold">
            Désactiver la protection ?
          </h2>
          <p className="mt-2 text-sm text-muted">Les caméras, l&apos;audio, le direct et l&apos;enregistrement redeviennent modifiables.</p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => {
                setProtection(false);
                setAskUnlock(false);
              }}
              className="h-10 rounded-lg bg-accent px-5 text-sm font-medium text-on-accent hover:bg-accent-hover"
            >
              Désactiver
            </button>
            <button type="button" onClick={() => setAskUnlock(false)} className="h-10 rounded-lg border border-line px-5 text-sm hover:bg-foreground/10">
              Garder active
            </button>
          </div>
        </dialog>
      )}

      {toast && (
        <p role="status" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line-strong bg-background px-5 py-2.5 text-sm shadow-lg lg:bottom-6">
          {toast}
        </p>
      )}
    </div>
  );
}
