"use client";

import { useId } from "react";

// Sol filaire : relief à l'horizon, ligne d'horizon, lignes de sol en pointillés et quelques sapins.
// Le tout s'estompe vers la gauche. Repère de la scène (600 × 600 par défaut).

const pine = (horizon: number, x: number, h: number) =>
  `M${x} ${horizon - h}L${x + h * 0.28} ${horizon - h * 0.22}H${x - h * 0.28}ZM${x} ${horizon - h * 0.22}V${horizon}M${x - h * 0.17} ${horizon - h * 0.5}H${x + h * 0.17}`;

const RELIEF = "L-210 362L-150 374L-70 336L10 368L80 352L150 376L230 344L300 366L370 330L440 362L520 348L610 372L700 340";

export default function Ground({
  horizon = 392,
  pines = [
    [56, 44],
    [88, 30],
    [166, 36],
    [596, 26],
  ],
}: {
  horizon?: number;
  pines?: readonly (readonly [number, number])[];
}) {
  const id = useId();
  return (
    <>
      <defs>
        <linearGradient id={`${id}fade`} gradientUnits="userSpaceOnUse" x1="-250" y1="0" x2="120" y2="0">
          <stop offset="0" stopColor="var(--foreground)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--foreground)" stopOpacity="1" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${id}fade)`} strokeWidth={1}>
        <path d={`M-300 ${horizon}${RELIEF}L900 ${horizon}`} strokeOpacity={0.3} />
        <path d={`M-300 ${horizon}H900`} strokeOpacity={0.7} />
        <path d="M-300 440H900M-300 520H900" strokeOpacity={0.12} strokeDasharray="2 8" />
      </g>
      <g stroke="currentColor" strokeWidth={1} strokeOpacity={0.6}>
        {pines.map(([x, h]) => (
          <path key={x} d={pine(horizon, x, h)} />
        ))}
      </g>
    </>
  );
}
