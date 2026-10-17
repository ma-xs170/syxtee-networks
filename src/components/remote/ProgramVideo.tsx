"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Aperçu vidéo + son du programme d'OBS : lecture WebRTC (WHEP) d'un flux que le plugin pousse vers MediaMTX (simple transmission, aucun
// transcodage sur le serveur). L'image n'existe que tant que cette page est ouverte : le plugin démarre à l'ouverture, s'arrête à la fermeture.
// Le son démarre coupé (les navigateurs interdisent la lecture automatique avec le son) : le bouton Son le remet, avec un volume local.
// Audio et vidéo voyagent dans la même connexion pour rester synchronisés ; le tampon de lecture est réduit au minimum (latence).

export type Watch = { whep_url: string | null; ready: boolean; ice_servers?: RTCIceServer[] };

/** Si l'image n'est pas là après ce délai, message clair + « Réessayer » (jamais un écran noir sans fin). */
const GIVE_UP_MS = 5000;

type Phase = "connecting" | "playing" | "failed";

/** Qualité de l'aperçu, de la plus légère (0 : 360p, 0,5 Mbit/s) à la plus nette (2 : 720p, 2,5 Mbit/s). Le plugin applique le niveau (kbps + hauteur). */
export type PreviewLevel = 0 | 1 | 2;
export const PREVIEW_LABEL = ["360p", "540p", "720p"] as const;
const DEFAULT_LEVEL: PreviewLevel = 1;
const COOLDOWN_DOWN_MS = 12_000;
const COOLDOWN_UP_MS = 45_000;

/** Niveau de départ et plafond selon la connexion annoncée par le navigateur (absent sur Safari/Firefox : on garde 540p). */
function connectionCap(): PreviewLevel {
  const c = (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; saveData?: boolean } }).connection;
  if (!c) return 2;
  if (c.saveData || c.effectiveType === "slow-2g" || c.effectiveType === "2g" || c.effectiveType === "3g") return 0;
  if (typeof c.downlink === "number" && c.downlink < 2) return 0;
  if (typeof c.downlink === "number" && c.downlink < 5) return 1;
  return 2;
}

