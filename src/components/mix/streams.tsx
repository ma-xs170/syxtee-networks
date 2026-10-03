"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { coreToken } from "../dashboard/coreClient";

// Registre des flux de la régie : UNE connexion par relais EN LIGNE (lecteur mpegts.js sur le Core), ouverte en permanence,
// même quand le relais n'est ni en APERÇU ni en PROGRAMME (flux pré-chauffé). Vignettes, APERÇU et PROGRAMME ne créent jamais
// leur propre connexion : ils recopient, sur un <canvas>, l'image de la vidéo cachée du registre (StreamCanvas). Changer de
// caméra ne reconnecte donc rien. Le registre garde aussi la dernière image de chaque relais (poster) : un relais qui se
// reconnecte montre sa dernière image sous un voile, jamais un écran vide.
//
// Le Core ne parle pas WebRTC/WHEP : il sert du MPEG-TS (live.ts). Recopier sur canvas marche aussi sur Safari, où
// HTMLMediaElement.captureStream n'existe pas. Rien ici ne re-rend React à chaque image : tout passe par des refs et requestAnimationFrame.

type Player = { destroy: () => void; unload: () => void; detachMediaElement: () => void; pause: () => void };
type Entry = {
  id: string;
  video: HTMLVideoElement;
  poster: HTMLCanvasElement;
  hasFrame: boolean;
  playing: boolean;
  player: Player | null;
  stop: () => void;
};

const POSTER_W = 320;
const POSTER_H = 180;

export class StreamHub {
  entries = new Map<string, Entry>();
  constructor(
    private coreUrl: string,
    private host: HTMLElement,
  ) {}

  get(id: string) {
    return this.entries.get(id);
  }

  /** Une image est disponible : le flux joue, ou une dernière image est gardée. */
  ready(id: string) {
    const e = this.entries.get(id);
    return !!e && (e.hasFrame || e.video.readyState >= 2);
  }

  /** Ouvre les relais ajoutés, ferme ceux qui ne sont plus en ligne. */
  sync(ids: string[]) {
    for (const id of ids) if (!this.entries.has(id)) this.open(id);
    for (const [id, e] of this.entries) {
      if (!ids.includes(id)) {
        e.stop();
        this.entries.delete(id);
      }
    }
  }

  destroy() {
    this.entries.forEach((e) => e.stop());
    this.entries.clear();
  }

  private open(id: string) {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    this.host.appendChild(video);
    const poster = document.createElement("canvas");
    poster.width = POSTER_W;
    poster.height = POSTER_H;
    const e: Entry = { id, video, poster, hasFrame: false, playing: false, player: null, stop: () => {} };
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const teardown = () => {
      const p = e.player;
      e.player = null;
      e.playing = false;
      if (!p) return;
      try {
        p.pause();
        p.unload();
        p.detachMediaElement();
        p.destroy();
      } catch {}
    };
    const again = () => {
      teardown();
      if (!stopped) retry = setTimeout(start, 3000);
    };
    const start = async () => {
      if (stopped) return;
      try {
        const { default: mpegts } = await import("mpegts.js");
        if (!mpegts.isSupported()) return;
        const token = await coreToken();
        if (stopped) return;
        mpegts.LoggingControl.enableAll = false;
        const p = mpegts.createPlayer(
          { type: "mpegts", isLive: true, url: `${this.coreUrl}/v1/me/relays/${id}/live.ts` },
          { headers: { Authorization: `Bearer ${token}` }, enableWorker: true, enableStashBuffer: false, liveSync: true, liveSyncMaxLatency: 1.5, liveSyncTargetLatency: 0.6, autoCleanupSourceBuffer: true },
        );
        e.player = p as unknown as Player;
        p.on(mpegts.Events.ERROR, again);
        p.on(mpegts.Events.LOADING_COMPLETE, again);
        p.attachMediaElement(video);
        p.load();
        await Promise.resolve(p.play()).catch(() => {});
      } catch {
        again();
      }
    };
    const onPlaying = () => (e.playing = true);
    const onStalled = () => (e.playing = false);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onStalled);
    video.addEventListener("emptied", onStalled);

