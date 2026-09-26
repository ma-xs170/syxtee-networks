"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { band, clamp01, lerp, ramp } from "@/components/story/timeline";

// Scène clé de /relais : le tri des paquets. Piloté par le progrès local `s` (0 → 1) et une horloge `time`.
// 1. Des paquets numérotés arrivent sur 3 voies (4G lente, 5G rapide, Wi-Fi entre les deux) : ils arrivent en désordre
//    et se rangent chacun dans sa case de la grille.
// 2. Le paquet 7 se perd sur la 4G : sa case clignote, un NAK repart vers la gauche, le 7 revient par la 5G.
// 3. Une barre de buffer se remplit (latence réglable).
// 4. La 4G coupe (SIGNAL PERDU) : la 5G et le Wi-Fi accélèrent, la grille reste pleine.
// Repère 600 × 600.

export const LANES = [
  { label: "4G", y: 190, dur: 0.22 },
  { label: "5G", y: 240, dur: 0.12 },
  { label: "WI-FI", y: 290, dur: 0.16 },
] as const;
const LANE_X = [16, 236] as const;
const SLOT = { x0: 262, y: 240, size: 22, step: 26 };
const slotX = (n: number) => SLOT.x0 + (n - 1) * SLOT.step + SLOT.size / 2;
const BUFFER = { x0: SLOT.x0, x1: SLOT.x0 + 12 * SLOT.step - 4, y: 300 };

// Paquets 1 à 12 : voie et instant de départ. Le 7 part sur la 4G et se perd ; il revient par la 5G.
type Pk = { n: number; lane: 0 | 1 | 2; at: number; lost?: boolean };
const PACKETS: Pk[] = [
  { n: 1, lane: 1, at: 0 },
  { n: 2, lane: 2, at: 0.02 },
  { n: 3, lane: 0, at: 0 },
  { n: 4, lane: 1, at: 0.06 },
  { n: 5, lane: 2, at: 0.08 },
  { n: 6, lane: 1, at: 0.12 },
  { n: 7, lane: 0, at: 0.1, lost: true },
  { n: 8, lane: 2, at: 0.14 },
  { n: 9, lane: 1, at: 0.18 },
  { n: 10, lane: 0, at: 0.16 },
  { n: 11, lane: 2, at: 0.2 },
  { n: 12, lane: 1, at: 0.24 },
];
const RESEND: Pk = { n: 7, lane: 1, at: 0.4 };
const SETTLE = 0.05;

/** Instant où un paquet atteint sa case. */
const landsAt = (pk: Pk) => pk.at + LANES[pk.lane].dur + SETTLE;

function Packet({ pk, s }: { pk: Pk; s: MotionValue<number> }) {
  const lane = LANES[pk.lane];
  const travel = useTransform(s, (v) => clamp01((v - pk.at) / lane.dur));
  const settle = useTransform(s, (v) => ramp(v, pk.at + lane.dur, pk.at + lane.dur + SETTLE));
  const x = useTransform([travel, settle], ([a, b]: number[]) => lerp(lerp(LANE_X[0], LANE_X[1], a), slotX(pk.n), b) - 9);
  const y = useTransform(settle, (b) => lerp(lane.y, SLOT.y, b) - 9);
  // Le paquet perdu s'éteint au milieu de la 4G.
  const opacity = useTransform(s, (v) => (pk.lost ? band(v, pk.at, pk.at + 0.01, pk.at + lane.dur * 0.45, pk.at + lane.dur * 0.55) : ramp(v, pk.at, pk.at + 0.01)));
  return (
    <motion.g style={{ x, y, opacity }}>
      <rect width={18} height={18} rx={2.5} fill="#000" />
      <text x={9} y={12.5} textAnchor="middle" fill="var(--foreground)" stroke="none" className="font-mono text-[10px]">
        {pk.n}
      </text>
    </motion.g>
  );
}

