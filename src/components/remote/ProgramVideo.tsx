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

export default function ProgramVideo({
  watch,
  program,
  muted,
  volume,
  onState,
  showLatency = true,
}: {
  /** Demande au Core l'adresse de lecture (session ouverte par le plugin) et si l'image arrive. */
  watch: () => Promise<Watch>;
  program: string;
  muted: boolean;
  volume: number;
  /** « playing » dès qu'une image est affichée ; « waiting » sinon. */
  onState?: (s: "waiting" | "playing") => void;
  showLatency?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [why, setWhy] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const [showMs, setShowMs] = useState(true);
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
            rep.forEach((s) => {
              if (s.type === "candidate-pair" && s.state === "succeeded" && s.nominated) rtt = (s.currentRoundTripTime ?? 0) * 1000;
              if (s.type === "inbound-rtp" && s.kind === "video" && s.jitterBufferEmittedCount > 0) delay = (s.jitterBufferDelay / s.jitterBufferEmittedCount) * 1000;
            });
            if (!gone) setLatency(Math.round(rtt / 2 + delay));
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
      {phase === "connecting" && <div className="absolute inset-0 grid place-items-center text-[13px] text-neutral-400">Connexion à l&apos;aperçu…</div>}
      {phase === "failed" && (
        <div role="alert" className="absolute inset-0 grid place-items-center text-center text-[13px] text-neutral-300">
          <div>
            <p>Aperçu indisponible{why ? ` (${why})` : ""}.</p>
            <button type="button" onClick={retryNow} className="mt-3 h-8 rounded border border-neutral-600 px-4 hover:bg-neutral-800">
              Réessayer
            </button>
          </div>
        </div>
      )}
      {showLatency && phase === "playing" && latency != null && (
        <button type="button" title="Latence estimée (cliquer pour masquer)" onClick={() => setShowMs((s) => !s)} className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] tabular-nums text-neutral-400">
          {showMs ? `${latency} ms` : "ms"}
        </button>
      )}
    </div>
  );
}
