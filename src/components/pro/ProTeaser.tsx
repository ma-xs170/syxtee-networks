"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/components/story/StoryContext";
import Highlight from "@/components/ui/Highlight";
import TeaserStill from "./TeaserStill";
import type { TeaserEls } from "./TeaserScene3D";

// Teaser SYXTEE PRO en tête d'accueil : une « vidéo » en boucle (scène 3D en squelette), sans scroll-jacking.
// La scène n'est chargée que côté client, et tourne seulement quand le bloc est à l'écran et l'onglet visible.
// Sans WebGL ou en prefers-reduced-motion : image fixe filaire du plan 5 (silhouette).

const TeaserScene3D = dynamic(() => import("./TeaserScene3D"), { ssr: false, loading: () => null });

let webglCache: boolean | undefined;
function hasWebGL() {
  if (webglCache === undefined) {
    try {
      const c = document.createElement("canvas");
      webglCache = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webglCache = false;
    }
  }
  return webglCache;
}
const noop = () => () => {};
const useWebGL = () => useSyncExternalStore(noop, hasWebGL, () => false);

/** Vrai quand le bloc est (même en partie) à l'écran et que l'onglet est visible. */
function usePlaying(ref: React.RefObject<HTMLElement | null>) {
  const [onScreen, setOnScreen] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    const onVis = () => setVisible(document.visibilityState === "visible");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ref]);
  return onScreen && visible;
}

export default function ProTeaser() {
  const section = useRef<HTMLElement>(null);
  const playing = usePlaying(section);
  const webgl = useWebGL();
  const reduced = useReducedMotion();
  const live = webgl && !reduced;

  // Calques HTML animés par la scène 3D, image par image
  const ui = useRef<TeaserEls>({ fade: null, glow: null, timecode: null, label: null, labelText: null });

  return (
    <section
      ref={section}
      id="syxtee-pro"
      aria-label="SYXTEE PRO, le sac encodeur IRL"
      className="relative h-[calc(100svh-4rem)] min-h-[520px] overflow-hidden border-b border-line bg-background"
    >
      {/* Image : contre-jour, scène 3D ou image fixe */}
      <div ref={(el) => void (ui.current.glow = el)} style={{ opacity: live ? 0 : 1 }} className="teaser-glow pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-0" aria-hidden="true">
        {live ? <TeaserScene3D active={playing} ui={ui} /> : <TeaserStill />}
      </div>

      {live && (
        <>
          <div
            ref={(el) => void (ui.current.label = el)}
            style={{ opacity: 0 }}
            className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full border border-accent/35 bg-background/80 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-foreground sm:text-[11px]"
            aria-hidden="true"
          >
            <span ref={(el) => void (ui.current.labelText = el)} />
            <span className="teaser-caret">_</span>
          </div>
          <div ref={(el) => void (ui.current.fade = el)} className="pointer-events-none absolute inset-0 bg-background" aria-hidden="true" />
        </>
      )}

      {/* Effets « vidéo » : grain, ligne de scan, bandes cinéma (desktop), timecode */}
      <div className="teaser-grain pointer-events-none absolute" aria-hidden="true" />
      {live && <div className="teaser-scan pointer-events-none absolute inset-x-0 top-0 h-px bg-accent/[0.12]" aria-hidden="true" />}
      <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-[7%] bg-background lg:block" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[7%] bg-background lg:block" aria-hidden="true" />

      {/* Texte, en bas à gauche sur un dégradé noir */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/70 to-transparent" aria-hidden="true" />
      <span
        ref={(el) => void (ui.current.timecode = el)}
        className="pointer-events-none absolute right-4 top-4 font-mono text-[11px] tabular-nums tracking-[0.12em] text-foreground/45 sm:right-6 lg:bottom-[calc(3.5%-0.5em)] lg:top-auto"
        aria-hidden="true"
      >
        00:00:00:00
      </span>
      <div className="absolute inset-x-0 bottom-0 pb-10 sm:pb-14 lg:pb-[calc(7%+2.5rem)]">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <p className="inline-flex items-center rounded-full border border-line bg-accent/[0.08] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground sm:text-[11px]">
            Nouveau · Bientôt disponible
          </p>
          <h2 className="mt-5 text-5xl font-semibold leading-none tracking-tight sm:text-7xl">SYXTEE PRO</h2>
          <p className="mt-4 text-xl text-muted sm:text-2xl">
            Le live pro. <Highlight>Partout.</Highlight>
          </p>
          <Link
            href="/pro"
            className="group mt-8 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-5 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98]"
          >
            Découvrir
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
