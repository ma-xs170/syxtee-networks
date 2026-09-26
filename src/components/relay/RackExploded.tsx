"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { IsoBox, iso } from "@/components/illustrations/iso";
import MotionTransform from "@/components/story/MotionTransform";
import { ramp } from "@/components/story/timeline";

// Le relais en vue éclatée : 5 couches qui s'écartent au scroll, avec leurs labels en pointillés.
// `explode` (0 → 1) écarte les couches, `labels` (0 → 1) fait apparaître les labels,
// `live` (0 → 1) allume les LED en rouge « live » quand un flux arrive.

const W = 150;
const D = 104;
const H = 24;
const GAP = 6;
const SPREAD = 56;
export const LABEL_X = 190;

const LAYERS = [
  { key: "psu", label: "Alimentation · redondante" },
  { key: "out", label: "Sortie SRT · vers ton OBS" },
  { key: "mem", label: "Mémoire tampon · buffer de latence" },
  { key: "cpu", label: "Processeur · réassemblage" },
  { key: "net", label: "Carte réseau · réception SRTLA" },
] as const;

function Front({ kind }: { kind: (typeof LAYERS)[number]["key"] }) {
  // Face avant, dans le plan (u de 0 à W, v de -H à 0).
  return (
    <g strokeWidth={1}>
      {kind === "net" && [0, 1, 2, 3].map((k) => <rect key={k} x={14 + k * 16} y={-17} width={11} height={9} rx={1} />)}
      {kind === "cpu" && <path d="M14 -16H70M14 -12H70M14 -8H70" strokeDasharray="1 3" />}
      {kind === "mem" && [0, 1, 2, 3, 4, 5].map((k) => <rect key={k} x={14 + k * 10} y={-18} width={6} height={12} rx={1} />)}
      {kind === "out" && (
        <>
          <rect x={14} y={-17} width={20} height={10} rx={2} />
          <path d="M40 -12H78" strokeDasharray="2 3" />
        </>
      )}
      {kind === "psu" && (
        <>
          <circle cx={26} cy={-12} r={8} />
          <circle cx={48} cy={-12} r={8} />
          <path d="M18 -12h16M26 -20v16M40 -12h16M48 -20v16" strokeOpacity={0.5} />
        </>
      )}
      <path d={`M${W - 44} -18H${W - 22}`} strokeDasharray="1 3" />
    </g>
  );
}

function Top({ kind }: { kind: (typeof LAYERS)[number]["key"] }) {
  // Dessus (u le long de x de 0 à W, v le long de y de 0 à D).
  if (kind === "cpu") {
    return (
      <g strokeWidth={1}>
        <rect x={50} y={30} width={50} height={44} rx={3} />
        <path d="M58 30V74M66 30V74M74 30V74M82 30V74M90 30V74" strokeOpacity={0.6} />
      </g>
    );
  }
  if (kind === "mem") {
    return (
      <g strokeWidth={1}>
        {[0, 1, 2, 3].map((k) => (
          <rect key={k} x={30 + k * 24} y={18} width={8} height={68} rx={1.5} />
        ))}
      </g>
    );
  }
  if (kind === "net") {
    return <path d="M20 20H130M20 84H130" strokeWidth={1} strokeDasharray="2 4" />;
  }
  return <path d="M16 16H134M16 88H134" strokeWidth={1} strokeDasharray="1 5" strokeOpacity={0.6} />;
}

function Layer({ i, explode, labels, live }: { i: number; explode: MotionValue<number>; labels: MotionValue<number>; live: MotionValue<number> }) {
  const layer = LAYERS[i];
  const t = useTransform(explode, (e) => `translate(0 ${-(i * (H + GAP) + e * i * SPREAD)})`);
  const labelO = useTransform(labels, (l) => ramp(l, i / 6, i / 6 + 0.35));
  const ledIdle = useTransform(live, (l) => 1 - l);
  // Point d'attache du label : coin avant droit, à mi-hauteur de la couche (repère non éclaté).
  const [ax] = iso(W / 2, D / 2, H / 2);
  const [lx, ly] = iso(W / 2 - 14, D / 2, H / 2);
  return (
    <MotionTransform transform={t}>
      <IsoBox
        at={[-W / 2, -D / 2, 0]}
        size={[W, D, H]}
        r={3}
        top={<Top kind={layer.key} />}
        front={
          <g>
            <Front kind={layer.key} />
            <motion.circle cx={W - 12} cy={-12} r={2.4} strokeWidth={1} style={{ opacity: ledIdle }} />
            <motion.circle cx={W - 12} cy={-12} r={2.4} fill="var(--live)" stroke="none" className="led-blink" style={{ opacity: live, animationDelay: `${i * 0.25}s` }} />
          </g>
        }
      />
      <motion.g style={{ opacity: labelO }} strokeWidth={1}>
        <path d={`M${lx} ${ly}L${ax + 24} ${ly}H${LABEL_X}`} strokeDasharray="2 3" strokeOpacity={0.6} />
        <circle cx={lx} cy={ly} r={1.6} fill="currentColor" stroke="none" />
        <text x={LABEL_X + 6} y={ly - 2} fill="var(--foreground)" stroke="none" className="font-mono text-[15px] sm:text-[13px] lg:text-[11px]">
          {layer.label.split(" · ")[0]}
        </text>
        <text x={LABEL_X + 6} y={ly + 14} fill="var(--muted)" stroke="none" className="font-mono text-[13px] sm:text-[12px] lg:text-[10px]">
          {layer.label.split(" · ")[1] ?? ""}
        </text>
      </motion.g>
    </MotionTransform>
  );
}

export default function RackExploded({ explode, labels, live }: { explode: MotionValue<number>; labels: MotionValue<number>; live: MotionValue<number> }) {
  return (
    <g className="svg-hairline" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" fill="none">
      {LAYERS.map((l, i) => (
        <Layer key={l.key} i={i} explode={explode} labels={labels} live={live} />
      ))}
    </g>
  );
}
