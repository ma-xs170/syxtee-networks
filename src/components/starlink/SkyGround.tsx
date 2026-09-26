"use client";

import { useId } from "react";
import { motion, useTransform, type MotionValue } from "motion/react";
import { StreamerFigure, STREAMER_PHONE } from "@/components/illustrations/Streamer";
import { MINI_GROUND, band, beamPath, ramp, satellite } from "./timeline";

// Calques SVG des scènes 2 et 3, dans le repère 600 × 600 de la scène.

const STREAMER = { x: 462, y: 572 };
export const PHONE = { x: STREAMER.x + STREAMER_PHONE.x, y: STREAMER.y + STREAMER_PHONE.y };
const HORIZON = 392;
const TOWER = { x: 548, top: 334 };

/** Scène 2 : satellite qui s'arrête au centre, faisceau conique et label d'altitude. */
export function SkyLayer({ p }: { p: MotionValue<number> }) {
  const id = useId();
  const x = useTransform(p, (v) => satellite(v).x);
  const y = useTransform(p, (v) => satellite(v).y);
  const satO = useTransform(p, (v) => ramp(v, 0.33, 0.36));
  const beam = useTransform(p, beamPath);
  const beamO = useTransform(p, (v) => ramp(v, 0.45, 0.5));
  const labelO = useTransform(p, (v) => band(v, 0.48, 0.52, 0.59, 0.62));

  return (
    <g>
      <defs>
        <linearGradient id={`${id}beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.02" />
        </linearGradient>
        <radialGradient id={`${id}glow`}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <motion.path d={beam} fill={`url(#${id}beam)`} style={{ opacity: beamO }} />
      <motion.g style={{ x, y, opacity: satO }}>
        <circle r={26} fill={`url(#${id}glow)`} />
        <g className="svg-hairline" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round">
          <rect x={-6} y={-5} width={12} height={10} rx={1.5} fill="currentColor" fillOpacity={0.08} />
          <rect x={-32} y={-4} width={22} height={8} strokeWidth={1} />
          <rect x={10} y={-4} width={22} height={8} strokeWidth={1} />
          <path d="M-10 0H-6M6 0H10M-25 -4V4M-18 -4V4M17 -4V4M24 -4V4" strokeWidth={1} />
          <circle cx={0} cy={0} r={1.5} className="led-blink" fill="var(--live)" stroke="none" />
        </g>
        <motion.g style={{ opacity: labelO }}>
          <path d="M40 0H56" stroke="currentColor" strokeWidth={1} strokeDasharray="2 3" className="svg-hairline" />
          <text x={62} y={4} fill="var(--foreground)" className="font-mono text-[17px] sm:text-[15px] lg:text-[12px]">
            ORBITE BASSE ≈ 550 KM
          </text>
        </motion.g>
      </motion.g>
    </g>
  );
}

// Arc d'onde centré sur (cx, cy), orienté vers `angle` (degrés), d'ouverture ±spread.
function arc(cx: number, cy: number, r: number, angle: number, spread: number) {
  const a0 = ((angle - spread) * Math.PI) / 180;
  const a1 = ((angle + spread) * Math.PI) / 180;
  const f = (n: number) => n.toFixed(1);
  return `M${f(cx + r * Math.cos(a0))} ${f(cy + r * Math.sin(a0))}A${r} ${r} 0 0 1 ${f(cx + r * Math.cos(a1))} ${f(cy + r * Math.sin(a1))}`;
}

const wifiAngle = (Math.atan2(PHONE.y - MINI_GROUND.y, PHONE.x - MINI_GROUND.x) * 180) / Math.PI;
const wifiArcs = [70, 125, 180].map((r) => arc(MINI_GROUND.x, MINI_GROUND.y, r, wifiAngle, 16));
const cellAngle = (Math.atan2(PHONE.y - TOWER.top, PHONE.x - TOWER.x) * 180) / Math.PI;
const cellArcs = [30, 55, 80].map((r) => arc(TOWER.x, TOWER.top, r, cellAngle, 14));

const pine = (x: number, h: number) =>
  `M${x} ${HORIZON - h}L${x + h * 0.28} ${HORIZON - h * 0.22}H${x - h * 0.28}ZM${x} ${HORIZON - h * 0.22}V${HORIZON}M${x - h * 0.17} ${HORIZON - h * 0.5}H${x + h * 0.17}`;

/** Scène 3 : sol, Mini à plat, streamer, antenne-relais 4G/5G. */
export function GroundLayer({ p }: { p: MotionValue<number> }) {
  const id = useId();
  const y = useTransform(p, (v) => 260 * (1 - ramp(v, 0.62, 0.74)));
  const o = useTransform(p, (v) => ramp(v, 0.62, 0.7));
  const hit = useTransform(p, (v) => ramp(v, 0.72, 0.76));
  const miniO = useTransform(hit, (h) => 0.45 + 0.55 * h);
  const wifiO = useTransform(p, (v) => ramp(v, 0.745, 0.78));
  const cellO = useTransform(p, (v) => ramp(v, 0.79, 0.83));
  const { x: mx, y: my } = MINI_GROUND;

  return (
    <motion.g style={{ y, opacity: o }}>
      <defs>
        <linearGradient id={`${id}fade`} gradientUnits="userSpaceOnUse" x1="-250" y1="0" x2="120" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <radialGradient id={`${id}hit`}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="svg-hairline" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Relief, horizon, sol */}
        <g stroke={`url(#${id}fade)`} strokeWidth={1}>
          <path
            d={`M-300 ${HORIZON}L-210 362L-150 374L-70 336L10 368L80 352L150 376L230 344L300 366L370 330L440 362L520 348L610 372L700 340L900 ${HORIZON}`}
            strokeOpacity={0.3}
          />
          <path d={`M-300 ${HORIZON}H900`} strokeOpacity={0.7} />
          <path d="M-300 440H900M-300 520H900" strokeOpacity={0.12} strokeDasharray="2 8" />
        </g>
        <g stroke="currentColor" strokeWidth={1} strokeOpacity={0.6}>
          <path d={pine(56, 44)} />
          <path d={pine(88, 30)} />
          <path d={pine(166, 36)} />
          <path d={pine(596, 26)} />
        </g>

        {/* Antenne-relais 4G/5G à l'horizon */}
        <g stroke="currentColor" strokeWidth={1}>
          <path
            d={`M${TOWER.x - 9} ${HORIZON}L${TOWER.x} ${TOWER.top}L${TOWER.x + 9} ${HORIZON}M${TOWER.x - 6} 372H${TOWER.x + 6}M${TOWER.x - 3.5} 354H${TOWER.x + 3.5}M${TOWER.x - 9} ${HORIZON}L${TOWER.x + 6} 372L${TOWER.x - 3.5} 354M${TOWER.x + 9} ${HORIZON}L${TOWER.x - 6} 372L${TOWER.x + 3.5} 354`}
          />
          <path d={`M${TOWER.x - 5} ${TOWER.top + 2}v8M${TOWER.x + 5} ${TOWER.top + 2}v8`} strokeWidth={1.25} />
          <circle cx={TOWER.x} cy={TOWER.top - 3} r={1.6} className="led-blink" fill="var(--live)" stroke="none" />
        </g>

        {/* Lien 4G/5G vers le téléphone */}
        <motion.g style={{ opacity: cellO }} stroke="currentColor" strokeWidth={1}>
          <path d={`M${TOWER.x} ${TOWER.top}L${PHONE.x + 9} ${PHONE.y}`} strokeOpacity={0.2} />
          <path d={`M${TOWER.x} ${TOWER.top}L${PHONE.x + 9} ${PHONE.y}`} className="bond-dash" />
          {cellArcs.map((d, i) => (
            <path
              key={d}
              d={d}
              className="wave-out"
              strokeDasharray="2 4"
              style={{ transformOrigin: `${TOWER.x}px ${TOWER.top}px`, animationDelay: `${i * 0.8}s` }}
            />
          ))}
          <text x={TOWER.x - 4} y={TOWER.top - 14} textAnchor="middle" stroke="none" fill="var(--muted)" className="font-mono text-[17px] sm:text-[15px] lg:text-[12px]">
            4G/5G
          </text>
        </motion.g>

        {/* Ondes Wi-Fi du Mini vers le téléphone */}
        <motion.g style={{ opacity: wifiO }} stroke="currentColor" strokeWidth={1.25}>
          {wifiArcs.map((d, i) => (
            <path
              key={d}
              d={d}
              className="wave-out"
              strokeDasharray="3 4"
              style={{ transformOrigin: `${mx}px ${my}px`, animationDelay: `${i * 0.8}s` }}
            />
          ))}
          <text x={mx + 62} y={my - 96} stroke="none" fill="var(--muted)" className="font-mono text-[17px] sm:text-[15px] lg:text-[12px]">
            Wi-Fi
          </text>
        </motion.g>

        {/* Starlink Mini posé à plat, qui s'illumine au contact du faisceau */}
        <motion.ellipse cx={mx} cy={my} rx={70} ry={20} fill={`url(#${id}hit)`} stroke="none" style={{ opacity: hit }} />
        <motion.g style={{ opacity: miniO }} stroke="currentColor" strokeWidth={1.25}>
          <path d={`M${mx - 44} ${my + 2}L${mx + 6} ${my - 14}L${mx + 46} ${my}L${mx - 4} ${my + 16}Z`} fill="currentColor" fillOpacity={0.06} />
          <path d={`M${mx - 44} ${my + 2}v4L${mx - 4} ${my + 20}L${mx + 46} ${my + 4}v-4M${mx - 4} ${my + 16}v4`} strokeWidth={1} />
          <path d={`M${mx - 30} ${my + 2}L${mx + 6} ${my - 9}L${mx + 34} ${my}L${mx - 4} ${my + 11}Z`} strokeWidth={1} strokeDasharray="1.5 3" />
          <circle cx={mx + 30} cy={my + 9} r={1.4} className="led-blink" fill="var(--live)" stroke="none" />
        </motion.g>

        {/* Streamer */}
        <g transform={`translate(${STREAMER.x} ${STREAMER.y})`}>
          <StreamerFigure />
        </g>
      </g>
    </motion.g>
  );
}

/** Scène 3 (HTML) : la ligne .flow-line qui part du téléphone et sort de l'écran vers la droite. */
export function FlowOverlay({ p }: { p: MotionValue<number> }) {
  const opacity = useTransform(p, (v) => ramp(v, 0.86, 0.9));
  const left = `${(((PHONE.x + 9) / 600) * 100).toFixed(2)}%`;
  const top = `${((PHONE.y / 600) * 100).toFixed(2)}%`;
  return (
    <motion.div className="pointer-events-none absolute inset-0" style={{ opacity }} aria-hidden="true">
      <div className="absolute h-px w-[100vw] bg-white/20" style={{ left, top }} />
      <div className="flow-line absolute h-px w-[100vw]" style={{ left, top }} />
      <p className="absolute -translate-y-[calc(100%+4px)] whitespace-nowrap pl-4 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground sm:text-xs" style={{ left, top }}>
        Bonding SRTLA
      </p>
      <p
        className="absolute right-0 -translate-y-[calc(100%+22px)] whitespace-nowrap rounded-full border border-line bg-black/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground sm:text-xs"
        style={{ top }}
      >
        Relais SYXTEE → OBS → LIVE
      </p>
    </motion.div>
  );
}