function Slot({ n, s }: { n: number; s: MotionValue<number> }) {
  const pk = n === 7 ? RESEND : PACKETS[n - 1];
  const filled = useTransform(s, (v) => ramp(v, landsAt(pk) - 0.01, landsAt(pk)) * 0.16);
  const x = slotX(n) - SLOT.size / 2;
  return (
    <g>
      <motion.rect x={x} y={SLOT.y - SLOT.size / 2} width={SLOT.size} height={SLOT.size} rx={3} fill="#fff" strokeDasharray="2 3" strokeOpacity={0.5} style={{ fillOpacity: filled }} />
      <text x={slotX(n)} y={SLOT.y + 26} textAnchor="middle" fill="var(--muted)" stroke="none" className="font-mono text-[9px]">
        {n}
      </text>
    </g>
  );
}

/** Flux continu (non numéroté) sur une voie, à partir d'un certain moment. La 4G s'arrête quand elle coupe. */
function Stream({ lane, s, time, from, cut }: { lane: 0 | 1 | 2; s: MotionValue<number>; time: MotionValue<number>; from: number; cut: MotionValue<number> }) {
  const l = LANES[lane];
  const on = useTransform([s, cut], ([v, c]: number[]) => ramp(v, from, from + 0.03) * (lane === 0 ? 1 - c : 1));
  return (
    <motion.g style={{ opacity: on }}>
      {[0, 1, 2, 3].map((k) => (
        <StreamDot key={k} k={k} lane={l} lanes={lane} time={time} cut={cut} />
      ))}
    </motion.g>
  );
}

function StreamDot({ k, lane, lanes, time, cut }: { k: number; lane: (typeof LANES)[number]; lanes: number; time: MotionValue<number>; cut: MotionValue<number> }) {
  // Vitesse de base selon la voie ; après la coupure de la 4G, les deux autres accélèrent (× 1,7).
  const speed = 0.12 / lane.dur;
  const x = useTransform([time, cut], ([t, c]: number[]) => {
    const boost = lanes === 0 ? 1 : 1 + 0.7 * c;
    const u = (t * speed * 0.55 * boost + k / 4) % 1;
    return lerp(LANE_X[0], LANE_X[1], u) - 4;
  });
  return <motion.rect x={x} y={lane.y - 4} width={8} height={8} rx={1.5} fill="#fff" stroke="none" opacity={0.85} />;
}

