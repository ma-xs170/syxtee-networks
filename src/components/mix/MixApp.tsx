"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useLiveStatus } from "../dashboard/LiveStatus";
import AudioMixer from "./AudioMixer";
import DirectPanel, { type LiveState } from "./DirectPanel";
import Drawer from "./Drawer";
import MobileMix from "./MobileMix";
import ObsLinkPanel from "./ObsLinkPanel";
import RelaySettings from "./RelaySettings";
import { RelayCell } from "./RelayViews";
import { Screen, TransitionBar, type TransitionKind } from "./Stage";
import { RelayStreamsProvider } from "./streams";
import TopBar from "./TopBar";
import type { MixModel } from "./model";
import { saveAudioSettings } from "@/app/(studio)/commutateur/actions";
import { DEFAULT_AUDIO, type AudioMode, type AudioSettings } from "@/lib/mix-audio";
import { INITIAL_RELAYS, isOn, stepStats, type MixRelay, type Protocol } from "@/lib/mix-sim";

// SYXTEE COMMUTATEUR : régie multi-relais. MAQUETTE : l'interface est complète, la liste des relais est réelle (si tu en as),
// le reste (composition PROGRAM, mixage, enregistrement, direct, lien RTMP unique) est simulé en attendant le backend
// (MediaMTX + FFmpeg sur le VPS, API /api/mix). Toute la logique d'état est ici ; les composants voisins ne font qu'afficher.

export type RealRelay = { id: string; name: string; protocol: Protocol; live: boolean };

