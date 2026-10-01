"use client";

import type { MotionValue } from "motion/react";
import { DataCenterBuilding, RackCorridor, Skyline } from "@/components/illustrations/DataCenter";
import { RackExploded, RackFront } from "@/components/illustrations/ServerRack";
import { CableSection, OceanScene } from "@/components/illustrations/SubseaCable";
import { Packet, PACKET, SceneDefs, SceneG, T, anim, band, easeOut, lerp, ramp, useV } from "./kit";

// Scènes 4 à 6 : le câble sous-marin, le data center, le serveur. Repère 600 × 600.

/* ───────────── 4 · LE CÂBLE SOUS-MARIN ───────────── */

export function SceneSubsea({ progress, narrow }: { progress: MotionValue<number>; narrow: boolean }) {
  const v = useV(progress);
  const dive = easeOut(ramp(v, 0, 0.22));
  const section = ramp(v, 0.3, 0.45) * (1 - ramp(v, 0.72, 0.82));
  const run = ramp(v, 0.78, 1);
  const trip = ramp(v, 0.05, 1);
  // Carte : arc des Antilles vers la côte Est des USA
  const A: [number, number] = [458, 570];
  const C: [number, number] = [470, 500];
  const B: [number, number] = [572, 510];
  const u = 1 - trip;
  const dot = [u * u * A[0] + 2 * u * trip * C[0] + trip * trip * B[0], u * u * A[1] + 2 * u * trip * C[1] + trip * trip * B[1]];
  return (
    <g>
      <SceneDefs />
      <SceneG>
        {/* La caméra plonge : la ligne d'eau remonte jusqu'en haut de l'écran */}
        <g transform={`translate(0 ${lerp(470, 0, dive).toFixed(1)})`}>
          <OceanScene surface={60} fish={narrow ? 2 : 4} bubbles={narrow ? 3 : 7} />
        </g>

        {/* Zoom dans la coupe du câble */}
        {section > 0.01 && (
          <g opacity={Math.min(1, section * 1.4)}>
            <path d={`M310 ${270 + 110 * section}L300 478`} strokeWidth={1} strokeDasharray="2 4" opacity={0.6} />
            <CableSection cx={310} cy={260} r={lerp(10, 104, section)} labels={section > 0.85} />
          </g>
        )}
        <g opacity={band(v, 0.42, 0.5, 0.92, 1)}>
          <T x={300} y={124} anchor="middle" size="sm" strong>
            FIBRE OPTIQUE · LA LUMIÈRE VOYAGE À ~200 000 KM/S
          </T>
        </g>

        {/* Le paquet #0427 devient une impulsion de lumière */}
        {run > 0 && run < 1 && (
          <g>
            <path d={`M${lerp(-60, 560, run)} 480H${lerp(-60, 560, run) + 60}`} stroke="var(--foreground)" strokeWidth={3} opacity={0.9} />
            <Packet x={lerp(-60, 560, run) + 66} y={480} hero size={10} />
          </g>
        )}

        {/* Petite carte : Antilles → côte Est des USA */}
        <g opacity={ramp(v, 0.15, 0.25)}>
          <rect x={440} y={488} width={146} height={100} rx={6} fill="var(--background)" />
          <rect x={440} y={488} width={146} height={100} rx={6} strokeWidth={1} opacity={0.6} />
          <path d="M540 492q10 14 4 30t18 30" strokeWidth={1} opacity={0.5} />
          <path d={`M${A[0]} ${A[1]}Q${C[0]} ${C[1]} ${B[0]} ${B[1]}`} strokeWidth={1} strokeDasharray="2 3" />
          <circle cx={A[0]} cy={A[1]} r={2.5} strokeWidth={1} />
          <circle cx={B[0]} cy={B[1]} r={2.5} strokeWidth={1} />
          <circle cx={dot[0]} cy={dot[1]} r={3} fill="var(--live)" stroke="none" />
          <text x={456} y={584} stroke="none" fill="var(--muted)" fontSize={9} className="font-mono">
            ANTILLES
          </text>
          <text x={582} y={502} textAnchor="end" stroke="none" fill="var(--muted)" fontSize={9} className="font-mono">
            NEW YORK
          </text>
        </g>
      </SceneG>
    </g>
  );
}

