"use client";

import { useId } from "react";
import { motion, useMotionValue, useTransform, type MotionValue } from "motion/react";

// Ce que filme le téléphone : un coucher de soleil sur une plage des Antilles, en aplats doux de gris et de bleu nuit.
// C'est la seule partie « pleine » du site. Vagues qui ondulent et nuages qui glissent (CSS, coupés en reduced-motion).
// `tunnel` (0 → 1) fait passer le paysage derrière un tunnel filaire (la 4G chute).
// Se dessine dans le rectangle (0, 0, w, h).

const C = {
  skyTop: "#0a0f1f",
  skyMid: "#18213c",
  skyLow: "#3b4563",
  sun: "#c9cdd8",
  sea: "#0f1629",
  seaLight: "#2a3453",
  sand: "#1b2236",
  palm: "#05070e",
  cloud: "#27304c",
};

export default function ScreenLandscape({ w, h, tunnel }: { w: number; h: number; tunnel?: MotionValue<number> }) {
  const id = useId();
  // Taille des détails : la hauteur en paysage, la largeur (ramenée au format paysage) en portrait.
  const base = Math.min(w / 2.16, h);
  const horizon = h * 0.58;
  const sand = h * 0.82;
  const none = useMotionValue(0);
  const tunnelO = tunnel ?? none;
  const dark = useTransform(tunnelO, (t) => t * 0.72);
  const wave = (y: number, amp: number, step: number) => {
    let d = `M${-step * 2} ${y}`;
    for (let x = -step * 2; x < w + step * 2; x += step) d += `q${step / 2} ${-amp} ${step} 0`;
    return d;
  };
  const palm = (x: number, s: number, flip = 1) =>
    `M${x} ${sand + 4}q${6 * s * flip} ${-60 * s} ${2 * s * flip} ${-118 * s}` +
    [-1, -0.4, 0.3, 1].map((k) => `M${x + 2 * s * flip} ${sand - 114 * s}q${30 * k * s} ${-18 * s} ${52 * k * s} ${10 * s}`).join("");

  return (
    <g>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.skyTop} />
          <stop offset="0.6" stopColor={C.skyMid} />
          <stop offset="1" stopColor={C.skyLow} />
        </linearGradient>
        <radialGradient id={`${id}sun`}>
          <stop offset="0" stopColor={C.sun} stopOpacity="0.9" />
          <stop offset="0.35" stopColor={C.sun} stopOpacity="0.35" />
          <stop offset="1" stopColor={C.sun} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}clip`}>
          <rect width={w} height={h} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}clip)`}>
        <rect width={w} height={horizon} fill={`url(#${id}sky)`} />
        {/* Soleil bas sur l'horizon */}
        <circle cx={w * 0.66} cy={horizon} r={base * 0.34} fill={`url(#${id}sun)`} />
        <circle cx={w * 0.66} cy={horizon} r={base * 0.075} fill={C.sun} opacity={0.85} />
        {/* Nuages qui glissent */}
        <g className="cloud-drift" fill={C.cloud}>
          <rect x={w * 0.08} y={h * 0.16} width={w * 0.22} height={base * 0.035} rx={base * 0.018} />
          <rect x={w * 0.14} y={h * 0.13} width={w * 0.12} height={base * 0.035} rx={base * 0.018} />
          <rect x={w * 0.52} y={h * 0.26} width={w * 0.18} height={base * 0.03} rx={base * 0.015} opacity={0.8} />
          <rect x={w * 0.8} y={h * 0.12} width={w * 0.14} height={base * 0.03} rx={base * 0.015} opacity={0.7} />
        </g>
        {/* Mer et vagues */}
        <rect y={horizon} width={w} height={sand - horizon} fill={C.sea} />
        <rect x={w * 0.56} y={horizon} width={w * 0.2} height={sand - horizon} fill={C.sun} opacity={0.06} />
        <g fill="none" stroke={C.seaLight} strokeLinecap="round">
          <path d={wave(horizon + (sand - horizon) * 0.25, 2, w / 14)} strokeWidth={1.5} className="sea-drift" />
          <path d={wave(horizon + (sand - horizon) * 0.55, 3, w / 10)} strokeWidth={2} className="sea-drift" style={{ animationDelay: "-2s" }} />
          <path d={wave(sand - 3, 4, w / 8)} strokeWidth={2.5} stroke={C.sun} strokeOpacity={0.25} className="sea-drift" style={{ animationDelay: "-4s" }} />
        </g>
        {/* Plage */}
        <path d={`M0 ${sand}Q${w * 0.5} ${sand - h * 0.03} ${w} ${sand + h * 0.02}V${h}H0Z`} fill={C.sand} />
        {/* Palmiers en silhouette */}
        <g stroke={C.palm} strokeLinecap="round" fill="none">
          <path d={palm(w * 0.12, base / 260)} strokeWidth={base * 0.018} />
          <path d={palm(w * 0.2, base / 380, -1)} strokeWidth={base * 0.013} />
          <path d={palm(w * 0.93, base / 300, -1)} strokeWidth={base * 0.016} />
        </g>

        {/* Tunnel filaire : le paysage passe derrière, la 4G chute */}
        <motion.rect width={w} height={h} fill="#000" style={{ opacity: dark }} />
        <motion.g style={{ opacity: tunnelO }} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.25}>
          {[0, 1, 2, 3].map((k) => {
            const inset = k * w * 0.07;
            const top = h * 0.12 + k * h * 0.08;
            return <path key={k} d={`M${inset} ${h}V${top + h * 0.22}Q${w / 2} ${top - h * 0.16} ${w - inset} ${top + h * 0.22}V${h}`} strokeOpacity={0.55 - k * 0.1} />;
          })}
          <path d={`M0 ${h}L${w * 0.3} ${h * 0.62}M${w} ${h}L${w * 0.7} ${h * 0.62}`} strokeDasharray="3 5" />
        </motion.g>
      </g>
    </g>
  );
}
