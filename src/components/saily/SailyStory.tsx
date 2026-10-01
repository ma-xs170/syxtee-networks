"use client";

import Link from "next/link";
import type { MotionValue } from "motion/react";
import { AndroidDrawing, ChipGlyph } from "@/components/illustrations/PhoneAndroid";
import { MoblinDrawing } from "@/components/illustrations/PhoneMoblin";
import { SceneDefs, SceneG, T, band, easeOut, lerp, ramp, useV } from "@/components/fonctionnement/kit";
import PromoCode from "@/components/partners/PromoCode";
import { SailyLink } from "@/components/partners/Saily";
import ScrollStory, { type StoryScene } from "@/components/story/ScrollStory";
import StoryStage from "@/components/story/StoryStage";
import Highlight from "@/components/ui/Highlight";

// Mini ScrollStory de /saily : l'eSIM s'installe dans le 2e téléphone → il rejoint le bonding → CELL 2 · SAILY.

const GREEN = "#4ade80"; // marge de sécurité (jauge qui passe au vert)
const C = Math.cos(Math.PI / 6);

/* ───────────── 1 · L'eSIM s'installe ───────────── */

// Téléphone Android : échelle 1,9, centré dans la scène. Cible de la puce (centre de la puce à l'écran).
const A1 = { tx: 243, ty: 471, s: 1.9 };
const TARGET = { x: A1.tx + A1.s * 23.4, y: A1.ty + A1.s * -52 };

function SceneEsim({ progress }: { progress: MotionValue<number> }) {
  const v = useV(progress);
  const fly = easeOut(ramp(v, 0.15, 0.6));
  const docked = v >= 0.6;
  const s = lerp(3.4, A1.s * 1.5, fly);
  // La puce se redresse dans le plan de l'écran (cisaillement isométrique) en arrivant.
  const shear = lerp(0, 0.5, fly);
  const cx = lerp(500, TARGET.x, fly);
  const cy = lerp(120, TARGET.y, fly) - Math.sin(fly * Math.PI) * 40;
  const m = `matrix(${(lerp(1, C, fly) * s).toFixed(3)} ${(shear * s).toFixed(3)} 0 ${s.toFixed(3)} ${(cx - 12 * s).toFixed(1)} ${(cy - 15 * s - shear * 12 * s).toFixed(1)})`;
  return (
    <g>
      <SceneDefs />
      <SceneG>
        <g transform={`translate(${A1.tx} ${A1.ty}) scale(${A1.s})`}>
          <AndroidDrawing screen={docked ? "data" : "esim"} lit={docked} />
        </g>
        {!docked && (
          <g>
            <path d={`M500 120Q${(500 + TARGET.x) / 2} 60 ${TARGET.x} ${TARGET.y}`} strokeWidth={1} strokeDasharray="2 5" opacity={0.5 * (1 - fly)} />
            <g transform={m}>
              <ChipGlyph x={0} y={0} s={1} lit={fly > 0.8} />
            </g>
            <T x={cx} y={cy - 70} anchor="middle" size="sm" strong opacity={1 - fly}>
              eSIM SAILY
            </T>
          </g>
        )}
        <g opacity={ramp(v, 0.62, 0.72)}>
          <rect x={380} y={150} width={150} height={26} rx={13} fill="var(--background)" strokeWidth={1} />
          <T x={455} y={168} anchor="middle" size="sm" strong>
            ACTIVÉE · DATA 4G
          </T>
          <path d={`M380 163H${TARGET.x + 40}`} strokeWidth={1} strokeDasharray="2 4" opacity={0.6} />
        </g>
        <g opacity={band(v, 0, 0.1, 0.5, 0.6)}>
          <T x={300} y={560} anchor="middle" size="sm">
            SANS CARTE PHYSIQUE · INSTALLÉE DEPUIS L&apos;APP
          </T>
        </g>
      </SceneG>
    </g>
  );
}