/* ───────────── 5 · LE DATA CENTER ───────────── */

const ARRIVALS = ["#0428", "#0425", PACKET, "#0426", "#0429"];

export function SceneDataCenter({ progress }: { progress: MotionValue<number> }) {
  const v = useV(progress);
  const rise = easeOut(ramp(v, 0, 0.2));
  const outside = 1 - ramp(v, 0.3, 0.4);
  const inside = ramp(v, 0.3, 0.42);
  const advance = ramp(v, 0.35, 0.75);
  const rack = ramp(v, 0.62, 0.72);
  const glow = ramp(v, 0.7, 0.8);
  return (
    <g>
      <SceneDefs />
      <SceneG>
        {/* Retour à la surface, côté New York */}
        {outside > 0.01 && (
          <g opacity={outside} transform={`translate(0 ${lerp(-160, 0, rise).toFixed(1)})`}>
            <Skyline y={340} />
            <path d="M-40 520q15 -6 30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0" className={anim.wave} strokeWidth={1} />
            <g transform="translate(200 470)">
              <DataCenterBuilding />
            </g>
          </g>
        )}

        {/* On entre : couloir de racks */}
        {inside > 0.01 && (
          <g opacity={inside * (1 - rack * 0.7)}>
            <RackCorridor advance={advance} />
          </g>
        )}

        {/* LE rack SYXTEE */}
        {rack > 0.01 && (
          <g opacity={rack} transform={`translate(0 ${lerp(30, 0, rack).toFixed(1)})`}>
            <rect x={196} y={130} width={208} height={338} fill="var(--background)" stroke="none" />
            <RackFront x={200} y={134} glow={glow} />
          </g>
        )}

        {/* Les 3 flux arrivent… dans le désordre */}
        {ARRIVALS.map((n, i) => {
          const t = ramp(v, 0.74 + i * 0.045, 0.84 + i * 0.045);
          if (t <= 0 || t >= 1) return null;
          const lane = [150, 300, 450][i % 3];
          return <Packet key={n} x={lerp(-20, 300, t)} y={lerp(lane, 300, t)} n={n} hero={n === PACKET} size={12} opacity={1 - t * 0.4} />;
        })}
        <g opacity={band(v, 0.8, 0.86, 1.2, 1.3)}>
          <T x={300} y={560} anchor="middle" size="sm">
            #0428 · #0425 · #0427 · #0426 …
          </T>
        </g>
      </SceneG>
    </g>
  );
}

/* ───────────── 6 · LE SERVEUR ───────────── */

const LANES = [
  { l: "4G", y: 150 },
  { l: "5G", y: 206 },
  { l: "STARLINK", y: 262 },
];
const SLOTS = 12; // #0421 → #0432
const HERO_SLOT = 6; // #0427
// Ordre d'arrivée mélangé, voie par paquet
const ORDER = [3, 0, 7, 1, 9, 4, 11, 2, 8, 5, 10];
const slotPos = (k: number): [number, number] => [262 + (k % 6) * 52, 150 + Math.floor(k / 6) * 64];

