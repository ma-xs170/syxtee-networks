"use client";

import type { MotionValue } from "motion/react";
import { BeachScene } from "@/components/illustrations/BeachView";
import { IsoBox, Waves } from "@/components/illustrations/iso";
import { Flow, Packet, PACKET, Pylon, SceneDefs, SceneG, T, band, bez, easeOut, lerp, qPath, ramp, useV } from "./kit";

// Scènes 1 à 3 : la capture (téléphone), les antennes, internet. Repère 600 × 600.

/* ───────────── 1 · LA CAPTURE ───────────── */

const PW = 260;
const PH = 130;

/** Téléphone en paysage (iso), la plage filmée à l'écran. Origine : coin arrière bas. */
function LandscapePhone() {
  return (
    <IsoBox
      at={[0, 0, 0]}
      size={[PW, 10, PH]}
      r={12}
      front={
        <g strokeWidth={1}>
          <rect x={6} y={-PH + 6} width={PW - 12} height={PH - 12} rx={8} />
          <g transform={`translate(12 ${-PH + 10})`}>
            <BeachScene w={PW - 24} h={PH - 20} />
          </g>
          <circle cx={PW - 16} cy={-PH / 2} r={5} fill="var(--live)" stroke="none" className="led-blink" />
          <text x={16} y={-PH + 22} stroke="none" fill="var(--foreground)" fontSize={8} className="font-mono">
            ● REC · MOBLIN
          </text>
        </g>
      }
      side={<path d="M4 -90v-20" strokeWidth={1.5} />}
    />
  );
}

export function SceneCapture({ progress }: { progress: MotionValue<number> }) {
  const v = useV(progress);
  const zoom = ramp(v, 0.22, 0.45);
  const sensor = ramp(v, 0.32, 0.4);
  const chip = ramp(v, 0.4, 0.48);
  const ribbon = ramp(v, 0.48, 0.56);
  const cut = ramp(v, 0.58, 0.7);
  const slide = ramp(v, 0.62, 1);
  const packets = ["#0425", "#0426", PACKET, "#0428", "#0429"];
  return (
    <g>
      <SceneDefs />
      <SceneG>
        {/* Le téléphone qui filme, puis on zoome dedans (il devient un fantôme) */}
        <g
          transform={`translate(${lerp(190, 170, zoom)} ${lerp(236, 250, zoom)}) scale(${(1 + zoom * 0.5).toFixed(3)})`}
          opacity={1 - zoom * 0.82}
        >
          <LandscapePhone />
        </g>

        {/* Vue éclatée : capteur → encodeur → bande vidéo */}
        <g opacity={sensor}>
          <rect x={60} y={262} width={76} height={76} rx={8} fill="#000" />
          <rect x={60} y={262} width={76} height={76} rx={8} fill="currentColor" fillOpacity={0.05} />
          {[30, 22, 13].map((r) => (
            <circle key={r} cx={98} cy={300} r={r} strokeWidth={1} />
          ))}
          <circle cx={98} cy={300} r={5} fill="currentColor" fillOpacity={0.4} stroke="none" />
          <T x={98} y={362} anchor="middle" size="sm">
            CAPTEUR
          </T>
        </g>
        <g opacity={chip}>
          <path d="M140 300H196" strokeDasharray="3 4" />
          <path d="M190 295l6 5l-6 5" />
          <rect x={202} y={262} width={124} height={76} rx={6} fill="#000" />
          <rect x={202} y={262} width={124} height={76} rx={6} fill="currentColor" fillOpacity={0.08} />
          {[0, 1, 2, 3, 4, 5, 6].map((k) => (
            <path key={k} d={`M${214 + k * 16} 262v-8M${214 + k * 16} 338v8`} strokeWidth={1} />
          ))}
          <T x={264} y={296} anchor="middle" strong size="sm">
            ENCODEUR
          </T>
          <T x={264} y={314} anchor="middle" strong size="sm">
            H.265
          </T>
        </g>
        {/* La vidéo sort en une bande continue… */}
        <g opacity={ribbon * (1 - cut * 0.85)}>
          <rect x={330} y={288} width={lerp(0, 300, ribbon)} height={24} fill="currentColor" fillOpacity={0.12} />
          <path d={`M330 300H${330 + lerp(0, 300, ribbon)}`} strokeDasharray="10 8" strokeWidth={1} />
        </g>
        {/* … qui se découpe en paquets numérotés */}
        <g opacity={cut}>
          {packets.map((n, i) => {
            const hero = n === PACKET;
            const x0 = 360 + i * 48;
            const x = hero ? lerp(x0, 440, slide) : x0 + slide * (i < 2 ? -40 : 200);
            const y = hero ? lerp(300, 440, easeOut(slide)) : 300;
            return <Packet key={n} x={x} y={y} n={n} hero={hero} size={hero ? 18 : 16} opacity={hero ? 1 : 1 - slide * 0.6} />;
          })}
        </g>
        <g opacity={band(v, 0.1, 0.18, 0.3, 0.36)}>
          <T x={300} y={560} anchor="middle" size="sm">
            1080p · 60 FPS · EN DIRECT
          </T>
        </g>
      </SceneG>
    </g>
  );
}