const HOST = "mix.syxtee.net";
const newToken = () => Array.from({ length: 24 }, () => "abcdefghijkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 32)]).join("");

export default function MixApp({ account, real, coreUrl, initialAudio = DEFAULT_AUDIO, persist = true }: { account: string; real: RealRelay[]; coreUrl: string; initialAudio?: AudioSettings; persist?: boolean }) {
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
  const [masterMute, setMasterMute] = useState(false);
  const [audio, setAudioState] = useState<AudioSettings>(initialAudio);
  const [askMode, setAskMode] = useState<AudioMode | null>(null);
  const [listen, setListen] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<"obs" | "settings" | null>(null);
  const desk = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
  const [transition, setTransition] = useState<TransitionKind>("mix");
  const [duration, setDuration] = useState(500);
  // Durée du fondu du PROGRAMME : 0 pour un CUT, la durée réglée pour AUTO (le Screen fait le fondu entre ses deux couches).
  const [programMs, setProgramMs] = useState(0);
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

  // Réglages audio : mémorisés par compte. Changer de mode pendant un direct ou un REC demande une confirmation (puis fondu court).
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

  // Une modification de caméra n'a lieu que si la PROTECTION est coupée.
  const doPreview = (id: string) => !locked && setPreview(id);
  const doCut = useCallback(() => {
    if (locked || preview === program) return;
    setProgramMs(0);
    setProgram(preview);
    setPreview(program);
  }, [locked, preview, program]);
  const doAuto = useCallback(() => {
    if (locked || preview === program) return;
    if (transition === "cut") return doCut();
    setProgramMs(duration);
    setProgram(preview);
    setPreview(program);
  }, [locked, preview, program, transition, duration, doCut]);

  // Clavier : 1 à 8 = PREVIEW, Entrée = CUT, Espace = AUTO.
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
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [relays, locked, doCut, doAuto]);

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

  const byId = (id: string) => relays.find((r) => r.id === id) ?? relays[0];
  const model: MixModel = {
    relays, byId, program, preview, locked, slate, programMs, transition, duration, clock, live, liveSeconds, rec, recSeconds,
    master, masterMute,
    setTransition, setDuration, setMaster, toggleMasterMute: () => !locked && setMasterMute((v) => !v),
    toPreview: doPreview,
    toProgram: (id) => !locked && (setProgramMs(0), setPreview(program), setProgram(id)),
    cut: doCut, auto: doAuto, toggleLive, toggleRec, toggleSlate: () => setSlate((v) => !v),
    shot: () => say("Capture du PROGRAMME enregistrée (simulation)."),
    marker: () => say("Marqueur posé à cet instant (simulation)."),
    patch: (id, p) => (demo ? patchRelay(id, p) : mockOnly("Le mixage de tes vrais relais")),
    audio,
    setAudio: changeAudio,
    listen,
    toggleListen: (id) => setListen((cur) => (cur === id ? null : id)),
    openSettings: (id) => {
      setSelected(id);
      setDrawer("settings");
    },
  };

  const topBar = <TopBar protection={protection} onProtection={() => (protection ? setAskUnlock(true) : setProtection(true))} online={online} total={relays.length} ping={ping} account={account} demo={demo} onObs={() => setDrawer("obs")} canReal={real.length > 0} onToggleReal={() => setUseReal((v) => !v)} podcast={audio.mode === "podcast"} />;
  const banner = protection && (
    <p role="status" className="shrink-0 rounded-md border border-live bg-live/15 px-3 py-0.5 text-center font-mono text-[10px] font-semibold tracking-[0.2em]">
      PROTECTION ACTIVE · changements de caméras verrouillés
    </p>
  );

  const liveIds = useReal ? relays.filter(isOn).map((r) => r.id) : [];

  return (
    <RelayStreamsProvider coreUrl={useReal ? coreUrl : ""} liveIds={liveIds}>
    <div className="flex h-dvh flex-col gap-2 overflow-hidden p-2">
      {topBar}
      {banner}

      {!desk ? (
        <MobileMix m={model} />
      ) : (
        <>
          {/* Centre (≈ 60 % de la hauteur) : PROGRAMME au-dessus de APERÇU, et la grille des relais (2 colonnes, elle défile dans sa zone). */}
          <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-2" style={{ height: "calc((100dvh - 6rem) * 0.62)" }}>
            <div className="flex h-full flex-col gap-2">
              <Screen relayId={program} kind="program" ms={programMs} slate={slate} byId={byId} className="h-[calc((100%-0.5rem)/2)]" />
              <Screen relayId={preview} kind="preview" ms={0} byId={byId} className="h-[calc((100%-0.5rem)/2)]" />
            </div>
            {relays.length === 0 ? (
              <p className="grid place-items-center rounded-lg border border-line bg-surface text-sm text-muted">Aucun relais. Crée-en un dans Mes relais.</p>
            ) : (
              <ul className="grid h-full grid-cols-2 content-start gap-2 overflow-y-auto" style={{ gridAutoRows: "calc((100% - 1rem) / 3)" }}>
                {[...relays].sort((a, b) => Number(isOn(b)) - Number(isOn(a)) || a.n - b.n).map((r) => (
                  <RelayCell key={r.id} relay={r} program={program} preview={preview} locked={locked} onPreview={() => doPreview(r.id)} onProgram={() => model.toProgram(r.id)} onSettings={() => model.openSettings(r.id)} />
                ))}
              </ul>
            )}
          </div>

          <div className="shrink-0">
            <TransitionBar relays={relays} program={program} preview={preview} locked={locked} transition={transition} onTransition={setTransition} duration={duration} onDuration={setDuration} onPreview={doPreview} onCut={doCut} onAuto={doAuto} clock={clock} />
          </div>

          {/* Bas (≈ 30 %) : mixeur pleine largeur, et la diffusion à sa droite. */}
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_14rem] gap-2">
            <AudioMixer relays={relays} program={program} preview={preview} slate={slate} programMs={programMs} locked={locked} master={master} onMaster={setMaster} masterMute={masterMute} onMasterMute={model.toggleMasterMute} onPatch={model.patch} settings={audio} onSettings={changeAudio} listen={listen} onListen={model.toggleListen} className="h-full" />
            <div className="rounded-xl border border-line bg-surface p-2">
              <DirectPanel locked={locked} live={live} liveSeconds={liveSeconds} onLive={toggleLive} rec={rec} recSeconds={recSeconds} onRec={toggleRec} slate={slate} onSlate={model.toggleSlate} onShot={model.shot} onMarker={model.marker} />
            </div>
          </div>
        </>
      )}

      <Drawer open={drawer === "obs"} title="Ton lien OBS" onClose={() => setDrawer(null)}>
        <ObsLinkPanel token={token} host={HOST} locked={locked} onRegenerate={() => setToken(newToken())} cams={relays.map((r) => r.n).sort((a, b) => a - b)} />
      </Drawer>
      <Drawer open={drawer === "settings" && !!sel} title={sel ? `Réglages · CAM ${sel.n} · ${sel.name}` : "Réglages"} onClose={() => setDrawer(null)}>
        {sel && (
          <RelaySettings
            relay={sel}
            locked={locked}
            onRename={(name) => (demo ? patchRelay(selected, { name }) : mockOnly("Renommer un relais ici"))}
            onDisconnect={() => (demo ? patchRelay(selected, { status: "offline", kbps: 0, fps: 0, links: 0, mute: true }) : mockOnly("Déconnecter"))}
            onRegenerate={() => mockOnly("Régénérer la clé d'un relais ici")}
          />
        )}
      </Drawer>

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
            {askMode === "podcast" ? "Tous les micros non coupés vont s'ouvrir dans le direct, quelle que soit la caméra." : "Seul le relais au PROGRAMME restera audible. Les autres seront coupés."} Le changement se fait en un fondu de 150 ms.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => {
                applyAudio({ mode: askMode });
                setAskMode(null);
              }}
              className="h-10 rounded-lg bg-accent px-5 text-sm font-medium text-on-accent hover:bg-accent-hover"
            >
              Changer de mode
            </button>
            <button type="button" onClick={() => setAskMode(null)} className="h-10 rounded-lg border border-line px-5 text-sm hover:bg-foreground/10">
              Annuler
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
    </RelayStreamsProvider>
  );
}
