"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { StreamerFigure, STREAMER_PHONE } from "@/components/illustrations/Streamer";
import { waveArc } from "@/components/illustrations/WifiWaves";
import MotionTransform from "@/components/story/MotionTransform";
import { ramp } from "@/components/story/timeline";

// Scène 1 de l'accueil : une rue des Antilles en filaire (façades créoles, balcons en fer forgé, palmier,
// lampadaire, la mer au loin). Le streamer marche de gauche à droite ; son téléphone émet 3 ondes (4G, 5G, Wi-Fi)
// et des bulles de chat flottent au-dessus de lui. Repère 600 × 600.

export const STREET_GROUND = 470;
export const STREAMER_SCALE = 0.85;
const WALK = [90, 470] as const;

/** Position x du streamer pour une marche de 0 à 1. */
export const streamerX = (w: number) => WALK[0] + (WALK[1] - WALK[0]) * w;
/** Position du téléphone (repère de la scène) pour une marche de 0 à 1. */
export const phoneAt = (w: number) => ({
  x: streamerX(w) + STREAMER_PHONE.x * STREAMER_SCALE,
  y: STREET_GROUND + STREAMER_PHONE.y * STREAMER_SCALE,
});

const zigzag = (x0: number, x1: number, y: number, step = 8, amp = 5) => {
  let d = `M${x0} ${y}`;
  for (let x = x0; x < x1; x += step) d += `L${x + step / 2} ${y + amp}L${x + step} ${y}`;
  return d;
};