/* ───────────── 2 · LES ANTENNES ───────────── */

type P = [number, number];
const PHONE: P = [118, 400];
const ROUTES: { key: string; to: P; c: P; label: string; sub: string }[] = [
  { key: "4g", to: [420, 158], c: [210, 170], label: "4G", sub: "OPÉRATEUR A" },
  { key: "5g", to: [536, 232], c: [330, 250], label: "5G", sub: "OPÉRATEUR B" },
  { key: "sat", to: [430, 470], c: [270, 500], label: "STARLINK", sub: "WI-FI" },
];

function SmallPhone({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 17} y={y - 30} width={34} height={62} rx={6} fill="#000" />
      <rect x={x - 17} y={y - 30} width={34} height={62} rx={6} fill="currentColor" fillOpacity={0.06} />
      <rect x={x - 13} y={y - 24} width={26} height={46} rx={3} strokeWidth={1} />
      <circle cx={x - 7} cy={y - 18} r={1.8} fill="var(--live)" stroke="none" className="led-blink" />
      <path d={`M${x} ${y + 32}v36`} strokeWidth={1.25} />
    </g>
  );
}

export function SceneAntennas({ progress, narrow }: { progress: MotionValue<number>; narrow: boolean }) {
  const v = useV(progress);
  const intro = easeOut(ramp(v, 0, 0.22));
  const weak = ramp(v, 0.42, 0.52);
  const hero = ramp(v, 0.64, 1);
  const [hx, hy] = bez([PHONE[0], PHONE[1] - 30], ROUTES[1].c, ROUTES[1].to, hero);
  const base = narrow ? 3 : 4;
  return (
    <g>
      <SceneDefs />
      <SceneG>
        {/* Le téléphone dézoome depuis la scène 1 */}
        <g transform={`translate(${PHONE[0]} ${PHONE[1]}) scale(${lerp(2.4, 1, intro).toFixed(3)}) translate(${-PHONE[0]} ${-PHONE[1]})`}>
          <SmallPhone x={PHONE[0]} y={PHONE[1]} />
        </g>
        <T x={PHONE[0]} y={PHONE[1] + 92} anchor="middle" size="sm" opacity={intro}>
          MOBLIN · SRTLA
        </T>

        <g opacity={ramp(v, 0.12, 0.26)}>
          {ROUTES.map((r) => {
            const isWeak = r.key === "4g";
            const w = isWeak ? lerp(2.2, 0.6, weak) : lerp(1.4, 3.2, weak);
            const d = qPath([PHONE[0], PHONE[1] - 30], r.c, r.to);
            return (
              <g key={r.key}>
                <path d={d} strokeWidth={w} opacity={isWeak ? lerp(0.6, 0.2, weak) : 0.5} />
                <Flow
                  a={[PHONE[0], PHONE[1] - 30]}
                  c={r.c}
                  b={r.to}
                  count={isWeak ? (weak > 0.5 ? 1 : base) : weak > 0.5 ? base + 2 : base}
                  duration={isWeak && weak > 0.5 ? 3.6 : 2.2}
                />
              </g>
            );
          })}

          {/* Pylône 4G (opérateur A) */}
          <Pylon x={420} y={290} h={128} led />
          <g opacity={lerp(1, 0.25, weak)} strokeWidth={1}>
            <Waves cx={420} cy={160} angle={-160} radii={[20, 36, 52]} spread={16} />
          </g>
          <T x={446} y={176} size="md" strong>
            4G
          </T>
          <T x={446} y={194} size="sm">
            OPÉRATEUR A
          </T>
          <g opacity={weak} className="led-blink">
            <rect x={332} y={96} width={128} height={22} rx={11} fill="#000" stroke="var(--live)" strokeWidth={1.25} />
            <T x={396} y={112} anchor="middle" size="sm" live>
              SIGNAL FAIBLE
            </T>
          </g>

          {/* Pylône 5G (opérateur B) */}
          <Pylon x={536} y={350} h={116} led />
          <g strokeWidth={1}>
            <Waves cx={536} cy={236} angle={-165} radii={[20, 36, 52]} spread={16} delay={0.3} />
          </g>
          <T x={560} y={290} size="md" strong anchor="end">
            5G
          </T>
          <T x={560} y={372} size="sm" anchor="end">
            OPÉRATEUR B
          </T>

          {/* Starlink Mini posé au sol, relié en Wi-Fi */}
          <g>
            <path d="M388 478L436 458L484 474L436 494Z" fill="currentColor" fillOpacity={0.07} />
            <path d="M388 478v4L436 498L484 478v-4M436 494v4" strokeWidth={1} />
            <path d="M402 477L436 464L470 475L436 488Z" strokeWidth={1} strokeDasharray="1.5 3" />
            <circle cx={470} cy={484} r={1.6} className="led-blink" fill="var(--live)" stroke="none" />
            <g strokeWidth={1}>
              <Waves cx={430} cy={470} angle={-170} radii={[20, 36, 52]} spread={16} delay={0.6} />
            </g>
            <T x={500} y={494} size="md" strong>
              STARLINK
            </T>
            <T x={500} y={512} size="sm">
              WI-FI
            </T>
          </g>
        </g>

        {/* Le paquet #0427 prend la 5G */}
        {hero > 0 && <Packet x={hx} y={hy} hero size={14} />}
      </SceneG>
    </g>
  );
}

