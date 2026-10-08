"use client";

import { useState, type ReactNode } from "react";

// Vue de l'icône « verre 3D » (composant client, utilisable partout, y compris dans la navigation) : carré arrondi (22 % de rayon), fond sombre dégradé, objet chromé avec reflets, ombre intérieure, bord lumineux.
// Générée en SVG + CSS. Si `public/glass-icons/<name>.(webp|png)` existe, ce rendu 3D la remplace. Flottement lent, reflet qui suit la souris (voir Glow).
export type GlassName = "obs-cloud" | "relay" | "encoder" | "shared" | "health" | "map" | "docs" | "community";

const S = { stroke: "url(#gi-chrome)", strokeWidth: 3.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
const GLYPH: Record<GlassName, ReactNode> = {
  "obs-cloud": (
    <>
      <path d="M32 64a14 14 0 0 1 2-27.8A18 18 0 0 1 69 40a12 12 0 0 1 1 24Z" {...S} fill="url(#gi-fill)" />
      <circle cx="50" cy="52" r="6" {...S} />
    </>
  ),
  relay: (
    <>
      <circle cx="50" cy="52" r="7" fill="url(#gi-chrome)" />
      <path d="M36 38a20 20 0 0 0 0 28M64 38a20 20 0 0 1 0 28M26 30a32 32 0 0 0 0 44M74 30a32 32 0 0 1 0 44" {...S} />
    </>
  ),
  encoder: (
    <>
      <rect x="24" y="38" width="52" height="28" rx="7" {...S} fill="url(#gi-fill)" />
      <circle cx="62" cy="52" r="3" fill="var(--ok)" />
      <path d="M34 52h16" {...S} />
    </>
  ),
  shared: (
    <>
      <circle cx="40" cy="42" r="9" {...S} fill="url(#gi-fill)" />
      <circle cx="62" cy="46" r="7" {...S} />
      <path d="M24 70c2-10 8-14 16-14s14 4 16 14M56 68c1-6 5-9 10-9s8 3 10 9" {...S} />
    </>
  ),
  health: <path d="M20 54h14l8-20 12 36 8-16h18" {...S} />,
  map: (
    <>
      <path d="M50 26a14 14 0 0 1 14 14c0 12-14 26-14 26S36 52 36 40a14 14 0 0 1 14-14Z" {...S} fill="url(#gi-fill)" />
      <circle cx="50" cy="40" r="4.5" fill="url(#gi-chrome)" />
      <path d="M30 70h40" {...S} opacity="0.6" />
    </>
  ),
  docs: (
    <>
      <path d="M33 26h24l12 12v36H33Z" {...S} fill="url(#gi-fill)" />
      <path d="M57 26v12h12M41 50h20M41 60h14" {...S} />
    </>
  ),
  community: (
    <>
      <path d="M23 29h48a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H45l-12 10V63H23a6 6 0 0 1-6-6V35a6 6 0 0 1 6-6Z" {...S} fill="url(#gi-fill)" />
      <path d="M33 45h28M33 54h18" {...S} />
    </>
  ),
};

export default function GlassIconView({ name, size = 72, float = true, className = "", src }: { name: GlassName; size?: number; float?: boolean; className?: string; src?: string | null }) {
  const [failed, setFailed] = useState(false);
  const file = src && !failed ? src : null;
  return (
    <span aria-hidden="true" style={{ width: size, height: size }} className={`glass-tile relative inline-flex shrink-0 ${float ? "glass-float" : ""} ${className}`}>
      {file ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={file} alt="" width={size} height={size} onError={() => setFailed(true)} className="h-full w-full object-contain" />
      ) : (
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="gi-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#26262a" />
              <stop offset="1" stopColor="#0a0a0b" />
            </linearGradient>
            <linearGradient id="gi-chrome" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.45" stopColor="#9a9aa2" />
              <stop offset="0.7" stopColor="#e8e8ec" />
              <stop offset="1" stopColor="#6a6a72" />
            </linearGradient>
            <linearGradient id="gi-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.02" />
            </linearGradient>
            <radialGradient id="gi-light" cx="50%" cy="38%" r="55%">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <filter id="gi-blur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          <rect x="1" y="1" width="98" height="98" rx="22" fill="url(#gi-bg)" stroke="#ffffff" strokeOpacity="0.16" />
          <rect x="1" y="1" width="98" height="98" rx="22" fill="url(#gi-light)" />
          <g filter="url(#gi-blur)" opacity="0.45">{GLYPH[name]}</g>
          <g>{GLYPH[name]}</g>
          <path d="M8 24a16 16 0 0 1 16-16h52" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )}
      <span className="glass-sheen pointer-events-none absolute inset-0 rounded-[22%]" />
    </span>
  );
}
