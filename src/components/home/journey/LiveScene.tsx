"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import ObsScreen from "@/components/illustrations/ObsScreen";
import RelayServer from "@/components/illustrations/RelayServer";
import { ramp } from "@/components/story/timeline";

// Scène 4 de l'accueil : le flux sort du relais vers OBS, puis se sépare en 3 lignes vers Twitch, Kick et YouTube
// (en texte, sans logos). Un compteur de viewers monte, des cœurs et des messages montent sur l'écran.
// SVG dans le repère 600 × 600 + calques HTML positionnés en %.

const PLATFORMS = [
  { name: "TWITCH", y: 170 },
  { name: "KICK", y: 270 },
  { name: "YOUTUBE", y: 370 },
];
const OBS_OUT = { x: 452, y: 270 };
const LABEL_X = 484;
const SERVER_OUT = { x: 136, y: 290 };
const OBS_IN = { x: 196, y: 290 };

const pct = (n: number) => `${((n / 600) * 100).toFixed(2)}%`;

/** Lignes SVG : relais → OBS, puis OBS → 3 plateformes. */
export function LiveLines({ draw }: { draw: MotionValue<number> }) {
  const split = useTransform(draw, (d) => ramp(d, 0.35, 1));
  const inDraw = useTransform(draw, (d) => ramp(d, 0, 0.35));
  return (
    <g className="svg-hairline" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" fill="none">
      <motion.path d={`M${SERVER_OUT.x} ${SERVER_OUT.y}H${OBS_IN.x}`} style={{ pathLength: inDraw }} strokeOpacity={0.35} />
      <motion.path d={`M${SERVER_OUT.x} ${SERVER_OUT.y}H${OBS_IN.x}`} className="bond-dash" style={{ opacity: inDraw }} />
      {PLATFORMS.map((pl) => {
        const d = `M${OBS_OUT.x} ${OBS_OUT.y}C${OBS_OUT.x + 26} ${OBS_OUT.y} ${OBS_OUT.x + 20} ${pl.y} ${OBS_OUT.x + 46} ${pl.y}H${LABEL_X - 4}`;
        return (
          <g key={pl.name}>
            <motion.path d={d} style={{ pathLength: split }} strokeOpacity={0.35} />
            <motion.path d={d} className="bond-dash" style={{ opacity: split }} />
          </g>
        );
      })}
    </g>
  );
}

const CHAT = ["let's gooo", "l'image est propre 🔥", "t'es où là ?", "gg le live"];

/** Calques HTML : relais, OBS, étiquettes des plateformes, compteur de viewers, cœurs et chat. */
export function LiveOverlay({ draw, viewers, social }: { draw: MotionValue<number>; viewers: MotionValue<number>; social: MotionValue<number> }) {
  const labelsO = useTransform(draw, (d) => ramp(d, 0.7, 1));
  const count = useTransform(viewers, (v) => Math.round(v * 1284).toLocaleString("fr-FR"));
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute" style={{ left: "0%", top: pct(180), width: pct(160), height: pct(200) }}>
        <RelayServer />
      </div>
      <div className="absolute" style={{ left: pct(180), top: pct(110), width: pct(290), height: pct(320) }}>
        <ObsScreen />
        {/* Cœurs et messages qui montent sur l'écran */}
        <motion.div className="absolute inset-x-[18%] top-[18%] h-[40%] overflow-hidden" style={{ opacity: social }}>
          {CHAT.map((m, i) => (
            <p
              key={m}
              className="float-up absolute left-0 whitespace-nowrap rounded-full border border-line bg-background/80 px-2 py-0.5 font-mono text-[9px] text-foreground sm:text-[10px]"
              style={{ animationDelay: `${i * 0.9}s`, bottom: 0 }}
            >
              {m}
            </p>
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="float-up absolute bottom-0 text-xs text-foreground sm:text-sm"
              style={{ right: `${6 + i * 9}%`, animationDelay: `${0.4 + i * 0.7}s` }}
            >
              ♥
            </span>
          ))}
        </motion.div>
      </div>
      {/* Compteur de viewers */}
      <motion.p
        className="absolute -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-background/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground sm:text-xs"
        style={{ left: pct(325), top: pct(88), opacity: labelsO }}
      >
        <span className="live-dot mr-2 align-middle" />
        LIVE · <motion.span>{count}</motion.span> viewers
      </motion.p>
      {PLATFORMS.map((pl) => (
        <motion.p
          key={pl.name}
          className="absolute -translate-y-1/2 rounded-full border border-line bg-background px-2 py-1 font-mono text-[9px] tracking-[0.1em] text-foreground sm:px-2.5 sm:text-xs sm:tracking-[0.12em]"
          style={{ left: pct(LABEL_X), top: pct(pl.y), opacity: labelsO }}
        >
          {pl.name}
        </motion.p>
      ))}
    </div>
  );
}
