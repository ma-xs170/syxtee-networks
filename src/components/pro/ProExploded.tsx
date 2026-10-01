"use client";

import { SceneG, T } from "@/components/fonctionnement/kit";
import StoryStage from "@/components/story/StoryStage";

// Illustration filaire statique du SYXTEE PRO (repère 600 × 600) : repli sans WebGL, en prefers-reduced-motion,
// et pendant le chargement de la scène 3D. `closed` : le sac fermé, vu de face ; sinon la vue éclatée légendée.

function MeshPattern() {
  return (
    <defs>
      <pattern id="pro-mesh" width="12" height="12" patternUnits="userSpaceOnUse">
        <path d="M6 1L11 6L6 11L1 6Z" fill="none" stroke="currentColor" strokeWidth={0.8} opacity={0.45} />
      </pattern>
    </defs>
  );
}

/** Sac vu de face : corps arrondi, bretelles qui dépassent, poignée, poche avant en mesh. */
function Bag({ x, y, w, h, faded = false }: { x: number; y: number; w: number; h: number; faded?: boolean }) {
  const px = w * 0.14;
  return (
    <g opacity={faded ? 0.45 : 1} strokeDasharray={faded ? "4 5" : undefined}>
      <path d={`M${x + w * 0.2} ${y + 4}C${x - w * 0.14} ${y + h * 0.3} ${x - w * 0.12} ${y + h * 0.75} ${x + w * 0.08} ${y + h - 4}`} />
      <path d={`M${x + w * 0.8} ${y + 4}C${x + w * 1.14} ${y + h * 0.3} ${x + w * 1.12} ${y + h * 0.75} ${x + w * 0.92} ${y + h - 4}`} />
      <path d={`M${x + w * 0.38} ${y}Q${x + w / 2} ${y - h * 0.1} ${x + w * 0.62} ${y}`} />
      <rect x={x} y={y} width={w} height={h} rx={w * 0.2} fill="var(--background)" />
      <rect x={x + px} y={y + h * 0.38} width={w - 2 * px} height={h * 0.54} rx={w * 0.12} fill="url(#pro-mesh)" />
      <rect x={x + px} y={y + h * 0.38} width={w - 2 * px} height={h * 0.54} rx={w * 0.12} />
      <path d={`M${x + px + 6} ${y + h * 0.3}H${x + w - px - 6}`} strokeDasharray="1 4" opacity={0.6} />
    </g>
  );
}

function Encoder({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g>
      <path d={`M${x + s * 0.14} ${y}L${x + s * 0.02} ${y - s * 0.34}`} strokeWidth={2} />
      <path d={`M${x + s * 0.86} ${y}L${x + s * 0.98} ${y - s * 0.34}`} strokeWidth={2} />
      <rect x={x} y={y} width={s} height={s} rx={s * 0.15} fill="var(--background)" />
      <text x={x + s / 2} y={y + s * 0.5} textAnchor="middle" stroke="none" fill="currentColor" fontSize={s * 0.34} fontWeight={600}>
        S
      </text>
      {[0, 1, 2, 3, 4].map((k) => (
        <path key={k} d={`M${x + s * 0.22} ${y + s * (0.66 + k * 0.06)}H${x + s * 0.78}`} opacity={0.7} />
      ))}
      <circle cx={x + s * 0.85} cy={y + s * 0.15} r={3.5} fill="var(--live)" stroke="none" />
    </g>
  );
}

function Battery({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={48} height={112} rx={10} fill="var(--background)" />
      <rect x={x + 16} y={y - 5} width={16} height={5} rx={2} />
      {[0, 1, 2].map((k) => (
        <rect key={k} x={x + 12} y={y + 64 - k * 22} width={24} height={14} rx={3} fill="currentColor" fillOpacity={0.35 - k * 0.1} stroke="none" />
      ))}
    </g>
  );
}

function Exploded() {
  return (
    <>
      <Bag x={235} y={250} w={140} h={200} faded />

      {/* Lignes d'éclatement */}
      <g strokeDasharray="2 5" opacity={0.45}>
        <path d="M160 250L240 300" />
        <path d="M425 215L360 270" />
        <path d="M455 380L370 380" />
      </g>

      {/* Compartiment Starlink Mini */}
      <rect x={40} y={160} width={120} height={150} rx={10} fill="var(--background)" />
      <rect x={52} y={172} width={96} height={126} rx={6} opacity={0.4} />
      <T x={100} y={340} anchor="middle" size="sm" strong>
        COMPARTIMENT STARLINK MINI
      </T>

      {/* Encodeur + ports */}
      <Encoder x={420} y={110} s={110} />
      <T x={475} y={64} anchor="middle" size="sm" strong>
        ENCODEUR SYXTEE · 4G/5G BONDING
      </T>
      <rect x={414} y={140} width={6} height={18} rx={1} fill="currentColor" stroke="none" />
      <rect x={414} y={180} width={6} height={12} rx={3} fill="currentColor" stroke="none" />
      <path d="M412 149H396" opacity={0.6} />
      <path d="M412 186H396" opacity={0.6} />
      <T x={390} y={153} anchor="end" size="sm">
        ENTRÉE CAMÉRA HDMI
      </T>
      <T x={390} y={190} anchor="end" size="sm">
        PORT IPHONE USB-C
      </T>

      {/* 2 batteries */}
      <Battery x={440} y={390} />
      <Battery x={500} y={390} />
      <T x={494} y={538} anchor="middle" size="sm" strong>
        ÉNERGIE · 2 BATTERIES USB-C
      </T>
    </>
  );
}

export function ProDrawing({ closed = false }: { closed?: boolean }) {
  return (
    <>
      <MeshPattern />
      <SceneG>
        {closed ? (
          <>
            <Bag x={200} y={130} w={200} h={300} />
            <circle cx={300} cy={190} r={16} />
            <text x={300} y={196} textAnchor="middle" stroke="none" fill="currentColor" fontSize={16} fontWeight={600}>
              S
            </text>
            <T x={300} y={500} anchor="middle" size="sm" strong>
              SYXTEE PRO
            </T>
          </>
        ) : (
          <Exploded />
        )}
      </SceneG>
    </>
  );
}

export default function ProExploded({ closed = false }: { closed?: boolean }) {
  return (
    <StoryStage>
      <ProDrawing closed={closed} />
    </StoryStage>
  );
}
