"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import ScanMode from "./ScanMode";
import ZoneStatus from "./ZoneStatus";
import { supportsH264, whipPublish, whipStop, type WhipSession } from "./whip";

// SYXTEE Cam : le téléphone devient une caméra du direct, sur UNE connexion (Wi-Fi ou 4G), en WebRTC (WHIP)
// vers le SYXTEE Core, qui relaie en SRT sur la clé habituelle (même URL OBS que Moblin).
// Pas de bonding : pour l'IRL multi-réseaux, Moblin reste recommandé.
// Pas de stabilisation logicielle : un navigateur ne peut pas activer celle du téléphone (aucune contrainte getUserMedia
// ne l'expose), et un recadrage image par image en JavaScript fait chauffer le téléphone pour un mauvais résultat.
// Sur iPhone, on conseille Moblin (stabilisation native d'iOS). Voir docs/plan-app-ios.md.

const KEY = "syxtee:cam-key";
const PREFS = "syxtee:cam-prefs";
const IOS_TIP = "syxtee:cam-ios-tip";
const IOS_STAB_TIP = "Pour une stabilisation maximale en IRL, utilise Moblin avec ton relais SYXTEE.";

/** iPhone / iPad (iPadOS se présente comme un Mac tactile). */
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

type Me = { username: string | null; twitch_login: string | null; whip_url: string; relay: string };
type Quality = "720" | "1080" | "1080hq";
const QUALITY: Record<Quality, { label: string; w: number; h: number; bps: number }> = {
  "720": { label: "720p · 2,5 Mb/s", w: 1280, h: 720, bps: 2_500_000 },
  "1080": { label: "1080p · 4,5 Mb/s", w: 1920, h: 1080, bps: 4_500_000 },
  "1080hq": { label: "1080p · 6 Mb/s", w: 1920, h: 1080, bps: 6_000_000 },
};
type Prefs = { quality: Quality; facing: "environment" | "user"; chat: boolean; gps: boolean };
const DEFAULT_PREFS: Prefs = { quality: "1080", facing: "environment", chat: false, gps: true };
type Lens = { zoom: number; deviceId?: string; digital?: boolean };
type Link = "idle" | "connecting" | "live" | "reconnecting" | "error";

const store = {
  get<T>(k: string, fallback: T): T {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      // stockage indisponible (navigation privée) : réglages non retenus
    }
  },
  del(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};

/** Caméras arrière : ultra grand-angle (0.5x), principale (1x), téléobjectif (3x) si le navigateur les expose. */
async function rearLenses(): Promise<Lens[]> {
  const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
  const back = devs.filter((d) => /back|arri[eè]re|rear|environment/i.test(d.label));
  const ultra = back.find((d) => /ultra/i.test(d.label));
  const tele = back.find((d) => /tele|télé/i.test(d.label));
  const lenses: Lens[] = [];
  if (ultra) lenses.push({ zoom: 0.5, deviceId: ultra.deviceId });
  lenses.push({ zoom: 1 });
  if (tele) lenses.push({ zoom: 3, deviceId: tele.deviceId });
  return lenses;
}