    // Dernière image gardée toutes les ~500 ms (320x180).
    const snap = setInterval(() => {
      if (video.readyState >= 2 && !video.paused && video.videoWidth) {
        poster.getContext("2d")?.drawImage(video, 0, 0, POSTER_W, POSTER_H);
        e.hasFrame = true;
      }
    }, 500);

    e.stop = () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      clearInterval(snap);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onStalled);
      video.removeEventListener("emptied", onStalled);
      teardown();
      video.remove();
    };
    this.entries.set(id, e);
    void start();
  }
}

const HubContext = createContext<StreamHub | null>(null);
export const useStreamHub = () => useContext(HubContext);

/** Fournit le registre. `liveIds` : relais réels en ligne (vide en démonstration : aucune connexion). */
export function RelayStreamsProvider({ coreUrl, liveIds, children }: { coreUrl: string; liveIds: string[]; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const hub = useRef<StreamHub | null>(null);
  // Objet stable lu par les composants (get / ready) : il relaie vers le registre courant, créé après le premier rendu.
  const [proxy] = useState(() => ({ get: (id: string) => hub.current?.get(id), ready: (id: string) => hub.current?.ready(id) ?? false }) as StreamHub);
  const key = liveIds.join(",");

  useEffect(() => {
    if (!coreUrl || !host.current) return;
    hub.current ??= new StreamHub(coreUrl, host.current);
    hub.current.sync(key ? key.split(",") : []);
  }, [coreUrl, key]);
  useEffect(
    () => () => {
      hub.current?.destroy();
      hub.current = null;
    },
    [],
  );

  return (
    <HubContext.Provider value={proxy}>
      {children}
      <div ref={host} aria-hidden="true" className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0" />
    </HubContext.Provider>
  );
}

/**
 * Image d'un relais, recopiée depuis la vidéo du registre sur un canvas. Reste monté : changer `relayId` ne reconnecte rien.
 * Sans image encore (ou flux coupé) : la dernière image gardée, assombrie d'un voile ; sinon transparent (la mire en dessous).
 * `thumb` : 640x360 et 10 images/s ; sinon 1280x720 à la cadence de l'écran.
 */
export function StreamCanvas({ relayId, thumb = false }: { relayId: string; thumb?: boolean }) {
  const hub = useStreamHub();
  const canvas = useRef<HTMLCanvasElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const idRef = useRef(relayId);
  useEffect(() => {
    idRef.current = relayId;
  });

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx || !hub) return;
    const W = thumb ? 640 : 1280;
    const H = thumb ? 360 : 720;
    cv.width = W;
    cv.height = H;
    let raf = 0;
    let last = 0;
    const step = thumb ? 100 : 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < step) return;
      last = now;
      const e = hub.get(idRef.current);
      if (!e) {
        ctx.clearRect(0, 0, W, H);
        if (veil.current) veil.current.style.opacity = "0";
        return;
      }
      const live = e.playing && e.video.readyState >= 2 && e.video.videoWidth > 0;
      if (live) ctx.drawImage(e.video, 0, 0, W, H);
      else if (e.hasFrame) ctx.drawImage(e.poster, 0, 0, W, H);
      else ctx.clearRect(0, 0, W, H);
      if (veil.current) veil.current.style.opacity = live || !e.hasFrame ? "0" : "1";
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [hub, thumb]);

  return (
    <>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full object-contain" aria-hidden="true" />
      {/* Voile gris léger : le relais vient d'être coupé ou se reconnecte, on montre sa dernière image. */}
      <div ref={veil} aria-hidden="true" className="pointer-events-none absolute inset-0 bg-background/45 opacity-0 transition-opacity duration-300" />
    </>
  );
}
