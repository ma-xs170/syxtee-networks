"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { clamp01, lerp, ramp } from "@/components/story/timeline";

// Tri des paquets par le relais : des paquets numérotés arrivent en désordre sur 3 voies (4G, 5G, Wi-Fi)
// puis se rangent chacun dans sa case. Piloté par un progrès local (0 → 1). Repère 600 × 600.

export type SorterPacket = { n: number; lane: number; at: number };

export const LANES = ["4G", "5G", "WI-FI"] as const;

type Layout = { laneY: readonly number[]; laneX: readonly [number, number]; slotY: number; slotX: readonly [number, number] };

export const COMPACT: Layout = { laneY: [396, 426, 456], laneX: [30, 250], slotY: 520, slotX: [300, 560] };

function Packet({ pk, count, p, layout }: { pk: SorterPacket; count: number; p: MotionValue<number>; layout: Layout }) {
  const slotW = (layout.slotX[1] - layout.slotX[0]) / count;
  const tx = layout.slotX[0] + slotW * (pk.n - 1) + slotW / 2;
  const ly = layout.laneY[pk.lane];
  // Voie : de la gauche jusqu'au bout de la voie, puis glisse dans sa case.
  const travel = useTransform(p, (v) => ramp(v, pk.at, pk.at + 0.16));
  const sort = useTransform(p, (v) => ramp(v, pk.at + 0.16, pk.at + 0.26));
  const x = useTransform([travel, sort], ([a, b]: number[]) => lerp(lerp(layout.laneX[0] - 20, layout.laneX[1], a), tx, b) - 9);
  const y = useTransform(sort, (b) => lerp(ly, layout.slotY, b) - 9);
  const opacity = useTransform(p, (v) => clamp01((v - pk.at) / 0.03));
  return (
    <motion.g style={{ x, y, opacity }}>
      <rect width={18} height={18} rx={2.5} fill="var(--background)" />
      <text x={9} y={12.5} textAnchor="middle" fill="var(--foreground)" stroke="none" className="font-mono text-[10px]">
        {pk.n}
      </text>
    </motion.g>
  );
}

function Slot({ i, count, p, filledAt, layout }: { i: number; count: number; p: MotionValue<number>; filledAt: number; layout: Layout }) {
  const slotW = (layout.slotX[1] - layout.slotX[0]) / count;
  const x = layout.slotX[0] + slotW * i + slotW / 2 - 11;
  const fill = useTransform(p, (v) => ramp(v, filledAt, filledAt + 0.03) * 0.14);
  return (
    <g>
      <motion.rect x={x} y={layout.slotY - 11} width={22} height={22} rx={3} fill="var(--foreground)" style={{ fillOpacity: fill }} strokeDasharray="2 3" strokeOpacity={0.5} />
      <text x={x + 11} y={layout.slotY + 26} textAnchor="middle" fill="var(--muted)" stroke="none" className="font-mono text-[9px]">
        {i + 1}
      </text>
    </g>
  );
}

/** Version courte du tri : 6 paquets, 3 voies, une rangée de cases. */
export default function PacketSorter({
  p,
  packets,
  layout = COMPACT,
}: {
  p: MotionValue<number>;
  packets: SorterPacket[];
  layout?: Layout;
}) {
  const count = packets.length;
  const done = useTransform(p, (v) => ramp(v, 0.9, 0.96));
  return (
    <g className="svg-hairline" stroke="currentColor" strokeWidth={1} strokeLinecap="round" fill="none">
      {LANES.map((l, k) => (
        <g key={l}>
          <path d={`M${layout.laneX[0] - 30} ${layout.laneY[k]}H${layout.laneX[1] + 10}`} strokeOpacity={0.2} strokeDasharray="2 5" />
          <text x={layout.laneX[0] - 30} y={layout.laneY[k] - 8} fill="var(--muted)" stroke="none" className="font-mono text-[12px] lg:text-[10px]">
            {l}
          </text>
        </g>
      ))}
      {packets.map((pk) => (
        <Slot key={pk.n} i={pk.n - 1} count={count} p={p} filledAt={pk.at + 0.24} layout={layout} />
      ))}
      {packets.map((pk) => (
        <Packet key={pk.n} pk={pk} count={count} p={p} layout={layout} />
      ))}
      <motion.text
        x={(layout.slotX[0] + layout.slotX[1]) / 2}
        y={layout.slotY + 52}
        textAnchor="middle"
        fill="var(--foreground)"
        stroke="none"
        className="font-mono text-[13px] lg:text-[11px]"
        style={{ opacity: done }}
      >
        FLUX RECONSTITUÉ ✓
      </motion.text>
    </g>
  );
}