function Pill({ children, active = false, onClick, label }: { children: ReactNode; active?: boolean; onClick?: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 font-mono text-xs backdrop-blur-md transition-colors ${
        active ? "bg-white text-black" : "bg-black/55 text-white hover:bg-black/70"
      }`}
    >
      {children}
    </button>
  );
}

export default function CamApp({ coreUrl }: { coreUrl: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // caméra + micro bruts
  const session = useRef<WhipSession | null>(null);
  const want = useRef(false); // l'utilisateur veut être en direct (reconnexion auto)
  const retry = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const lastPos = useRef<GeolocationPosition | null>(null);

  // Démarrage (composant chargé côté navigateur seulement) : clé du lien /cam?k=… ou retenue sur le téléphone.
  const [boot] = useState(() => {
    const k = new URL(location.href).searchParams.get("k");
    const fromLink = k && /^cam_[0-9a-f]{32}$/.test(k) ? k : null;
    if (fromLink) store.set(KEY, fromLink);
    return { key: fromLink ?? store.get<string | null>(KEY, null), fromLink: !!fromLink };
  });
  const [camKey] = useState<string | null>(boot.key);
  const [me, setMe] = useState<Me | null>(null);
  const [fatal, setFatal] = useState<string | null>(boot.key ? null : "nokey");
  const [prefs, setPrefs] = useState<Prefs>(() => store.get(PREFS, DEFAULT_PREFS));
  const [link, setLink] = useState<Link>("idle");
  const [lenses, setLenses] = useState<Lens[]>([{ zoom: 1 }]);
  const [zoom, setZoom] = useState(1);
  const [torch, setTorch] = useState<boolean | null>(null); // null = indisponible
  const [muted, setMuted] = useState(false);
  const [rec, setRec] = useState(false);
  const [recUrl, setRecUrl] = useState<{ url: string; ext: string } | null>(null);
  const [stats, setStats] = useState<{ kbps: number; rtt: number | null } | null>(null);
  const [clock, setClock] = useState("");
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [net, setNet] = useState<string | null>(null);
  const [chat, setChat] = useState<{ id: number; user: string; text: string }[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [ios] = useState(isIOS);
  const [notice, setNotice] = useState<string | null>(() => {
    if (!supportsH264()) return "Ce navigateur n'envoie pas de H.264 : utilise Safari (iPhone) ou Chrome (Android).";
    // Conseil montré une fois sur iPhone (toujours rappelé dans les réglages).
    if (ios && !store.get(IOS_TIP, false)) {
      store.set(IOS_TIP, true);
      return IOS_STAB_TIP;
    }
    return null;
  });

  // ───── Clé caméra : lien /cam?k=… (QR du dashboard), retenue sur le téléphone ─────
  useEffect(() => {
    // La clé ne reste pas dans l'adresse (historique, captures d'écran).
    if (boot.fromLink) history.replaceState(null, "", location.pathname);
    navigator.serviceWorker?.register("/cam-sw.js", { scope: "/cam" }).catch(() => {});
  }, [boot.fromLink]);

  useEffect(() => {
    if (!camKey) return;
    fetch(`${coreUrl}/v1/cam/me`, { headers: { Authorization: `Bearer ${camKey}` } })
      .then(async (r) => {
        if (r.status === 401) {
          store.del(KEY);
          setFatal("badkey");
          return;
        }
        if (!r.ok) throw new Error(String(r.status));
        setMe((await r.json()) as Me);
      })
      .catch(() => setFatal("core"));
  }, [camKey, coreUrl]);

  /** Flux envoyé (diffusion, REC, aperçu) : la caméra telle quelle, sans traitement image par image. */
  function outStream() {
    return streamRef.current;
  }

  /** Applique le flux à l'aperçu et, en direct, aux pistes WebRTC (sans renégocier). */
  async function applyOutput() {
    const out = outStream();
    if (!out) return;
    if (video.current) video.current.srcObject = out;
    const pc = session.current?.pc;
    if (pc) {
      for (const snd of pc.getSenders()) {
        const t = out.getTracks().find((x) => x.kind === snd.track?.kind);
        if (t && t !== snd.track) await snd.replaceTrack(t);
      }
    }
  }

  // ───── Caméra et micro ─────
  async function openCamera(lens?: Lens) {
    {
      const q = QUALITY[prefs.quality];
      // Résolution et cadence demandées au capteur lui-même (resizeMode « none ») : pas de mise à l'échelle par le
      // navigateur. Sans objectif choisi : caméra principale (1x) côté arrière.
      const format: MediaTrackConstraints = {
        width: { ideal: q.w },
        height: { ideal: q.h },
        aspectRatio: { ideal: 16 / 9 },
        frameRate: { ideal: 30 },
        resizeMode: { ideal: "none" },
      } as MediaTrackConstraints;
      const videoC: MediaTrackConstraints = lens?.deviceId ? { deviceId: { exact: lens.deviceId }, ...format } : { facingMode: prefs.facing, ...format };
      const s = await navigator.mediaDevices.getUserMedia({
        video: videoC,
        audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true },
      });
      const old = streamRef.current;
      streamRef.current = s;
      await applyOutput();
      old?.getTracks().forEach((t) => t.stop());
      const vt = s.getVideoTracks()[0];
      const caps = (vt?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean; zoom?: { min: number; max: number } };
      setTorch(caps.torch ? false : null);
      s.getAudioTracks().forEach((t) => (t.enabled = !muted));
      // Zooms : objectifs physiques si le navigateur les liste, sinon zoom numérique de la caméra (Android).
      if (prefs.facing === "environment") {
        const l = await rearLenses();
        if (caps.zoom && caps.zoom.max >= 2 && !l.some((x) => x.zoom > 1)) {
          l.push({ zoom: 2, digital: true });
          if (caps.zoom.max >= 3) l.push({ zoom: 3, digital: true });
        }
        setLenses(l);
      } else setLenses([{ zoom: 1 }]);
    }
  }

  useEffect(() => {
    if (!me) return;
    void (async () => {
      try {
        await openCamera();
      } catch (e) {
        setFatal((e as { name?: string })?.name === "NotAllowedError" ? "denied" : "camera");
      }
    })();
    // Réouverture seulement si la qualité ou la caméra changent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, prefs.quality, prefs.facing]);

  async function pickLens(l: Lens) {
    setZoom(l.zoom);
    if (l.digital) {
      const vt = streamRef.current?.getVideoTracks()[0];
      await vt?.applyConstraints({ advanced: [{ zoom: l.zoom } as MediaTrackConstraintSet] }).catch(() => {});
    } else {
      await openCamera(l.deviceId ? l : undefined).catch(() => setNotice("Impossible de changer d'objectif."));
    }
  }

  async function toggleTorch() {
    const vt = streamRef.current?.getVideoTracks()[0];
    if (!vt || torch === null) return;
    try {
      await vt.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {
      setNotice("La torche ne répond pas sur cet appareil.");
    }
  }

  function toggleMute() {
    const m = !muted;
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !m));
    setMuted(m);
  }

  // ───── Diffusion (WHIP) + reconnexion automatique ─────
  const connectRef = useRef<() => Promise<void>>(async () => {});
  async function connect() {
    const out = outStream();
    if (!me || !out || !want.current) return;
    setLink(retry.current ? "reconnecting" : "connecting");
    try {
      const s = await whipPublish(me.whip_url, out, QUALITY[prefs.quality].bps);
      session.current = s;
      retry.current = 0;
      setLink("live");
      s.pc.addEventListener("connectionstatechange", () => {
        const st = s.pc.connectionState;
        if ((st === "failed" || st === "disconnected" || st === "closed") && session.current === s && want.current) {
          whipStop(s);
          session.current = null;
          schedule();
        }
      });
    } catch (e) {
      if ((e as { status?: number }).status === 401 || (e as { status?: number }).status === 403) {
        want.current = false;
        setLink("error");
        setNotice("Lien caméra refusé : génère un nouveau lien depuis ton dashboard.");
        return;
      }
      schedule();
    }
  }

  function schedule() {
    if (!want.current) return;
    setLink("reconnecting");
    const delay = Math.min(15_000, 1000 * 2 ** retry.current++);
    setTimeout(() => void connectRef.current(), delay);
  }

  // Toujours les dernières versions pour les relances différées et la détection de coupure.
  const scheduleRef = useRef<() => void>(() => {});
  useEffect(() => {
    connectRef.current = connect;
    scheduleRef.current = schedule;
  });

  function goLive() {
    if (link === "live" || link === "connecting" || link === "reconnecting") {
      want.current = false;
      whipStop(session.current);
      session.current = null;
      setLink("idle");
      setStats(null);
      return;
    }
    want.current = true;
    retry.current = 0;
    void connect();
  }

  useEffect(() => () => whipStop(session.current), []);

  // ───── Statistiques (débit envoyé, latence) ─────
  useEffect(() => {
    if (link !== "live") return;
    let last: { bytes: number; t: number } | null = null;
    // Serveur injoignable : l'UDP part toujours, mais plus rien ne revient (RTCP, STUN). 5 s de silence = coupure.
    let received = -1;
    let silent = 0;
    const id = setInterval(async () => {
      const s = session.current;
      const pc = s?.pc;
      if (!pc) return;
      const rep = await pc.getStats();
      let bytes = 0;
      let rtt: number | null = null;
      let got = 0;
      rep.forEach((r) => {
        if (r.type === "outbound-rtp") bytes += (r as RTCOutboundRtpStreamStats).bytesSent ?? 0;
        const cp = r as RTCIceCandidatePairStats;
        if (r.type === "candidate-pair" && cp.nominated) {
          got += cp.bytesReceived ?? 0;
          if (cp.currentRoundTripTime !== undefined) rtt = Math.round(cp.currentRoundTripTime * 1000);
        }
      });
      const now = performance.now();
      if (last) setStats({ kbps: Math.round(((bytes - last.bytes) * 8) / (now - last.t)), rtt });
      last = { bytes, t: now };
      silent = got === received ? silent + 1 : 0;
      received = got;
      if (silent >= 5 && session.current === s) {
        whipStop(s);
        session.current = null;
        scheduleRef.current();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [link]);

  // ───── Écran toujours allumé pendant le direct ─────
  useEffect(() => {
    if (link !== "live") return;
    let lock: WakeLockSentinel | null = null;
    const request = () => navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    request();
    const onVis = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, [link]);

  // ───── GPS (trajet du direct, carte du débit) ─────
  useEffect(() => {
    if (link !== "live" || !prefs.gps || !camKey || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition((p) => (lastPos.current = p), () => {}, { enableHighAccuracy: true, maximumAge: 2000 });
    const send = setInterval(() => {
      const p = lastPos.current;
      if (!p) return;
      fetch(`${coreUrl}/v1/cam/gps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${camKey}`, "Content-Type": "application/json" },
        // ct : type de réseau réel (Android) pour que les mesures du live faites en Wi-Fi n'entrent jamais dans la carte 4G/5G.
        body: JSON.stringify({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          acc: p.coords.accuracy,
          speed: p.coords.speed,
          t: p.timestamp,
          ct: (navigator as Navigator & { connection?: { type?: string } }).connection?.type ?? null,
        }),
      }).catch(() => {});
    }, 2000);
    return () => {
      navigator.geolocation.clearWatch(watch);
      clearInterval(send);
    };
  }, [link, prefs.gps, camKey, coreUrl]);

  // ───── Barre d'état : heure, batterie, réseau ─────
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 10_000);
    type Batt = { level: number; charging: boolean; addEventListener: (t: string, f: () => void) => void };
    (navigator as Navigator & { getBattery?: () => Promise<Batt> }).getBattery?.().then((b) => {
      const up = () => setBattery({ level: Math.round(b.level * 100), charging: b.charging });
      up();
      b.addEventListener("levelchange", up);
      b.addEventListener("chargingchange", up);
    });
    const c = (navigator as Navigator & { connection?: { type?: string; effectiveType?: string; addEventListener?: (t: string, f: () => void) => void } }).connection;
    // Type réel seulement (Android) ; effectiveType n'est qu'une estimation de vitesse, pas le réseau utilisé.
    const upNet = () => setNet(c?.type === "wifi" ? "Wi-Fi" : c?.type === "cellular" ? "Mobile" : null);
    upNet();
    c?.addEventListener?.("change", upNet);
    return () => clearInterval(id);
  }, []);

  // ───── Chat Twitch en superposition (lecture seule, anonyme) ─────
  useEffect(() => {
    if (!prefs.chat || !me?.twitch_login) return;
    const ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
    let n = 0;
    ws.onopen = () => {
      ws.send("CAP REQ :twitch.tv/tags");
      ws.send("PASS SCHMOOPIIE");
      ws.send(`NICK justinfan${Math.floor(Math.random() * 90000) + 10000}`);
      ws.send(`JOIN #${me.twitch_login}`);
    };
    ws.onmessage = (ev) => {
      for (const line of String(ev.data).split("\r\n")) {
        if (line.startsWith("PING")) ws.send("PONG :tmi.twitch.tv");
        const m = line.match(/display-name=([^;]*);.*PRIVMSG #\S+ :(.*)$/);
        if (m) setChat((c) => [...c.slice(-7), { id: n++, user: m[1] || "?", text: m[2] }]);
      }
    };
    return () => ws.close();
  }, [prefs.chat, me?.twitch_login]);

  // ───── Enregistrement local (REC) ─────
  function toggleRec() {
    if (rec) {
      recorder.current?.stop();
      setRec(false);
      return;
    }
    const out = outStream();
    if (!out || typeof MediaRecorder === "undefined") return setNotice("Enregistrement indisponible sur ce navigateur.");
    const type = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
    const r = new MediaRecorder(out, type ? { mimeType: type } : undefined);
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      if (recUrl) URL.revokeObjectURL(recUrl.url);
      setRecUrl({ url: URL.createObjectURL(new Blob(chunks.current, { type: r.mimeType })), ext: r.mimeType.includes("mp4") ? "mp4" : "webm" });
    };
    r.start(1000);
    recorder.current = r;
    setRec(true);
  }

  function savePrefs(p: Partial<Prefs>) {
    const next = { ...prefs, ...p };
    setPrefs(next);
    store.set(PREFS, next);
  }

  // ───── Écrans d'erreur ─────
  if (fatal) {
    const msg = {
      nokey: "Ouvre le lien caméra (ou scanne son QR code) depuis ton dashboard SYXTEE, rubrique SYXTEE Cam.",
      badkey: "Ce lien caméra n'est plus valide. Génère-en un nouveau depuis ton dashboard.",
      core: "Le relais ne répond pas. Vérifie ta connexion et réessaie.",
      denied: "Autorise l'accès à la caméra et au micro dans les réglages du navigateur, puis recharge la page.",
      camera: "Impossible d'ouvrir la caméra sur cet appareil.",
    }[fatal];
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
        <Image src="/logo-400.png" alt="SYXTEE" width={26} height={36} />
        <p className="max-w-sm text-sm leading-relaxed text-white/80">{msg}</p>
        <a href="/dashboard/cam" className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black">
          Ouvrir le dashboard
        </a>
      </div>
    );
  }

  const live = link === "live";
  const busy = link === "connecting" || link === "reconnecting";

  return (
    <div className="relative h-full w-full overflow-hidden bg-black text-white">
      <video ref={video} autoPlay playsInline muted className={`absolute inset-0 h-full w-full object-cover ${prefs.facing === "user" ? "-scale-x-100" : ""}`} />

      {/* Barre du haut */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent px-[max(1rem,env(safe-area-inset-left))] pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Image src="/logo-400.png" alt="" width={16} height={22} />
        <span className="font-mono text-xs tracking-[0.18em]">SYXTEE LIVE</span>
        {live && (
          <span className="flex items-center gap-1.5 rounded bg-live px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em]">
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> EN DIRECT
          </span>
        )}
        {busy && <span className="font-mono text-[10px] tracking-[0.12em] text-[#fab219]">{link === "connecting" ? "CONNEXION…" : "RECONNEXION…"}</span>}
        <span className="ml-auto flex items-center gap-3 font-mono text-xs text-white/80">
          {stats && (
            <span className="tabular-nums">
              {(stats.kbps / 1000).toFixed(1).replace(".", ",")} Mb/s{stats.rtt !== null ? ` · ${stats.rtt} ms` : ""}
            </span>
          )}
          {net && <span>{net}</span>}
          {battery && <span className="tabular-nums">{battery.charging ? "⚡" : ""}{battery.level} %</span>}
          <span className="tabular-nums">{clock}</span>
        </span>
      </div>

      {/* Chat */}
      {prefs.chat && chat.length > 0 && (
        <ul className="absolute bottom-32 left-[max(1rem,env(safe-area-inset-left))] max-w-[55%] space-y-1 text-sm" aria-live="polite">
          {chat.map((c) => (
            <li key={c.id} className="w-fit rounded-lg bg-black/55 px-2.5 py-1 backdrop-blur-sm">
              <span className="font-medium text-white/70">{c.user}</span> {c.text}
            </li>
          ))}
        </ul>
      )}

      {notice && (
        <button type="button" onClick={() => setNotice(null)} className="absolute left-1/2 top-16 max-w-[90%] -translate-x-1/2 rounded-xl bg-black/80 px-4 py-2 text-left text-sm text-white/90">
          {notice}
        </button>
      )}

      {/* Zooms */}
      {lenses.length > 1 && (
        <div className="absolute inset-x-0 bottom-28 flex justify-center gap-2">
          {lenses.map((l) => (
            <Pill key={`${l.zoom}${l.digital ? "d" : ""}`} active={zoom === l.zoom} onClick={() => void pickLens(l)} label={`Zoom ${l.zoom}x`}>
              {String(l.zoom).replace(".", ",")}x
            </Pill>
          ))}
        </div>
      )}

      {/* Barre du bas */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/75 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
        <Pill onClick={() => setShowSettings(true)} label="Réglages">
          ⚙
        </Pill>
        <Pill active={muted} onClick={toggleMute} label={muted ? "Réactiver le micro" : "Couper le micro"}>
          {muted ? "MICRO COUPÉ" : "MICRO"}
        </Pill>
        <Pill active={!!torch} onClick={toggleTorch} label="Torche">
          {torch === null ? <span className="text-white/40">TORCHE</span> : "TORCHE"}
        </Pill>
        <Pill active={rec} onClick={toggleRec} label="Enregistrer sur le téléphone">
          <span className={`h-2 w-2 rounded-full ${rec ? "bg-live" : "bg-white/70"}`} /> REC
        </Pill>
        <button
          type="button"
          onClick={goLive}
          disabled={!me}
          className={`ml-2 flex h-14 items-center gap-2 rounded-full px-7 text-sm font-semibold tracking-[0.08em] transition-colors disabled:opacity-50 ${
            live || busy ? "bg-live text-white" : "bg-white text-black"
          }`}
        >
          {live || busy ? "■ ARRÊTER" : "● DIFFUSER"}
        </button>
      </div>

      {recUrl && !rec && (
        <a href={recUrl.url} download={`syxtee-cam.${recUrl.ext}`} className="absolute right-4 top-16 rounded-full bg-white px-4 py-2 text-xs font-medium text-black">
          Enregistrer la vidéo
        </a>
      )}

      {/* Réglages */}
      {showSettings && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-label="Réglages">
          <div className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-black p-5">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs tracking-[0.18em]">RÉGLAGES</p>
              <button type="button" onClick={() => setShowSettings(false)} className="text-white/60" aria-label="Fermer">
                ✕
              </button>
            </div>
            <p className="mt-4 text-sm text-white/60">
              Caméra de <span className="text-white">{me?.username ?? "…"}</span> · relais {me?.relay}
            </p>
            <p className="mt-5 text-xs text-white/60">Qualité {live ? "(change au prochain direct)" : ""}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(QUALITY) as Quality[]).map((q) => (
                <Pill key={q} active={prefs.quality === q} onClick={() => savePrefs({ quality: q })}>
                  {QUALITY[q].label}
                </Pill>
              ))}
            </div>
            <p className="mt-5 text-xs text-white/60">Caméra</p>
            <div className="mt-2 flex gap-2">
              <Pill active={prefs.facing === "environment"} onClick={() => savePrefs({ facing: "environment" })}>
                ARRIÈRE
              </Pill>
              <Pill active={prefs.facing === "user"} onClick={() => savePrefs({ facing: "user" })}>
                AVANT
              </Pill>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <label className="flex items-center justify-between gap-4">
                Chat Twitch en superposition
                <input type="checkbox" checked={prefs.chat} disabled={!me?.twitch_login} onChange={(e) => savePrefs({ chat: e.target.checked })} className="h-5 w-5 accent-white" />
              </label>
              {!me?.twitch_login && <p className="text-xs text-white/50">Lie ton Twitch dans ton compte pour afficher le chat.</p>}
              <label className="flex items-center justify-between gap-4">
                Envoyer ma position (carte du débit)
                <input type="checkbox" checked={prefs.gps} onChange={(e) => savePrefs({ gps: e.target.checked })} className="h-5 w-5 accent-white" />
              </label>
            </div>
            <button
              type="button"
              disabled={live}
              onClick={() => {
                setShowSettings(false);
                setShowScan(true);
              }}
              className="mt-5 h-11 w-full rounded-full border border-white/20 text-sm disabled:opacity-40"
            >
              Mode Scan (carte de couverture)
            </button>
            <p className="mt-5 text-xs leading-relaxed text-white/50">
              Une seule connexion (Wi-Fi ou 4G), sans bonding. Pour l&apos;IRL multi-réseaux, utilise Moblin. Si la connexion coupe, SYXTEE Cam se
              reconnecte seule.
            </p>
            {ios && <p className="mt-3 text-xs leading-relaxed text-white/80">{IOS_STAB_TIP}</p>}
            <button
              type="button"
              onClick={() => {
                store.del(KEY);
                location.reload();
              }}
              className="mt-5 text-xs text-white/50 underline underline-offset-4"
            >
              Déconnecter cette caméra
            </button>
          </div>
        </div>
      )}
      {me && <ZoneStatus live={live} enabled={prefs.gps} />}
      {showScan && camKey && <ScanMode coreUrl={coreUrl} camKey={camKey} onClose={() => setShowScan(false)} />}
    </div>
  );
}