export default function SortingScene({ s, time, latencyMs = 2000 }: { s: MotionValue<number>; time: MotionValue<number>; latencyMs?: number }) {
  // Paquet 7 : case qui clignote, NAK, renvoi.
  const missing = useTransform(s, (v) => band(v, 0.3, 0.32, landsAt(RESEND) - 0.01, landsAt(RESEND)));
  const nakDraw = useTransform(s, (v) => ramp(v, 0.33, 0.4));
  const nakO = useTransform(s, (v) => band(v, 0.33, 0.35, 0.44, 0.48));
  const nakHead = useTransform(nakDraw, (d) => ramp(d, 0.9, 1));
  // Buffer
  const buffer = useTransform(s, (v) => ramp(v, 0.02, 0.55));
  const bufferW = useTransform(buffer, (b) => (BUFFER.x1 - BUFFER.x0) * b);
  // Coupure de la 4G
  const cut = useTransform(s, (v) => ramp(v, 0.62, 0.66));
  const laneSolid = useTransform(cut, (c) => 1 - c);
  const full = useTransform(s, (v) => ramp(v, 0.7, 0.76));
  const boostO = useTransform(s, (v) => ramp(v, 0.68, 0.72));

  const nakPath = `M${slotX(7)} ${SLOT.y - 16}C${slotX(7)} 140 200 130 ${LANE_X[0] + 60} 150`;

  return (
    <g className="svg-hairline" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" fill="none">
      {/* Voies */}
      {LANES.map((l, k) => (
        <g key={l.label}>
          {k === 0 ? (
            <>
              <motion.path d={`M${LANE_X[0]} ${l.y}H${LANE_X[1] + 12}`} strokeOpacity={0.35} style={{ opacity: laneSolid }} />
              <motion.path d={`M${LANE_X[0]} ${l.y}H${LANE_X[1] + 12}`} strokeOpacity={0.35} strokeDasharray="3 7" style={{ opacity: cut }} />
            </>
          ) : (
            <path d={`M${LANE_X[0]} ${l.y}H${LANE_X[1] + 12}`} strokeOpacity={0.35} />
          )}
          <text x={LANE_X[0]} y={l.y - 12} fill="var(--muted)" stroke="none" className="font-mono text-[13px] lg:text-[11px]">
            {l.label}
          </text>
        </g>
      ))}
      <motion.text x={LANE_X[0] + 44} y={LANES[0].y - 12} fill="var(--foreground)" stroke="none" className="font-mono text-[13px] lg:text-[11px]" style={{ opacity: cut }}>
        SIGNAL PERDU
      </motion.text>
      <motion.text x={LANE_X[0]} y={LANES[2].y + 30} fill="var(--foreground)" stroke="none" className="font-mono text-[13px] lg:text-[11px]" style={{ opacity: boostO }}>
        5G + WI-FI ACCÉLÈRENT ↗
      </motion.text>

      {/* Flux continu après les 12 paquets numérotés */}
      {([0, 1, 2] as const).map((lane) => (
        <Stream key={lane} lane={lane} s={s} time={time} from={0.56} cut={cut} />
      ))}

      {/* Grille de tri */}
      <text x={SLOT.x0} y={SLOT.y - 26} fill="var(--muted)" stroke="none" className="font-mono text-[13px] lg:text-[11px]">
        GRILLE DE TRI
      </text>
      {PACKETS.map((pk) => (
        <Slot key={pk.n} n={pk.n} s={s} />
      ))}
      {/* Case 7 vide : clignote en pointillés */}
      <motion.g style={{ opacity: missing }}>
        <rect x={slotX(7) - 13} y={SLOT.y - 13} width={26} height={26} rx={4} strokeDasharray="2 2" className="wifi-pulse" />
      </motion.g>
      {/* NAK : le relais redemande le paquet 7 */}
      <motion.g style={{ opacity: nakO }}>
        <motion.path d={nakPath} strokeDasharray="4 4" style={{ pathLength: nakDraw }} />
        <motion.path d={`M${LANE_X[0] + 70} 144l-10 6l10 5`} style={{ opacity: nakHead }} />
        <text x={200} y={124} fill="var(--foreground)" stroke="none" className="font-mono text-[13px] lg:text-[11px]">
          NAK · 7 ← REDEMANDÉ
        </text>
      </motion.g>

      {PACKETS.map((pk) => (
        <Packet key={pk.n} pk={pk} s={s} />
      ))}
      <Packet pk={RESEND} s={s} />

      <motion.text x={SLOT.x0} y={SLOT.y + 50} fill="var(--foreground)" stroke="none" className="font-mono text-[13px] lg:text-[11px]" style={{ opacity: full }}>
        GRILLE PLEINE · 0 PAQUET PERDU
      </motion.text>

      {/* Buffer de latence */}
      <rect x={BUFFER.x0} y={BUFFER.y + 30} width={BUFFER.x1 - BUFFER.x0} height={8} rx={4} strokeOpacity={0.5} />
      <motion.rect x={BUFFER.x0} y={BUFFER.y + 30} width={bufferW} height={8} rx={4} fill="#fff" fillOpacity={0.8} stroke="none" />
      <text x={BUFFER.x0} y={BUFFER.y + 58} fill="var(--muted)" stroke="none" className="font-mono text-[13px] lg:text-[11px]">
        BUFFER · LATENCE · {latencyMs} MS
      </text>
    </g>
  );
}
