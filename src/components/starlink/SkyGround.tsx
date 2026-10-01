"use client";

import { useId } from "react";
import { motion, useTransform, type MotionValue } from "motion/react";
import CellTower from "@/components/illustrations/CellTower";
import FlowLine from "@/components/illustrations/FlowLine";
import Ground from "@/components/illustrations/Ground";
import { SatelliteGlyph } from "@/components/illustrations/SatelliteTrain";
import { StreamerFigure, STREAMER_PHONE } from "@/components/illustrations/Streamer";
import WifiWaves, { aim } from "@/components/illustrations/WifiWaves";
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
          <stop offset="0" stopColor="var(--foreground)" stopOpacity="0.3" />
          <stop offset="1" stopColor="var(--foreground)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <motion.path d={beam} fill={`url(#${id}beam)`} style={{ opacity: beamO }} />
      <motion.g style={{ x, y, opacity: satO }}>
        <SatelliteGlyph />
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

const wifiAngle = aim(MINI_GROUND.x, MINI_GROUND.y, PHONE.x, PHONE.y);
const cellAngle = aim(TOWER.x, TOWER.top, PHONE.x, PHONE.y);

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
        <radialGradient id={`${id}hit`}>
          <stop offset="0" stopColor="var(--foreground)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--foreground)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="svg-hairline" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Relief, horizon, sol, sapins */}
        <Ground horizon={HORIZON} />

        {/* Antenne-relais 4G/5G à l'horizon */}
        <CellTower x={TOWER.x} top={TOWER.top} horizon={HORIZON} />

        {/* Lien 4G/5G vers le téléphone */}
        <motion.g style={{ opacity: cellO }} stroke="currentColor" strokeWidth={1}>
          <path d={`M${TOWER.x} ${TOWER.top}L${PHONE.x + 9} ${PHONE.y}`} strokeOpacity={0.2} />
          <path d={`M${TOWER.x} ${TOWER.top}L${PHONE.x + 9} ${PHONE.y}`} className="bond-dash" />
          <WifiWaves cx={TOWER.x} cy={TOWER.top} radii={[30, 55, 80]} angle={cellAngle} spread={14} dash="2 4" />
          <text x={TOWER.x - 4} y={TOWER.top - 14} textAnchor="middle" stroke="none" fill="var(--muted)" className="font-mono text-[17px] sm:text-[15px] lg:text-[12px]">
            4G/5G
          </text>
        </motion.g>

        {/* Ondes Wi-Fi du Mini vers le téléphone */}
        <motion.g style={{ opacity: wifiO }} stroke="currentColor" strokeWidth={1.25}>
          <WifiWaves cx={mx} cy={my} radii={[70, 125, 180]} angle={wifiAngle} spread={16} dash="3 4" />
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
      <FlowLine left={left} top={top} />
      <p className="absolute -translate-y-[calc(100%+4px)] whitespace-nowrap pl-4 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground sm:text-xs" style={{ left, top }}>
        Bonding SRTLA
      </p>
      <p
        className="absolute right-0 -translate-y-[calc(100%+22px)] whitespace-nowrap rounded-full border border-line bg-background/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground sm:text-xs"
        style={{ top }}
      >
        Relais SYXTEE → OBS → LIVE
      </p>
    </motion.div>
  );
}
