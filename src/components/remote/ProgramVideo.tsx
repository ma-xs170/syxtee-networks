"use client";

import { useEffect, useRef, useState } from "react";

// Aperçu vidéo + son du programme d'OBS : lecture WebRTC (WHEP) d'un flux que le plugin pousse vers MediaMTX (simple transmission, aucun
// transcodage sur le serveur). L'image n'existe que tant que cette page est ouverte : le plugin démarre à l'ouverture, s'arrête à la fermeture.
// Le son démarre coupé (les navigateurs interdisent la lecture automatique avec le son) : le bouton Son le remet, avec un volume local.

export type Watch = { whep_url: string | null; ready: boolean };

export default function ProgramVideo({
  watch,
  program,
  live,
  muted,
  volume,
  onState,
}: {
  /** Demande au Core l'adresse de lecture (session ouverte par le plugin) et si l'image arrive. */
  watch: () => Promise<Watch>;
  program: string;
  live: boolean;
  muted: boolean;
  volume: number;
  /** « playing » dès qu'une image est affichée ; « waiting » sinon. */
  onState?: (s: "waiting" | "playing") => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const stateCb = useRef(onState);
  useEffect(() => {
    stateCb.current = onState;
  }, [onState]);

  // Connexion, avec nouvel essai : tant que l'image n'arrive pas, puis si la liaison tombe.
  useEffect(() => {
    let gone = false;
    let pc: RTCPeerConnection | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const retry = (ms: number) => {
      if (!gone) timer = setTimeout(() => void connect(), ms);
    };
    const close = () => {
      pc?.close();
      pc = null;
    };

    async function connect() {
      try {
        const w = await watch();
        if (gone) return;
        if (!w.whep_url || !w.ready) return retry(1500);
        const conn = new RTCPeerConnection();
        pc = conn;
        conn.addTransceiver("video", { direction: "recvonly" });
        conn.addTransceiver("audio", { direction: "recvonly" });
        conn.ontrack = (e) => {
          const el = video.current;
          if (el && e.streams[0] && el.srcObject !== e.streams[0]) el.srcObject = e.streams[0];
        };
        conn.onconnectionstatechange = () => {
          if (gone || pc !== conn) return;
          if (conn.connectionState === "failed" || conn.connectionState === "closed" || conn.connectionState === "disconnected") {
            close();
            setPlaying(false);
            stateCb.current?.("waiting");
            retry(2000);
          }
        };
        await conn.setLocalDescription(await conn.createOffer());
        // Pas de trickle : on attend les candidats locaux (sans serveur STUN, c'est immédiat) puis on envoie l'offre complète.
        await new Promise<void>((ok) => {
          if (conn.iceGatheringState === "complete") return ok();
          const t = setTimeout(ok, 2000);
          conn.onicegatheringstatechange = () => {
            if (conn.iceGatheringState === "complete") {
              clearTimeout(t);
              ok();
            }
          };
        });
        const res = await fetch(w.whep_url, { method: "POST", headers: { "content-type": "application/sdp" }, body: conn.localDescription?.sdp ?? "" });
        if (!res.ok) throw new Error(`WHEP ${res.status}`);
        await conn.setRemoteDescription({ type: "answer", sdp: await res.text() });
      } catch {
        close();
        retry(2500);
      }
    }
    void connect();
    return () => {
      gone = true;
      clearTimeout(timer);
      close();
    };
  }, [watch]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    el.muted = muted;
    el.volume = Math.max(0, Math.min(1, volume));
  }, [muted, volume]);

  return (
    <section aria-label="Programme" className="overflow-hidden rounded-2xl border border-line bg-surface-2">
      <div className="relative aspect-video w-full bg-foreground/5">
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          onPlaying={() => {
            setPlaying(true);
            stateCb.current?.("playing");
          }}
          onEmptied={() => setPlaying(false)}
          aria-label={`Programme : ${program}`}
          className={`h-full w-full object-contain transition-opacity duration-300 ${playing ? "opacity-100" : "opacity-0"}`}
        />
        {!playing && <div className="absolute inset-0 flex animate-pulse items-center justify-center font-mono text-xs uppercase tracking-wider text-muted">Aperçu en attente</div>}
        {program && (
          <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-md bg-background/80 px-2 py-1 font-mono text-[11px] text-foreground backdrop-blur-sm">
            {!live && <span className="mr-2 text-muted">HORS DIRECT</span>}
            {program}
          </span>
        )}
        {live && <span className="absolute right-3 top-3 rounded-md bg-live px-2 py-1 font-mono text-[11px] font-semibold text-white">EN DIRECT</span>}
      </div>
    </section>
  );
}
