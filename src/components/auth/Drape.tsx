"use client";

import { useEffect, useId, useState } from "react";
import s from "./drape.module.css";

// Fond « drapé » des pages de connexion (visuel maison, aucune image externe) : des pans de soie en niveaux de gris
// qui entrent par le coin haut-droit et le coin bas-gauche, centre noir. Chaque coin = 2 calques SVG qui ondulent
// sur des boucles différentes (21 s / 26 s) ; pause quand l'onglet est caché ; figés en prefers-reduced-motion.
// Le grain (feTurbulence) est un calque fixe à part, pour ne jamais être recalculé pendant l'animation.

/** Pans de soie dans un repère 800 × 600, ancrés au coin haut-droit (800, 0). */
function Silk({ id, variant }: { id: string; variant: "main" | "folds" }) {
  const g = (n: string) => `${id}-${n}`;
  return (
    <svg viewBox="0 0 800 600" className="h-auto w-full" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={g("a")} gradientUnits="userSpaceOnUse" x1="820" y1="0" x2="250" y2="280">
          <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={g("b")} gradientUnits="userSpaceOnUse" x1="820" y1="120" x2="320" y2="440">
          <stop offset="0" stopColor="#fff" stopOpacity="0.42" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={g("c")} gradientUnits="userSpaceOnUse" x1="660" y1="-20" x2="120" y2="140">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* Ombre du pli, en travers du pan : donne le volume de la soie */}
        <linearGradient id={g("shade")} gradientUnits="userSpaceOnUse" x1="560" y1="120" x2="610" y2="230">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={g("glow")} cx="800" cy="0" r="460" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={g("soft")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={g("edge")} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      {variant === "main" ? (
        <>
          <rect x="0" y="0" width="800" height="600" fill={`url(#${g("glow")})`} />
          <g filter={`url(#${g("soft")})`}>
            <path d="M840 -80C640 40 470 150 180 230C330 300 600 300 840 200Z" fill={`url(#${g("a")})`} />
            <path d="M840 -80C640 40 470 150 180 230C330 300 600 300 840 200Z" fill={`url(#${g("shade")})`} />
            <path d="M840 180C700 280 560 370 360 460C520 480 690 420 840 350Z" fill={`url(#${g("b")})`} />
          </g>
        </>
      ) : (
        <>
          <g filter={`url(#${g("soft")})`}>
            <path d="M620 -60C520 30 390 88 110 122C260 158 470 130 690 -20Z" fill={`url(#${g("c")})`} />
          </g>
          {/* Arêtes des plis, fines et lumineuses */}
          <g filter={`url(#${g("edge")})`} strokeLinecap="round">
            <path d="M830 -10C640 110 480 200 200 238" stroke="#fff" strokeOpacity="0.4" strokeWidth="1.8" />
            <path d="M830 200C690 296 560 380 380 454" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.4" />
            <path d="M650 -30C540 50 400 98 140 124" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.2" />
          </g>
        </>
      )}
    </svg>
  );
}

function Grain({ id }: { id: string }) {
  return (
    <svg className="pointer-events-none fixed inset-0 h-full w-full opacity-[0.07] mix-blend-overlay" aria-hidden="true">
      <filter id={`${id}-grain`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id}-grain)`} />
    </svg>
  );
}

export default function Drape() {
  const id = useId().replace(/:/g, "");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  return (
    <div className={`pointer-events-none fixed inset-0 overflow-hidden ${hidden ? s.paused : ""}`} aria-hidden="true">
      <div className={`${s.layer} ${s.topRight}`}>
        <Silk id={`${id}-tr1`} variant="main" />
      </div>
      <div className={`${s.layer} ${s.layerAlt} ${s.topRight}`}>
        <Silk id={`${id}-tr2`} variant="folds" />
      </div>
      {/* Coin bas-gauche : mêmes pans, retournés (rotation 180°) */}
      <div className={`${s.layer} ${s.layerAlt} ${s.bottomLeft}`}>
        <div className="rotate-180">
          <Silk id={`${id}-bl1`} variant="main" />
        </div>
      </div>
      <div className={`${s.layer} ${s.bottomLeft}`}>
        <div className="rotate-180">
          <Silk id={`${id}-bl2`} variant="folds" />
        </div>
      </div>
      <Grain id={id} />
    </div>
  );
}
