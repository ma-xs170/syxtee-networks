"use client";

import { useEffect, useRef, useState } from "react";

// Fond du hero : vraies images de terrain (scène, public, soirée) en fondu enchaîné.
// Une seule vidéo joue à la fois ; les autres attendent en pause (poster visible). Sous prefers-reduced-motion : images fixes.
const CLIPS = ["scene", "public", "soiree"] as const;
const HOLD_MS = 7000;

export default function HeroVideo({ children }: { children?: React.ReactNode }) {
  const [active, setActive] = useState(0);
  const [still, setStill] = useState(false);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setStill(mq.matches);
    const on = () => setStill(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (still) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % CLIPS.length), HOLD_MS);
    return () => window.clearInterval(id);
  }, [still]);

  useEffect(() => {
    refs.current.forEach((v, i) => {
      if (!v) return;
      if (still || i !== active) {
        // laisse finir le fondu avant de mettre en pause
        window.setTimeout(() => { if (i !== active) v.pause(); }, 1400);
      } else {
        v.currentTime = 0;
        void v.play().catch(() => {});
      }
    });
  }, [active, still]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-background">
      {/* Aberration chromatique : le rouge part à gauche, le bleu à droite (filtre SVG), vert au centre. */}
      <svg width="0" height="0" className="absolute" focusable="false">
        <filter id="hero-ca" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feOffset in="r" dx="-3" dy="0" result="ro" />
          <feOffset in="b" dx="3" dy="0" result="bo" />
          <feBlend in="ro" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="bo" mode="screen" />
        </filter>
      </svg>
      <div className="absolute -inset-2" style={{ filter: "url(#hero-ca)" }}>
        {CLIPS.map((c, i) => (
          <video
            key={c}
            ref={(el) => { refs.current[i] = el; }}
            className={`absolute inset-0 size-full object-cover transition-opacity duration-[1400ms] ease-in-out motion-reduce:transition-none ${i === active ? "opacity-100" : "opacity-0"}`}
            poster={`/videos/hero-${c}.jpg`}
            muted
            loop
            playsInline
            preload={i === 0 ? "auto" : "none"}
            autoPlay={i === 0 && !still}
          >
            <source src={`/videos/hero-${c}.webm`} type="video/webm" />
            <source src={`/videos/hero-${c}.mp4`} type="video/mp4" />
          </video>
        ))}
      </div>
      {/* Le chat s'insère ici : sous le voile, l'ombre et la trame, pour paraître incrusté dans la vidéo. */}
      {children}
      {/* Assombrit pour la lisibilité, creuse les bords (ombre) et fond le bas vers la page */}
      <div className="absolute inset-0 bg-background/40" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 45%, color-mix(in srgb, var(--background) 62%, transparent) 100%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }} />
      {/* Grain de pellicule, par-dessus le tout */}
      <div className="film-grain" />
      {/* Trame de petits pixels + lignes de balayage */}
      <div className="absolute inset-0 opacity-70 mix-blend-multiply" style={{ backgroundImage: "linear-gradient(to right, rgba(0,0,0,.7) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.7) 1px, transparent 1px)", backgroundSize: "2px 2px" }} />
    </div>
  );
}