/* ───────────── 2 · Il rejoint le bonding ───────────── */

function SceneJoin({ progress }: { progress: MotionValue<number> }) {
  const v = useV(progress);
  const slide = easeOut(ramp(v, 0, 0.35));
  const link = ramp(v, 0.35, 0.5);
  const connected = ramp(v, 0.55, 0.65);
  return (
    <g>
      <SceneDefs />
      <SceneG>
        {/* iPhone avec Moblin */}
        <g transform="translate(125 560) scale(1.3)">
          <MoblinDrawing waves={false} />
        </g>
        <T x={165} y={500} anchor="middle" size="sm">
          iPHONE · MOBLIN
        </T>
        {/* 2e téléphone Android qui glisse depuis la droite */}
        <g transform={`translate(${lerp(700, 391, slide).toFixed(1)} 417) scale(1.3)`}>
          <AndroidDrawing screen="moblink" lit={connected > 0.5} />
        </g>
        <T x={lerp(740, 430, slide)} y={500} anchor="middle" size="sm">
          ANDROID · MOBLINK
        </T>
        {/* Réseau local */}
        <g opacity={link}>
          <path d={`M225 300H${lerp(225, 380, link)}`} strokeWidth={1.25} strokeDasharray="4 5" />
          <T x={302} y={288} anchor="middle" size="sm" strong>
            RÉSEAU LOCAL
          </T>
          <T x={302} y={322} anchor="middle" size="sm">
            partage de connexion / Wi-Fi
          </T>
        </g>
        <g opacity={connected}>
          <rect x={336} y={116} width={196} height={28} rx={14} fill="var(--background)" strokeWidth={1.25} />
          <circle cx={354} cy={130} r={3} fill={GREEN} stroke="none" />
          <T x={442} y={135} anchor="middle" size="sm" strong>
            Connected to streamer
          </T>
        </g>
      </SceneG>
    </g>
  );
}

/* ───────────── 3 · CELL 2 · SAILY ───────────── */

const ROWS = [
  { l: "CELL 1 · 4G", kbps: 3200 },
  { l: "WI-FI", kbps: 2800 },
  { l: "CELL 2 · SAILY", kbps: 3000 },
];
const VIDEO = 6000; // bitrate vidéo demandé
const SCALE = 10000;

function SceneBonding({ progress }: { progress: MotionValue<number> }) {
  const v = useV(progress);
  const add = ramp(v, 0.25, 0.5);
  const total = lerp(6000, 9000, add);
  const x0 = 90;
  const barW = 420;
  const px = (k: number) => (k / SCALE) * barW;
  return (
    <g>
      <SceneDefs />
      <SceneG>
        <rect x={60} y={100} width={480} height={400} rx={14} fill="currentColor" fillOpacity={0.03} />
        <T x={84} y={132} size="sm" strong>
          BONDING · MOBLIN
        </T>
        <circle cx={512} cy={127} r={3} fill="var(--live)" stroke="none" className="led-blink" />
        {ROWS.map((r, i) => {
          const isNew = i === 2;
          const o = isNew ? add : 1;
          const y = 180 + i * 56;
          return (
            <g key={r.l} opacity={o} transform={isNew ? `translate(${lerp(40, 0, add).toFixed(1)} 0)` : undefined}>
              <T x={x0} y={y} size="sm" strong={isNew}>
                {r.l}
              </T>
              <T x={x0 + barW} y={y} anchor="end" size="sm">
                {`${r.kbps.toLocaleString("fr-FR")} kbps`}
              </T>
              <rect x={x0} y={y + 10} width={barW} height={10} rx={5} strokeWidth={1} opacity={0.4} />
              <rect x={x0} y={y + 10} width={(r.kbps / 3500) * barW * (isNew ? add : 1)} height={10} rx={5} fill="currentColor" fillOpacity={isNew ? 0.85 : 0.5} stroke="none" />
            </g>
          );
        })}

        {/* Total + marge de sécurité au-dessus du bitrate vidéo */}
        <path d={`M84 356H516`} strokeWidth={1} opacity={0.3} />
        <T x={x0} y={390} size="md" strong>
          TOTAL
        </T>
        <T x={x0 + barW} y={390} anchor="end" size="md" strong>
          {`~${(Math.round(total / 100) * 100).toLocaleString("fr-FR")} kbps`}
        </T>
        <rect x={x0} y={404} width={barW} height={16} rx={8} strokeWidth={1} />
        <rect x={x0 + 2} y={406} width={px(Math.min(total, VIDEO)) - 2} height={12} rx={6} fill="currentColor" fillOpacity={0.45} stroke="none" />
        <rect x={x0 + px(VIDEO)} y={406} width={Math.max(0, px(total - VIDEO) - 2)} height={12} rx={6} fill={GREEN} fillOpacity={0.75} stroke="none" />
        <path d={`M${x0 + px(VIDEO)} 398V428`} strokeWidth={1.25} strokeDasharray="2 2" />
        <T x={x0 + px(VIDEO)} y={446} anchor="middle" size="sm">
          BITRATE VIDÉO
        </T>
        <g opacity={add}>
          <T x={x0 + barW} y={470} anchor="end" size="sm" strong>
            MARGE DE SÉCURITÉ ✓
          </T>
        </g>
      </SceneG>
    </g>
  );
}

