"use client";

import { useEffect, useRef, useState } from "react";
import { coreToken } from "./coreClient";

// Aperçu : le flux du relais en vidéo, en direct (MPEG-TS remuxé par le Core, lu avec mpegts.js).
// Réservé au propriétaire du flux. Muet par défaut (lecture automatique), reconnexion toutes les 3 s hors ligne.

type State = "connecting" | "playing" | "offline" | "unsupported";

export default function StreamPreview({ coreUrl, relayId }: { coreUrl: string; relayId: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>("connecting");
  const [muted, setMuted] = useState(true);

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
        const { default: mpegts } = await import("mpegts.js");
        if (!mpegts.isSupported()) return setState("unsupported");
        const token = await coreToken();
        if (stopped) return;
        mpegts.LoggingControl.enableAll = false;
        const p = mpegts.createPlayer(
          { type: "mpegts", isLive: true, url: `${coreUrl}/v1/me/relays/${relayId}/live.ts` },
          {
            headers: { Authorization: `Bearer ${token}` },
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
        p.attachMediaElement(el!);
        p.load();
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

  const message =
    state === "unsupported"
      ? "Ce navigateur ne lit pas l'aperçu vidéo. Essaie Chrome, Firefox ou Safari à jour."
      : state === "offline"
        ? "L'aperçu apparaît dès que ton flux est en ligne."
        : state === "connecting"
          ? "Connexion au flux…"
          : null;

  return (
    <section className="overflow-hidden rounded-2xl border border-line" aria-labelledby="apercu">
      <h2 id="apercu" className="sr-only">
        Aperçu du flux
      </h2>
      <div className="relative aspect-video bg-black">
        <video ref={video} muted={muted} playsInline autoPlay className={`h-full w-full object-contain ${state === "playing" ? "" : "invisible"}`} aria-label="Aperçu de ton flux" />
        {message && <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted">{message}</p>}
        {state === "playing" && (
          <>
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded bg-black/75 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-live" aria-hidden="true" />
              Direct
            </span>
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-black"
              aria-pressed={!muted}
            >
              {muted ? "Activer le son" : "Couper le son"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
