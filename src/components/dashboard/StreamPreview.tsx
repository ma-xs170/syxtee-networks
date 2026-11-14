"use client";

import { useEffect, useRef, useState } from "react";
import { activeWorkspace, coreToken } from "./coreClient";

// Aperçu : le flux du relais en vidéo, en direct (MPEG-TS remuxé par le Core, lu avec mpegts.js).
// Réservé au propriétaire du flux. Muet par défaut (lecture automatique), reconnexion toutes les 3 s hors ligne.

type State = "connecting" | "playing" | "offline" | "unsupported";

/** `flush` : sans cadre ni arrondi, collé aux bords de son panneau. `compact` : vidéo seule, sans cadre ni boutons (vignette animée d'une grille). `fullControl` : plein écran piloté de l'extérieur (bouton placé à côté de l'aperçu) ; le bouton interne disparaît. */
export default function StreamPreview({ coreUrl, relayId, fullControl, compact, flush }: { coreUrl: string; relayId: string; compact?: boolean; flush?: boolean; fullControl?: { full: boolean; setFull: (v: boolean) => void } }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>("connecting");
  const [muted, setMuted] = useState(true);
  const [detail, setDetail] = useState("Connexion au service SYXTEE…"); // étape en cours, affichée sous le logo pendant le chargement
  const box = useRef<HTMLDivElement>(null);
  const [fullLocal, setFullLocal] = useState(false);
  const full = fullControl ? fullControl.full : fullLocal;
  const setFull = fullControl ? fullControl.setFull : setFullLocal;

  // Plein écran : l'API du navigateur quand elle existe (Android, ordinateur, iPad), sinon (iPhone) la vidéo prend toute la fenêtre.
  // Paysage demandé quand c'est possible ; Échap ou la croix referment ; la page derrière ne défile plus.
  useEffect(() => {
    if (!full) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    void box.current?.requestFullscreen?.().catch(() => {});
    void (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape").catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    const onChange = () => !document.fullscreenElement && setFull(false);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      root.style.overflow = before;
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onChange);
      screen.orientation?.unlock?.();
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, [full, setFull]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let player: import("mpegts.js").default.Player | null = null;

    const teardown = () => {
      if (!player) return;
      const p = player;
      player = null;
      p.pause();
      p.unload();
      p.detachMediaElement();
      p.destroy();
    };
    const again = () => {
      teardown();
      if (stopped) return;
      setDetail("Flux hors ligne : nouvelle tentative dans 3 s…");
      setState("offline");
      retry = setTimeout(start, 3000);
    };
    const onPlaying = () => setState("playing");
    el.addEventListener("playing", onPlaying);

    async function start() {
      if (stopped) return;
      if (document.visibilityState !== "visible") {
        retry = setTimeout(start, 3000);
        return;
      }
      try {
        setDetail("Connexion au service SYXTEE…");
        const { default: mpegts } = await import("mpegts.js");
        if (!mpegts.isSupported()) return setState("unsupported");
        setDetail("Authentification de ta session…");
        const token = await coreToken();
        if (stopped) return;
        setDetail("Ouverture du flux vidéo…");
        mpegts.LoggingControl.enableAll = false;
        const p = mpegts.createPlayer(
          { type: "mpegts", isLive: true, url: `${coreUrl}/v1/me/relays/${relayId}/live.ts` },
          {
            headers: { Authorization: `Bearer ${token}`, ...(activeWorkspace() ? { "X-Syxtee-Workspace": activeWorkspace()! } : {}) },
            enableWorker: true,
            enableStashBuffer: false,
            liveSync: true,
            liveSyncMaxLatency: 1.5,
            liveSyncTargetLatency: 0.6,
            autoCleanupSourceBuffer: true,
          },
        );
        player = p;
        p.on(mpegts.Events.ERROR, again);
        p.on(mpegts.Events.LOADING_COMPLETE, again);
        p.on(mpegts.Events.MEDIA_INFO, () => setDetail("Réception de la vidéo…"));
        p.attachMediaElement(el!);
        p.load();
        setDetail("En attente des premières images…");
        await Promise.resolve(p.play()).catch(() => {});
      } catch {
        again();
      }
    }

    // Onglet masqué : on coupe (pas de débit pour rien), on reprend au retour.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (retry) clearTimeout(retry);
        teardown();
        setDetail("Connexion au service SYXTEE…");
        setState("connecting");
      } else if (!player) {
        if (retry) clearTimeout(retry);
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      document.removeEventListener("visibilitychange", onVisibility);
      el.removeEventListener("playing", onPlaying);
      teardown();
    };
  }, [coreUrl, relayId]);

  const loading = state === "connecting" || state === "offline";

  return (
    <section className={compact ? "absolute inset-0" : flush ? "overflow-hidden" : "overflow-hidden rounded-2xl border border-line"} aria-label="Aperçu du flux">
      <div ref={box} className={full ? "fixed inset-0 z-[60] h-dvh w-screen bg-black" : compact ? "relative h-full w-full" : "relative aspect-video bg-black"}>
        <video
          ref={video}
          muted={muted}
          playsInline
          autoPlay
          {...(fullControl && !full && state === "playing" ? { role: "button", tabIndex: 0, onClick: () => setFull(true), onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && setFull(true) } : {})}
          className={`h-full w-full ${compact ? "object-cover" : "object-contain"} ${fullControl && !full ? "cursor-zoom-in" : ""} ${state === "playing" ? "" : "invisible"}`}
          aria-label={fullControl && !full ? "Aperçu de ton flux, ouvrir en plein écran" : "Aperçu de ton flux"}
        />
        {state === "unsupported" && !compact && <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted">Ce navigateur ne lit pas l&apos;aperçu vidéo. Essaie Chrome, Firefox ou Safari à jour.</p>}
        {loading && !compact && (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center px-6">
            <div className="flex flex-1 items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-400.png" alt="" width={44} height={62} className="h-14 w-auto animate-pulse brightness-0 invert motion-reduce:animate-none" />
            </div>
            <div className="pb-5 text-center">
              <p className="text-sm font-medium text-white">Connexion en cours</p>
              <p className="mt-1 font-mono text-[11px] text-white/60">{detail}</p>
            </div>
          </div>
        )}
        {state === "playing" && !compact && (
          <>
            <span className={`absolute flex items-center gap-1.5 rounded bg-black/75 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white ${full ? "left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))]" : "left-3 top-3"}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-bad" aria-hidden="true" />
              Direct
            </span>
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className={`absolute flex items-center rounded bg-black/75 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-black ${full ? "bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))]" : "bottom-3 right-3"}`}
              aria-pressed={!muted}
            >
              {muted ? "Activer le son" : "Couper le son"}
            </button>
            {(!fullControl || full) && <button
              type="button"
              onClick={() => setFull(!full)}
              className={`absolute flex items-center rounded bg-black/75 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-black ${full ? "right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))]" : "bottom-3 left-3"}`}
            >
              {full ? "Fermer" : "Plein écran"}
            </button>}
          </>
        )}
      </div>
    </section>
  );
}