/* ───────────── 3 · INTERNET ───────────── */

const COLS = 5;
const ROWS = 4;
function node(i: number, j: number): P {
  const spread = 104 - j * 16;
  return [250 + (i - 2) * spread, 500 - j * 78];
}
// Trajet du paquet : de nœud en nœud jusqu'à la station d'atterrissage.
const HOPS: [number, number][] = [
  [0, 0],
  [1, 1],
  [2, 1],
  [2, 2],
  [3, 2],
  [4, 3],
];
const HOP_LABELS: Record<number, string> = { 1: "OPÉRATEUR", 3: "ROUTEUR", 5: "POINT D'ÉCHANGE" };
const STATION: P = [520, 220];

export function SceneInternet({ progress }: { progress: MotionValue<number> }) {
  const v = useV(progress);
  const pan = ramp(v, 0.55, 1) * -40;
  const h = clampHop(((v - 0.12) / 0.6) * (HOPS.length - 1));
  const k = Math.floor(h);
  const frac = h - k;
  const from = node(...HOPS[Math.min(k, HOPS.length - 1)]);
  const to = k + 1 < HOPS.length ? node(...HOPS[k + 1]) : from;
  const toStation = ramp(v, 0.74, 0.92);
  let px = lerp(from[0], to[0], frac);
  let py = lerp(from[1], to[1], frac) - Math.sin(Math.PI * frac) * 26;
  if (toStation > 0) {
    const last = node(...HOPS[HOPS.length - 1]);
    px = lerp(last[0], STATION[0] - 16, toStation);
    py = lerp(last[1], STATION[1] + 20, toStation) - Math.sin(Math.PI * toStation) * 30;
  }
  const flashNode = frac < 0.25 && v > 0.12 && toStation === 0 ? HOPS[k] : null;
  const labelHop = Object.keys(HOP_LABELS)
    .map(Number)
    .find((n) => Math.abs(h - n) < 0.5 && toStation === 0);
  const appear = ramp(v, 0, 0.15);
  return (
    <g>
      <SceneDefs />
      <SceneG>
        <g transform={`translate(${pan.toFixed(1)} 0)`}>
          {/* Les 3 flux entrent dans le réseau */}
          {[470, 500, 530].map((y, i) => (
            <path key={y} d={`M-40 ${y + 40}Q60 ${y} ${node(0, 0)[0]} ${node(0, 0)[1]}`} strokeWidth={1.25} opacity={0.5 * appear} strokeDasharray={i === 0 ? "2 5" : undefined} />
          ))}

          {/* Maillage de routeurs en perspective */}
          <g opacity={appear}>
            {Array.from({ length: ROWS }, (_, j) =>
              Array.from({ length: COLS }, (_, i) => {
                const [x, y] = node(i, j);
                const lines = [];
                if (i + 1 < COLS) lines.push(node(i + 1, j));
                if (j + 1 < ROWS) lines.push(node(i, j + 1));
                if (i + 1 < COLS && j + 1 < ROWS && (i + j) % 2 === 0) lines.push(node(i + 1, j + 1));
                return (
                  <g key={`${i}-${j}`}>
                    {lines.map(([x2, y2]) => (
                      <path key={`${x2}-${y2}`} d={`M${x} ${y}L${x2} ${y2}`} strokeWidth={0.75} opacity={0.35} />
                    ))}
                  </g>
                );
              }),
            )}
            {Array.from({ length: ROWS }, (_, j) =>
              Array.from({ length: COLS }, (_, i) => {
                const [x, y] = node(i, j);
                const s = 11 - j * 1.8;
                const lit = flashNode && flashNode[0] === i && flashNode[1] === j;
                return (
                  <g key={`n${i}-${j}`}>
                    <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={1.5} fill="#000" />
                    <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={1.5} fill="currentColor" fillOpacity={lit ? 0.9 : 0.08} />
                    {lit && <circle cx={x} cy={y} r={s * (1 + frac * 8)} strokeWidth={1} opacity={1 - frac * 4} />}
                  </g>
                );
              }),
            )}
          </g>

          {/* Station d'atterrissage au bord de la mer, avec des palmiers */}
          <g opacity={ramp(v, 0.45, 0.65)}>
            <path d="M470 150Q520 170 560 150T660 150" strokeWidth={1} opacity={0.4} />
            <path d="M470 180Q520 196 560 180T660 180" strokeWidth={1} opacity={0.3} strokeDasharray="3 5" />
            <path d="M440 330Q480 250 470 120" strokeWidth={1} />
            <g transform={`translate(${STATION[0] - 60} ${STATION[1] + 40})`}>
              <IsoBox at={[0, 0, 0]} size={[46, 34, 30]} r={2} />
              <path d="M22 -40a12 12 0 0 1 24 0" strokeWidth={1} />
            </g>
            {[
              [418, 300],
              [446, 262],
            ].map(([x, y]) => (
              <g key={x} strokeWidth={1}>
                <path d={`M${x} ${y}q-3 -22 5 -44`} />
                {[
                  [-14, 4],
                  [-8, -6],
                  [4, -8],
                  [12, 2],
                ].map(([dx, dy], i) => (
                  <path key={i} d={`M${x + 5} ${y - 44}q${dx / 2} ${dy - 6} ${dx} ${dy + 3}`} />
                ))}
              </g>
            ))}
            <T x={STATION[0] + 20} y={STATION[1] + 94} size="sm" anchor="middle">
              STATION D&apos;ATTERRISSAGE
            </T>
            <path d={`M${STATION[0] - 20} ${STATION[1] + 60}Q${STATION[0] + 40} ${STATION[1] + 30} 640 ${STATION[1] + 60}`} strokeDasharray="4 4" opacity={0.6} />
          </g>

          {/* Le paquet #0427 saute de routeur en routeur */}
          {v > 0.1 && <Packet x={px} y={py} hero size={13} />}
          {labelHop !== undefined && (
            <g>
              <rect x={px - 72} y={py - 58} width={144} height={22} rx={11} fill="#000" strokeWidth={1} />
              <T x={px} y={py - 42} anchor="middle" size="sm" strong>
                {HOP_LABELS[labelHop]}
              </T>
            </g>
          )}
        </g>
      </SceneG>
    </g>
  );
}

function clampHop(x: number) {
  return Math.min(HOPS.length - 1, Math.max(0, x));
}
