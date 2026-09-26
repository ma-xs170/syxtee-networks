"use client";

import type { MotionValue } from "motion/react";
import { HOME_PC, HOME_SCREEN, HomeDeskScene } from "@/components/illustrations/HomeDesk";
import { OBS_H, OBS_W, ObsUI } from "@/components/illustrations/ObsInterface";
import { Flow, Packet, SceneDefs, SceneG, T, anim, clamp01, easeOut, lerp, ramp, useV } from "./kit";

// Scènes 7 à 9 : retour chez toi, l'interface OBS, en direct. Repère 600 × 600.

/* ───────────── 7 · RETOUR CHEZ TOI ───────────── */

export function SceneHome({ progress }: { progress: MotionValue<number> }) {
  const v = useV(progress);
  const replay = 1 - ramp(v, 0.3, 0.38);
  const dot = ramp(v, 0.06, 0.3);
  const room = ramp(v, 0.3, 0.42);
  const flux = ramp(v, 0.45, 0.65);
  const fluxPath = `M-40 520H330Q348 520 348 500V470H${HOME_PC.x}V${HOME_PC.y + 30}`;
  return (
    <g>
      <SceneDefs />
      <SceneG>
        {/* Le flux SRT repart dans l'autre sens : aperçu accéléré du retour */}
        {replay > 0.01 && (
          <g opacity={replay}>
            <path d="M40 300H560" strokeWidth={5} opacity={0.35} />
            <path d="M40 300H560" strokeWidth={2} className={anim.stream} style={{ animationDirection: "reverse" }} />
            <T x={300} y={270} anchor="middle" size="sm" strong>
              FLUX SRT · RETOUR
            </T>
            {/* NYC */}
            <g strokeWidth={1}>
              <path d="M500 220V160H520V220M524 220V140H546V220M550 220V176H566V220" />
              <T x={532} y={244} anchor="middle" size="sm">
                NEW YORK
              </T>
            </g>
            {/* Câble sous-marin avec impulsions */}
            <path d="M480 200Q400 230 320 200T140 200" strokeWidth={2} />
            <path d="M480 200Q400 230 320 200T140 200" stroke="#fff" strokeWidth={1.5} className={anim.pulseBack} />
            <T x={310} y={250} anchor="middle" size="sm">
              CÂBLE SOUS-MARIN
            </T>
            {/* Antilles */}
            <g strokeWidth={1}>
              <path d="M40 220q30 -26 70 0" />
              <path d="M72 212q-2 -24 6 -40M78 172q-10 -4 -16 4M78 172q10 -6 16 2M78 172q-2 -10 -10 -12" />
              <T x={74} y={244} anchor="middle" size="sm">
                ANTILLES
              </T>
            </g>
            <circle cx={lerp(500, 90, dot)} cy={200 + Math.sin(dot * Math.PI * 2) * 8} r={4} fill="#fff" stroke="none" />
          </g>
        )}

        {/* Chez toi, la nuit */}
        {room > 0.01 && (
          <g opacity={room}>
            <HomeDeskScene
              screen={
                <g transform={`scale(${(HOME_SCREEN.w / OBS_W).toFixed(4)})`} opacity={0.8}>
                  <ObsUI t={0.2} />
                </g>
              }
            />
            <g opacity={flux}>
              <path d={fluxPath} strokeWidth={4} opacity={0.3} />
              <path d={fluxPath} strokeWidth={2} className={anim.stream} />
              <rect x={24} y={538} width={250} height={24} rx={12} fill="#000" strokeWidth={1} />
              <T x={149} y={555} anchor="middle" size="sm" strong>
                SRT · srt://relais-nyc…
              </T>
              <Packet x={lerp(-20, 330, clamp01(flux * 1.2))} y={520} hero size={12} />
            </g>
          </g>
        )}
      </SceneG>
    </g>
  );
}

/* ───────────── 8 · L'INTERFACE OBS ───────────── */