export default function ProgramVideo({
  watch,
  program,
  muted,
  volume,
  onState,
  onQuality,
  showLatency = true,
}: {
  /** Demande au Core l'adresse de lecture (session ouverte par le plugin) et si l'image arrive. */
  watch: () => Promise<Watch>;
  program: string;
  muted: boolean;
  volume: number;
  /** « playing » dès qu'une image est affichée ; « waiting » sinon. */
  onState?: (s: "waiting" | "playing") => void;
  /** Veille de qualité : demande au poste de changer le niveau de l'aperçu quand la connexion de ce navigateur se dégrade (ou se rétablit). */
  onQuality?: (level: PreviewLevel) => void;
  showLatency?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [why, setWhy] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const [showMs, setShowMs] = useState(true);
  const [level, setLevel] = useState<PreviewLevel>(DEFAULT_LEVEL);
  const qualityCb = useRef(onQuality);
  useEffect(() => {
    qualityCb.current = onQuality;
  }, [onQuality]);
  const stateCb = useRef(onState);
  useEffect(() => {
    stateCb.current = onState;
  }, [onState]);

  // Connexion, avec nouvel essai automatique ; au bout de GIVE_UP_MS sans image, on affiche l'échec et le bouton.
  useEffect(() => {
    let gone = false;
    let pc: RTCPeerConnection | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let giveUp: ReturnType<typeof setTimeout> | undefined;
    let stats: ReturnType<typeof setInterval> | undefined;
    let playing = false;
    // Veille de qualité : on baisse vite (perte, latence ou images qui manquent), on remonte lentement (connexion saine et assez large).
    let cur: PreviewLevel = Math.min(DEFAULT_LEVEL, connectionCap()) as PreviewLevel;
    let changedAt = 0;
    let bad = 0;
    let good = 0;
    let prevLost = 0;
    let prevRecv = 0;
    const move = (next: PreviewLevel) => {
      cur = next;
      changedAt = Date.now();
      bad = 0;
      good = 0;
      setLevel(next);
      qualityCb.current?.(next);
    };

    const retry = (ms: number) => {
      if (!gone) timer = setTimeout(() => void connect(), ms);
    };
    const close = () => {
      clearInterval(stats);
      pc?.close();
      pc = null;
    };
    const fail = (reason: string) => {
      if (playing) return;
      setWhy(reason);
      setPhase("failed");
    };
    giveUp = setTimeout(() => fail("L'aperçu ne répond pas."), GIVE_UP_MS);

    async function connect() {
      try {
        const w = await watch();
        if (gone) return;
        if (!w.whep_url || !w.ready) return retry(1000);
        const conn = new RTCPeerConnection({ iceServers: w.ice_servers ?? [], bundlePolicy: "max-bundle" });
        pc = conn;
        const t = [conn.addTransceiver("video", { direction: "recvonly" }), conn.addTransceiver("audio", { direction: "recvonly" })];
        // Tampon de lecture au minimum : la latence prime sur la fluidité absolue.
        for (const x of t) {
          const r = x.receiver as RTCRtpReceiver & { jitterBufferTarget?: number | null; playoutDelayHint?: number };
          try {
            r.jitterBufferTarget = 0;
          } catch {
            /* non pris en charge */
          }
          try {
            r.playoutDelayHint = 0;
          } catch {
            /* non pris en charge */
          }
        }
        conn.ontrack = (e) => {
          const el = video.current;
          if (el && e.streams[0] && el.srcObject !== e.streams[0]) el.srcObject = e.streams[0];
        };
        conn.onconnectionstatechange = () => {
          if (gone || pc !== conn) return;
          if (conn.connectionState === "failed" || conn.connectionState === "closed" || conn.connectionState === "disconnected") {
            close();
            playing = false;
            setPhase("connecting");
            stateCb.current?.("waiting");
            giveUp = setTimeout(() => fail("La liaison avec l'aperçu est tombée."), GIVE_UP_MS);
            retry(1000);
          }
        };
        await conn.setLocalDescription(await conn.createOffer());
        // Pas de trickle : on attend les candidats locaux puis on envoie l'offre complète (500 ms au plus).
        await new Promise<void>((ok) => {
          if (conn.iceGatheringState === "complete") return ok();
          const to = setTimeout(ok, 500);
          conn.onicegatheringstatechange = () => {
            if (conn.iceGatheringState === "complete") {
              clearTimeout(to);
              ok();
            }
          };
        });
        const res = await fetch(w.whep_url, { method: "POST", headers: { "content-type": "application/sdp" }, body: conn.localDescription?.sdp ?? "" });
        if (!res.ok) throw new Error(`WHEP ${res.status}`);
        await conn.setRemoteDescription({ type: "answer", sdp: await res.text() });
        // Latence estimée : moitié du RTT + tampon de lecture de l'image.
        stats = setInterval(async () => {
          try {
            const rep = await conn.getStats();
            let rtt = 0;
            let delay = 0;
            let lost = 0;
            let recv = 0;
            let fps = 30;
            rep.forEach((s) => {
              if (s.type === "candidate-pair" && s.state === "succeeded" && s.nominated) rtt = (s.currentRoundTripTime ?? 0) * 1000;
              if (s.type === "inbound-rtp" && s.kind === "video") {
                if (s.jitterBufferEmittedCount > 0) delay = (s.jitterBufferDelay / s.jitterBufferEmittedCount) * 1000;
                lost = s.packetsLost ?? 0;
                recv = s.packetsReceived ?? 0;
                if (typeof s.framesPerSecond === "number") fps = s.framesPerSecond;
              }
            });
            if (gone) return;
            setLatency(Math.round(rtt / 2 + delay));
            const dLost = Math.max(0, lost - prevLost);
            const dRecv = Math.max(0, recv - prevRecv);
            prevLost = lost;
            prevRecv = recv;
            const loss = dLost + dRecv > 0 ? (dLost / (dLost + dRecv)) * 100 : 0;
            if (!playing || !qualityCb.current) return;
            const sick = loss > 4 || rtt > 350 || (fps > 0 && fps < 12);
            const healthy = loss < 0.5 && rtt < 150 && fps >= 20;
            bad = sick ? bad + 1 : 0;
            good = healthy ? good + 1 : 0;
            const since = Date.now() - changedAt;
            if (bad >= 4 && cur > 0 && since > COOLDOWN_DOWN_MS) move((cur - 1) as PreviewLevel);
            else if (good >= 40 && cur < connectionCap() && since > COOLDOWN_UP_MS) move((cur + 1) as PreviewLevel);
          } catch {
            /* connexion fermée */
          }
        }, 1000);
      } catch (e) {
        close();
        setWhy(e instanceof Error ? e.message : "Erreur");
        retry(1500);
      }
    }
    const onPlaying = () => {
      if (!playing && cur !== DEFAULT_LEVEL) qualityCb.current?.(cur);
      playing = true;
      clearTimeout(giveUp);
      setPhase("playing");
      stateCb.current?.("playing");
    };
    const el = video.current;
    el?.addEventListener("playing", onPlaying);
    void connect();
    return () => {
      gone = true;
      clearTimeout(timer);
      clearTimeout(giveUp);
      el?.removeEventListener("playing", onPlaying);
      close();
    };
  }, [watch, attempt]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    el.muted = muted;
    el.volume = Math.max(0, Math.min(1, volume));
  }, [muted, volume]);

  const retryNow = useCallback(() => {
    setPhase("connecting");
    setWhy("");
    setAttempt((n) => n + 1);
  }, []);

  return (
    <div className="relative h-full w-full">
      <video ref={video} autoPlay playsInline muted aria-label={`Programme : ${program}`} className={`absolute inset-0 h-full w-full object-contain ${phase === "playing" ? "opacity-100" : "opacity-0"}`} />
      {phase === "connecting" && <div className="absolute inset-0 grid place-items-center text-sm text-muted">Connexion à l&apos;aperçu…</div>}
      {phase === "failed" && (
        <div role="alert" className="absolute inset-0 grid place-items-center text-center text-sm text-foreground/80">
          <div>
            <p>Aperçu indisponible{why ? ` (${why})` : ""}.</p>
            <button type="button" onClick={retryNow} className="mt-3 h-10 rounded-full btn-tonal px-5 text-sm">
              Réessayer
            </button>
          </div>
        </div>
      )}
      {showLatency && phase === "playing" && latency != null && (
        <button type="button" title="Qualité de l'aperçu (automatique selon ta connexion) et latence estimée. Cliquer pour masquer." onClick={() => setShowMs((s) => !s)} className="absolute bottom-2 right-2 rounded bg-background/70 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-muted">
          {showMs ? `${PREVIEW_LABEL[level]} · ${latency} ms` : "ms"}
        </button>
      )}
    </div>
  );
}
