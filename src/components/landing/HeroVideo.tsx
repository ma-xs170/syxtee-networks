"use client";

import { useEffect, useRef, useState } from "react";

// Fond du hero : vraies images de terrain (saut en parachute, scène, public, soirée) en fondu enchaîné.
// Une seule vidéo joue à la fois ; les autres attendent en pause (poster visible). Sous prefers-reduced-motion : images fixes.
const CLIPS = ["parachute", "scene", "public", "soiree"] as const;
const HOLD_MS = 7000;

export default function HeroVideo() {
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
      {/* Assombrit pour la lisibilité, creuse les bords (ombre) et fond le bas vers la page */}
      <div className="absolute inset-0 bg-background/55" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 35%, color-mix(in srgb, var(--background) 85%, transparent) 100%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }} />
      {/* Trame de petits pixels + lignes de balayage */}
      <div className="absolute inset-0 opacity-60 mix-blend-multiply" style={{ backgroundImage: "linear-gradient(to right, rgba(0,0,0,.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.55) 1px, transparent 1px)", backgroundSize: "3px 3px" }} />
    </div>
  );
}