/** Balcon en fer forgé : lisses, barreaux et volutes (cercles). */
function Balcony({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  const bars = [];
  for (let x = x0 + 6; x < x1; x += 10) bars.push(x);
  return (
    <g strokeWidth={1}>
      <path d={`M${x0 - 6} ${y}H${x1 + 6}M${x0 - 6} ${y + 4}H${x1 + 6}M${x0} ${y - 28}H${x1}`} />
      <path d={bars.map((x) => `M${x} ${y - 28}V${y}`).join("")} strokeOpacity={0.6} />
      {bars.filter((_, i) => i % 2 === 0).map((x) => (
        <circle key={x} cx={x + 5} cy={y - 14} r={3.2} strokeOpacity={0.8} />
      ))}
    </g>
  );
}

/** Fenêtre à persiennes (lames horizontales). */
function Shutter({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const slats = [];
  for (let k = y + 6; k < y + h - 2; k += 5) slats.push(k);
  return (
    <g strokeWidth={1}>
      <rect x={x} y={y} width={w} height={h} rx={1} />
      <path d={`M${x + w / 2} ${y}V${y + h}`} />
      <path d={slats.map((k) => `M${x + 3} ${k}H${x + w - 3}`).join("")} strokeOpacity={0.45} />
    </g>
  );
}

/** Façade créole à deux niveaux : toit, lambrequins, persiennes, balcon, porte. */
function Facade({ x, w, roof, gable = false }: { x: number; w: number; roof: number; gable?: boolean }) {
  const eave = roof + 50;
  const floor = eave + 80;
  const roofPath = gable
    ? `M${x - 8} ${eave}L${x + w / 2} ${roof}L${x + w + 8} ${eave}Z`
    : `M${x - 8} ${eave}L${x + 34} ${roof}H${x + w - 34}L${x + w + 8} ${eave}Z`;
  return (
    <g>
      <rect x={x} y={eave} width={w} height={STREET_GROUND - eave} fill="#000" />
      <path d={roofPath} fill="#000" />
      {/* Tôle ondulée du toit */}
      <path d={roofPath} />
      {gable ? (
        <path d={`M${x + w / 2} ${roof}V${eave}`} strokeWidth={1} strokeOpacity={0.35} strokeDasharray="2 4" />
      ) : (
        <path d={`M${x + 34} ${roof + 12}H${x + w - 34}M${x + 20} ${roof + 28}H${x + w - 20}`} strokeWidth={1} strokeOpacity={0.35} strokeDasharray="2 4" />
      )}
      {/* Lambrequins sous l'avant-toit */}
      <path d={zigzag(x - 8, x + w + 8, eave, 8, 5)} strokeWidth={1} strokeOpacity={0.7} />
      {/* Murs */}
      <path d={`M${x} ${eave}V${STREET_GROUND}M${x + w} ${eave}V${STREET_GROUND}`} />
      {/* Étage : persiennes + balcon */}
      <Shutter x={x + 22} y={eave + 16} w={28} h={50} />
      <Shutter x={x + w - 50} y={eave + 16} w={28} h={50} />
      {w > 170 && <Shutter x={x + w / 2 - 14} y={eave + 16} w={28} h={50} />}
      <Balcony x0={x} x1={x + w} y={floor} />
      {/* Rez-de-chaussée : porte cintrée et vitrine à persiennes */}
      <path d={`M${x + w / 2 - 16} ${STREET_GROUND}V${floor + 34}A16 16 0 0 1 ${x + w / 2 + 16} ${floor + 34}V${STREET_GROUND}`} />
      <path d={`M${x + w / 2} ${floor + 22}V${STREET_GROUND}`} strokeWidth={1} strokeOpacity={0.5} />
      <Shutter x={x + 16} y={floor + 24} w={34} h={48} />
      <Shutter x={x + w - 50} y={floor + 24} w={34} h={48} />
    </g>
  );
}

function Palm({ x, top }: { x: number; top: number }) {
  const tx = x + 22;
  const fronds = [
    `M${tx} ${top}C${tx - 20} ${top - 18} ${tx - 50} ${top - 10} ${tx - 64} ${top + 16}`,
    `M${tx} ${top}C${tx - 12} ${top - 30} ${tx - 30} ${top - 38} ${tx - 44} ${top - 34}`,
    `M${tx} ${top}C${tx + 6} ${top - 32} ${tx + 26} ${top - 42} ${tx + 44} ${top - 36}`,
    `M${tx} ${top}C${tx + 22} ${top - 16} ${tx + 52} ${top - 10} ${tx + 66} ${top + 18}`,
    `M${tx} ${top}C${tx + 10} ${top - 4} ${tx + 30} ${top + 12} ${tx + 36} ${top + 36}`,
    `M${tx} ${top}C${tx - 10} ${top - 2} ${tx - 28} ${top + 14} ${tx - 32} ${top + 38}`,
  ];
  const rings = [0.2, 0.35, 0.5, 0.65, 0.8];
  return (
    <g>
      <path d={`M${x} ${STREET_GROUND}Q${x + 2} ${(STREET_GROUND + top) / 2} ${tx} ${top}`} strokeWidth={1.5} />
      <path
        d={rings
          .map((t) => {
            const yy = STREET_GROUND + (top - STREET_GROUND) * t;
            const xx = x + (tx - x) * t * t;
            return `M${xx - 4} ${yy}q4 3 8 0`;
          })
          .join("")}
        strokeWidth={1}
        strokeOpacity={0.6}
      />
      {fronds.map((d) => (
        <path key={d} d={d} strokeWidth={1.1} />
      ))}
      <circle cx={tx - 3} cy={top + 4} r={2.5} strokeWidth={1} />
      <circle cx={tx + 3} cy={top + 5} r={2.5} strokeWidth={1} />
    </g>
  );
}

function Lamppost({ x }: { x: number }) {
  return (
    <g>
      <path d={`M${x} ${STREET_GROUND}V300M${x - 6} ${STREET_GROUND}H${x + 6}M${x} 304c0 -14 12 -18 24 -14`} />
      <path d={`M${x + 16} 290h16l-3 12h-10z`} fill="#000" />
      <circle cx={x + 24} cy={298} r={1.8} fill="#fff" stroke="none" />
    </g>
  );
}

/** La mer au loin, entre les façades. */
function Sea() {
  return (
    <g strokeWidth={1}>
      <path d="M170 332H420" strokeOpacity={0.7} />
      <path d="M180 346q8 -4 16 0t16 0t16 0M250 346q8 -4 16 0t16 0M320 346q8 -4 16 0t16 0t16 0" strokeOpacity={0.4} className="sea-drift" />
      <path d="M200 362q8 -4 16 0t16 0M290 362q8 -4 16 0t16 0t16 0M360 362q8 -4 16 0t16 0" strokeOpacity={0.3} className="sea-drift" style={{ animationDelay: "-1.5s" }} />
      {/* Voilier au loin */}
      <path d="M300 330l10 -24v24zM294 330h22l-3 4h-16z" strokeOpacity={0.6} />
    </g>
  );
}

const WAVES = [
  { label: "4G", angle: -128, opacity: 0.55 },
  { label: "5G", angle: -92, opacity: 0.8 },
  { label: "WI-FI", angle: -52, opacity: 1 },
];

function Waves({ x, y, reveal }: { x: number; y: number; reveal: MotionValue<number> }) {
  return (
    <>
      {WAVES.map((w, k) => (
        <WaveGroup key={w.label} x={x} y={y} w={w} k={k} reveal={reveal} />
      ))}
    </>
  );
}

function WaveGroup({ x, y, w, k, reveal }: { x: number; y: number; w: (typeof WAVES)[number]; k: number; reveal: MotionValue<number> }) {
  const opacity = useTransform(reveal, (r) => ramp(r, k / 3, k / 3 + 0.34) * w.opacity);
  const a = (w.angle * Math.PI) / 180;
  return (
    <motion.g style={{ opacity }} strokeWidth={1.25}>
      {[18, 30, 42].map((r, i) => (
        <path
          key={r}
          d={waveArc(x, y, r, w.angle, 16)}
          className="wave-out"
          strokeDasharray={i === 2 ? "2 4" : undefined}
          style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${k * 0.4 + i * 0.6}s` }}
        />
      ))}
      <text x={x + 58 * Math.cos(a)} y={y + 58 * Math.sin(a)} textAnchor="middle" fill="var(--foreground)" stroke="none" className="font-mono text-[15px] lg:text-[12px]">
        {w.label}
      </text>
    </motion.g>
  );
}

const BUBBLES = [
  { dx: -64, w: 46, phase: 0 },
  { dx: -30, w: 34, phase: 1.3 },
  { dx: -86, w: 40, phase: 2.6 },
];

/** Bulles de chat filaires qui montent au-dessus du streamer, en boucle. */
function Bubble({ b, x, y, time }: { b: (typeof BUBBLES)[number]; x: MotionValue<number>; y: number; time: MotionValue<number> }) {
  const cycle = 3.9;
  const t = useTransform(time, (s) => ((s + b.phase) % cycle) / cycle);
  const opacity = useTransform(t, (u) => Math.min(ramp(u, 0, 0.15), 1 - ramp(u, 0.7, 1)));
  const transform = useTransform([x, t], ([xx, u]: number[]) => `translate(${xx + b.dx} ${y - 40 * u})`);
  return (
    <motion.g style={{ opacity }} strokeWidth={1}>
      <MotionTransform transform={transform}>
        <path d={`M0 0h${b.w}a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4H10l-6 6v-6H0a4 4 0 0 1 -4 -4V4a4 4 0 0 1 4 -4z`} fill="#000" />
        <path d={`M4 7h${b.w - 10}M4 12h${b.w - 22}`} strokeOpacity={0.6} />
      </MotionTransform>
    </motion.g>
  );
}

/**
 * La rue. `walk` (0 → 1) place le streamer, `waves` (0 → 1) fait apparaître les 3 connexions une à une,
 * `time` (secondes) anime les bulles et le balancement de la marche.
 */
export default function Street({ walk, waves, time }: { walk: MotionValue<number>; waves: MotionValue<number>; time: MotionValue<number> }) {
  const sx = useTransform(walk, streamerX);
  const bob = useTransform(time, (s) => Math.abs(Math.sin(s * 5)) * -2.5);
  const streamerT = useTransform([sx, bob], ([x, b]: number[]) => `translate(${x} ${STREET_GROUND + b}) scale(${STREAMER_SCALE})`);
  const phoneX = useTransform(walk, (w) => phoneAt(w).x);
  const phoneY = phoneAt(0).y;
  const wavesT = useTransform(phoneX, (x) => `translate(${x} 0)`);

  return (
    <g className="svg-hairline" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <Sea />
      <Palm x={206} top={286} />
      <Facade x={10} w={180} roof={250} />
      <Facade x={420} w={170} roof={232} gable />
      <Lamppost x={384} />
      {/* Trottoir, bordure, route */}
      <path d={`M-100 ${STREET_GROUND}H700`} />
      <path d={`M-100 ${STREET_GROUND + 26}H700`} strokeWidth={1} strokeOpacity={0.5} />
      <path d={`M-100 ${STREET_GROUND + 70}H700`} strokeWidth={1} strokeOpacity={0.25} strokeDasharray="18 14" />

      {/* Streamer */}
      <MotionTransform transform={streamerT}>
        <StreamerFigure />
      </MotionTransform>
      <MotionTransform transform={wavesT}>
        <Waves x={0} y={phoneY} reveal={waves} />
      </MotionTransform>
      {BUBBLES.map((b) => (
        <Bubble key={b.dx} b={b} x={phoneX} y={phoneY - 84} time={time} />
      ))}
    </g>
  );
}