export function SceneObs({ progress }: { progress: MotionValue<number> }) {
  const v = useV(progress);
  const zoom = easeOut(ramp(v, 0, 0.1));
  const t = clamp01((v - 0.06) / 0.94);
  const scale = lerp(HOME_SCREEN.w / OBS_W, 580 / OBS_W, zoom);
  const x = lerp(HOME_SCREEN.x, (600 - OBS_W * (580 / OBS_W)) / 2, zoom);
  const y = lerp(HOME_SCREEN.y, (600 - OBS_H * (580 / OBS_W)) / 2, zoom);
  return (
    <g>
      <SceneDefs />
      <SceneG>
        <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(4)})`}>
          <ObsUI t={t} />
        </g>
      </SceneG>
    </g>
  );
}

/* ───────────── 9 · EN DIRECT ───────────── */

const PLATFORMS = [
  { name: "TWITCH", y: 170, k: 1 },
  { name: "KICK", y: 300, k: 0.62 },
  { name: "YOUTUBE", y: 430, k: 0.8 },
];

export function SceneLive({ progress, narrow }: { progress: MotionValue<number>; narrow: boolean }) {
  const v = useV(progress);
  const dezoom = easeOut(ramp(v, 0, 0.18));
  const lines = ramp(v, 0.12, 0.3);
  const counts = ramp(v, 0.2, 0.85);
  const party = ramp(v, 0.3, 0.4);
  const outro = ramp(v, 0.72, 0.82);
  const floaters = narrow ? 4 : 9;
  const PC: [number, number] = [120, 300];
  return (
    <g>
      <SceneDefs />
      <SceneG>
        {/* Le PC, qui dézoome */}
        <g transform={`translate(${PC[0]} ${PC[1]}) scale(${lerp(2.2, 1, dezoom).toFixed(3)})`} opacity={lerp(0.4, 1, dezoom)}>
          <rect x={-60} y={-40} width={96} height={60} rx={4} fill="#000" />
          <rect x={-60} y={-40} width={96} height={60} rx={4} fill="currentColor" fillOpacity={0.05} />
          <rect x={-54} y={-34} width={84} height={48} rx={2} strokeWidth={1} />
          <circle cx={-46} cy={-27} r={2} fill="var(--live)" stroke="none" className="led-blink" />
          <path d="M-12 20v14M-30 34h36" strokeWidth={1} />
          <rect x={44} y={-30} width={26} height={64} rx={3} fill="currentColor" fillOpacity={0.04} />
          <circle cx={57} cy={-12} r={7} strokeWidth={1} />
          <circle cx={57} cy={10} r={7} strokeWidth={1} />
        </g>
        <T x={PC[0]} y={PC[1] + 70} anchor="middle" size="sm" opacity={dezoom}>
          TON OBS
        </T>

        {/* Le flux se sépare en 3 vers les plateformes */}
        {PLATFORMS.map((p, i) => {
          const a: [number, number] = [PC[0] + 76, PC[1]];
          const c: [number, number] = [300, p.y];
          const b: [number, number] = [404, p.y];
          const viewers = Math.floor(lerp(3, 1840 * p.k, counts));
          return (
            <g key={p.name} opacity={lines}>
              <path d={`M${a[0]} ${a[1]}Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`} strokeWidth={1.5} opacity={0.6} />
              <Flow a={a} c={c} b={b} count={narrow ? 3 : 5} duration={1.8 + i * 0.3} size={6} />
              <rect x={404} y={p.y - 20} width={160} height={40} rx={8} fill="#000" />
              <rect x={404} y={p.y - 20} width={160} height={40} rx={8} fill="currentColor" fillOpacity={0.05} />
              <circle cx={422} cy={p.y} r={3.5} fill="var(--live)" stroke="none" className="led-blink" style={{ animationDelay: `${i * 0.3}s` }} />
              <T x={434} y={p.y + 5} size="md" strong>
                {p.name}
              </T>
              <T x={562} y={p.y + 38} anchor="end" size="sm">
                {`${viewers.toLocaleString("fr-FR")} VIEWERS`}
              </T>
            </g>
          );
        })}

        {/* Cœurs et messages qui s'envolent */}
        <g opacity={party * (1 - outro * 0.6)}>
          {Array.from({ length: floaters }, (_, i) => {
            const x = 330 + ((i * 71) % 250);
            const y = 540 - ((i * 37) % 60);
            const heart = i % 2 === 0;
            return (
              <g key={i} className={anim.rise} style={{ animationDelay: `${-i * 0.55}s` }}>
                {heart ? (
                  <path d={`M${x} ${y}c-6 -6 -12 -1 -8 5l8 7l8 -7c4 -6 -2 -11 -8 -5Z`} fill="var(--live)" fillOpacity={0.25} stroke="var(--live)" strokeWidth={1} />
                ) : (
                  <g strokeWidth={1}>
                    <rect x={x - 22} y={y - 12} width={44} height={18} rx={9} fill="#000" />
                    <path d={`M${x - 14} ${y - 3}h28`} opacity={0.6} />
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Tout le trajet : quelques secondes */}
        <g opacity={outro}>
          <rect x={80} y={530} width={440} height={40} rx={20} fill="#000" strokeWidth={1.25} />
          <T x={300} y={555} anchor="middle" size="md" strong>
            Téléphone → Live : quelques secondes.
          </T>
        </g>
      </SceneG>
    </g>
  );
}