export function SceneServer({ progress }: { progress: MotionValue<number> }) {
  const v = useV(progress);
  const explode = ramp(v, 0.05, 0.22) * (1 - ramp(v, 0.3, 0.36));
  const exploded = 1 - ramp(v, 0.3, 0.38);
  const sort = ramp(v, 0.34, 0.42);
  const nak = band(v, 0.68, 0.72, 0.8, 0.84);
  const heroIn = ramp(v, 0.82, 0.9);
  const buffer = ramp(v, 0.42, 0.95);
  return (
    <g>
      <SceneDefs />
      <SceneG>
        {/* Vue éclatée du serveur */}
        {exploded > 0.01 && (
          <g opacity={exploded} transform="translate(250 400)">
            <RackExploded explode={explode} labelX={150} />
          </g>
        )}

        {sort > 0.01 && (
          <g opacity={sort}>
            {/* Les 3 voies */}
            {LANES.map((ln) => (
              <g key={ln.l}>
                <path d={`M20 ${ln.y}H226`} strokeWidth={1} opacity={0.5} />
                <path d={`M20 ${ln.y}H226`} strokeWidth={1} className={anim.stream} opacity={0.35} />
                <T x={20} y={ln.y - 10} size="sm">
                  {ln.l}
                </T>
              </g>
            ))}
            {/* Grille de tri */}
            <T x={262} y={116} size="sm" strong>
              TRI PAR NUMÉRO
            </T>
            {Array.from({ length: SLOTS }, (_, k) => {
              const [x, y] = slotPos(k);
              const missing = k === HERO_SLOT && heroIn < 1;
              return (
                <g key={k}>
                  <rect
                    x={x - 20}
                    y={y - 20}
                    width={40}
                    height={40}
                    rx={4}
                    strokeWidth={1}
                    strokeDasharray={missing ? "3 3" : undefined}
                    className={missing && v > 0.6 ? anim.blink : undefined}
                    stroke={missing && v > 0.6 ? "var(--live)" : "currentColor"}
                    opacity={missing ? 1 : 0.5}
                  />
                  <text x={x} y={y + 34} textAnchor="middle" stroke="none" fill="var(--muted)" className="font-mono text-[12px] lg:text-[9px]">
                    {`#04${21 + k}`}
                  </text>
                </g>
              );
            })}
            {/* Les paquets arrivent dans le désordre et se rangent */}
            {ORDER.map((slot, i) => {
              const k = slot >= HERO_SLOT ? slot + 1 : slot; // #0427 manque
              if (k >= SLOTS) return null;
              const t0 = 0.42 + i * 0.022;
              const t = ramp(v, t0, t0 + 0.08);
              if (t <= 0) return null;
              const lane = LANES[i % 3].y;
              const [sx, sy] = slotPos(k);
              const x = t < 0.5 ? lerp(20, 226, t * 2) : lerp(226, sx, (t - 0.5) * 2);
              const y = t < 0.5 ? lane : lerp(lane, sy, (t - 0.5) * 2);
              return <Packet key={k} x={x} y={y} n={`#04${21 + k}`} size={14} label={t < 0.98} />;
            })}
            {/* NAK : le relais redemande le #0427 */}
            <g opacity={nak}>
              <path d={`M${slotPos(HERO_SLOT)[0] - 24} ${slotPos(HERO_SLOT)[1]}Q240 ${LANES[1].y + 60} 30 ${LANES[1].y + 14}`} stroke="var(--live)" strokeWidth={1.25} strokeDasharray="4 4" />
              <path d={`M38 ${LANES[1].y + 8}l-8 6l9 4`} stroke="var(--live)" />
              <rect x={96} y={LANES[1].y + 30} width={54} height={20} rx={10} fill="var(--background)" stroke="var(--live)" strokeWidth={1} />
              <T x={123} y={LANES[1].y + 44} anchor="middle" size="sm" live>
                NAK
              </T>
            </g>
            {heroIn > 0 && (
              <Packet
                x={heroIn < 0.5 ? lerp(20, 226, heroIn * 2) : lerp(226, slotPos(HERO_SLOT)[0], (heroIn - 0.5) * 2)}
                y={heroIn < 0.5 ? LANES[1].y : lerp(LANES[1].y, slotPos(HERO_SLOT)[1], (heroIn - 0.5) * 2)}
                hero
                size={15}
              />
            )}
            {/* Buffer */}
            <T x={20} y={372} size="sm" strong>
              BUFFER · LATENCE 2000 MS
            </T>
            <rect x={20} y={384} width={560} height={16} rx={8} strokeWidth={1} />
            <rect x={23} y={387} width={Math.max(0, 554 * buffer)} height={10} rx={5} fill="currentColor" fillOpacity={0.5} stroke="none" />
            {/* Sortie SRT : flux propre et continu */}
            <g opacity={ramp(v, 0.9, 1)}>
              <path d="M580 300H640" strokeWidth={4} />
              <path d="M262 300H640" strokeWidth={2} className={anim.stream} />
              <T x={580} y={336} anchor="end" size="sm" strong>
                SORTIE SRT →
              </T>
            </g>
          </g>
        )}
      </SceneG>
    </g>
  );
}