function Breadcrumb() {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-6 font-mono text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="hover:text-foreground">
            Accueil
          </Link>
        </li>
        <li aria-hidden="true" className="text-foreground/20">
          /
        </li>
        <li className="text-muted">Outils</li>
        <li aria-hidden="true" className="text-foreground/20">
          /
        </li>
        <li aria-current="page" className="text-foreground">
          Saily
        </li>
      </ol>
    </nav>
  );
}

const scenes: StoryScene[] = [
  {
    kicker: "01 · L'eSIM",
    titleAs: "h1",
    title: (
      <>
        Une 4G de plus, <Highlight>en quelques minutes.</Highlight>
      </>
    ),
    header: <Breadcrumb />,
    paragraphs: [
      "Ton iPhone n'utilise qu'une ligne de données à la fois : impossible d'y ajouter une 2e 4G.",
      "L'eSIM Saily s'installe donc sur un 2e appareil, un téléphone Android, depuis l'app et sans carte physique.",
    ],
    render: (p) => (
      <StoryStage>
        <SceneEsim progress={p} />
      </StoryStage>
    ),
    staticAt: 0.28,
  },
  {
    kicker: "02 · Moblink",
    title: "Le 2e téléphone rejoint ton bonding.",
    paragraphs: [
      "Avec l'app Moblink, il se connecte à Moblin via le partage de connexion de l'iPhone ou un même Wi-Fi.",
      "Même mot de passe des deux côtés : « Connected to streamer ».",
    ],
    render: (p) => (
      <StoryStage>
        <SceneJoin progress={p} />
      </StoryStage>
    ),
    staticAt: 0.6,
  },
  {
    kicker: "03 · Bonding",
    title: "Une connexion de plus, une marge de plus.",
    paragraphs: [
      "La 4G du 2e téléphone s'ajoute au total de Moblin : de ~6 000 à ~9 000 kbps.",
      "Deux opérateurs différents = beaucoup moins de risques de coupure.",
    ],
    footer: (
      <div className="flex flex-col gap-4">
        <SailyLink code={false} />
        <div className="hidden sm:block">
          <PromoCode />
        </div>
      </div>
    ),
    render: (p) => (
      <StoryStage>
        <SceneBonding progress={p} />
      </StoryStage>
    ),
    staticAt: 0.92,
  },
];

export default function SailyStory() {
  return <ScrollStory aria-label="Une 4G de plus avec Saily" className="border-b border-line" scenes={scenes} height="360vh" />;
}
