import type { ReactNode } from "react";
import a from "./anim.module.css";
import { Illustration, Led } from "./iso";

// Chambre / bureau filaire, la nuit : fenêtre (palmiers, lune), bureau, tour PC, écran, micro sur bras, lampe, plante.
// Repère 600 × 600. HOME_PC : entrée réseau de la tour. HOME_SCREEN : dalle de l'écran (pour zoomer dedans).

export const HOME_PC = { x: 548, y: 380 };
export const HOME_SCREEN = { x: 262, y: 262, w: 196, h: 112 };
const DESK = 432;

function Palm({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g className={a.sway} strokeWidth={1}>
      <path d={`M${x} ${y}q${-4 * s} ${-30 * s} ${6 * s} ${-60 * s}`} />
      {[
        [-22, 6],
        [-14, -8],
        [4, -12],
        [18, -4],
        [22, 8],
      ].map(([dx, dy], i) => (
        <path key={i} d={`M${x + 6 * s} ${y - 60 * s}q${(dx * s) / 2} ${(dy - 8) * s} ${dx * s} ${(dy + 4) * s}`} />
      ))}
    </g>
  );
}

export function HomeDeskScene({ screen }: { screen?: ReactNode }) {
  const S = HOME_SCREEN;
  return (
    <g>
      {/* Fenêtre, la nuit */}
      <rect x={52} y={70} width={200} height={190} rx={4} />
      <rect x={60} y={78} width={184} height={174} rx={2} strokeWidth={1} opacity={0.5} />
      <path d="M152 78V252M60 165H244" strokeWidth={1} opacity={0.6} />
      <path d="M214 100a16 16 0 1 0 12 26a13 13 0 1 1 -12 -26Z" fill="currentColor" fillOpacity={0.12} strokeWidth={1} />
      {[
        [84, 100],
        [120, 118],
        [180, 96],
        [100, 140],
        [232, 150],
      ].map(([sx, sy]) => (
        <circle key={`${sx}${sy}`} cx={sx} cy={sy} r={1} fill="currentColor" stroke="none" className="led-blink" style={{ animationDelay: `${(sx % 7) * 0.2}s`, animationDuration: "2.6s" }} />
      ))}
      <Palm x={96} y={252} s={1.1} />
      <Palm x={200} y={252} s={0.8} />
      <path d="M60 238q46 -8 92 0t92 -2" strokeWidth={1} opacity={0.4} />
      <path d="M44 262h216" />

      {/* Lampe et son halo */}
      <path d={`M112 ${DESK}l22 -4M123 ${DESK - 2}l18 -70l38 20`} />
      <path d="M170 350l20 -6l10 22l-18 8Z" fill="currentColor" fillOpacity={0.08} />
      <path d={`M190 372L240 ${DESK}H150Z`} fill="currentColor" fillOpacity={0.05} stroke="none" />

      {/* Plante */}
      <path d={`M60 ${DESK}l6 -30h28l6 30Z`} fill="currentColor" fillOpacity={0.05} />
      {[
        [-16, -40],
        [-4, -56],
        [10, -48],
        [20, -30],
      ].map(([dx, dy], i) => (
        <path key={i} d={`M80 ${DESK - 30}q${dx * 0.3} ${dy * 0.6} ${dx} ${dy}q${-dx * 0.4} ${-dy * 0.1} ${-dx} ${-dy}`} strokeWidth={1} />
      ))}

      {/* Bureau */}
      <path d={`M36 ${DESK}H584M56 ${DESK}V580M564 ${DESK}V580`} />
      <path d={`M36 ${DESK + 10}H584`} strokeWidth={1} opacity={0.4} />

      {/* Écran */}
      <rect x={S.x - 10} y={S.y - 10} width={S.w + 20} height={S.h + 22} rx={5} />
      <rect x={S.x} y={S.y} width={S.w} height={S.h} rx={2} strokeWidth={1} fill="currentColor" fillOpacity={0.04} />
      {screen && <g transform={`translate(${S.x} ${S.y})`}>{screen}</g>}
      <path d={`M${S.x + S.w / 2 - 6} ${S.y + S.h + 12}v${DESK - S.y - S.h - 22}M${S.x + S.w / 2 + 6} ${S.y + S.h + 12}v${DESK - S.y - S.h - 22}`} strokeWidth={1} />
      <path d={`M${S.x + S.w / 2 - 34} ${DESK}l6 -10h56l6 10`} />
      {/* Clavier */}
      <path d={`M${S.x + 20} ${DESK - 4}h120`} strokeWidth={3} opacity={0.5} />

      {/* Micro sur bras articulé */}
      <path d={`M232 ${DESK}v-8M232 ${DESK - 8}l-26 -96l52 -40`} strokeWidth={1.25} />
      <circle cx={206} cy={DESK - 104} r={3} strokeWidth={1} />
      <rect x={252} y={DESK - 176} width={16} height={30} rx={8} transform={`rotate(-30 260 ${DESK - 161})`} fill="currentColor" fillOpacity={0.06} />

      {/* Tour PC avec ventilateurs */}
      <rect x={484} y={290} width={80} height={DESK - 290} rx={5} fill="currentColor" fillOpacity={0.04} />
      {[322, 372].map((cy) => (
        <g key={cy} strokeWidth={1}>
          <circle cx={524} cy={cy} r={20} />
          <g className={a.spin}>
            <path d={`M524 ${cy - 16}q8 8 0 16q-8 8 0 16M508 ${cy}q8 -8 16 0q8 8 16 0`} />
          </g>
        </g>
      ))}
      <path d={`M494 ${DESK - 20}h26`} strokeWidth={1} />
      <Led x={550} y={DESK - 20} r={1.8} />
      <circle cx={HOME_PC.x} cy={HOME_PC.y + 30} r={2.5} strokeWidth={1} />
    </g>
  );
}

export default function HomeDesk({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <Illustration viewBox="20 50 580 550" className={className} animated={animated}>
      <HomeDeskScene />
    </Illustration>
  );
}
