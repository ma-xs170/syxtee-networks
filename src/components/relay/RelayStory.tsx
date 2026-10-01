"use client";

import Link from "next/link";
import { motion, useTransform, type MotionValue } from "motion/react";
import { RackCorridor } from "@/components/illustrations/DataCenter";
import ScrollStory, { type StoryScene } from "@/components/story/ScrollStory";
import StoryStage from "@/components/story/StoryStage";
import { band, clamp01, ramp } from "@/components/story/timeline";
import { useStoryClock } from "@/components/story/useStoryClock";
import { OutputLine, OutputOverlay } from "./OutputScene";
import RackExploded from "./RackExploded";
import SortingScene from "./SortingScene";

// ScrollStory de /relais en 3 scènes : le rack → le tri des paquets → la sortie vers OBS.
// La scène 2 (le tri) est la plus longue : elle occupe presque la moitié du scroll.

const STARTS = [0, 0.28, 0.76] as const;
const sortProgress = (v: number) => clamp01((v - 0.3) / 0.44);
const outProgress = (v: number) => clamp01((v - 0.78) / 0.2);

export type RelayLayer = "rack" | "sort" | "out";
const ALL: RelayLayer[] = ["rack", "sort", "out"];

function RackLayer({ p }: { p: MotionValue<number> }) {
  const explode = useTransform(p, (v) => ramp(v, 0.02, 0.18));
  const labels = useTransform(p, (v) => ramp(v, 0.06, 0.2));
  const live = useTransform(p, (v) => ramp(v, 0.18, 0.24));
  const opacity = useTransform(p, (v) => 1 - ramp(v, 0.25, 0.3));
  const room = useTransform(p, (v) => 0.28 * (1 - ramp(v, 0.24, 0.3)));
  return (
    <>
      <motion.g style={{ opacity: room }} className="svg-hairline" stroke="currentColor" strokeWidth={1} fill="none">
        <RackCorridor advance={0} />
      </motion.g>
      <motion.g style={{ opacity }}>
        <g transform="translate(170 470)">
          <RackExploded explode={explode} labels={labels} live={live} />
        </g>
      </motion.g>
    </>
  );
}

function SortLayer({ p, time }: { p: MotionValue<number>; time: MotionValue<number> }) {
  const s = useTransform(p, sortProgress);
  const opacity = useTransform(p, (v) => band(v, 0.27, 0.31, 0.77, 0.8));
  return (
    <motion.g style={{ opacity }}>
      <SortingScene s={s} time={time} />
    </motion.g>
  );
}

function OutLayer({ p }: { p: MotionValue<number> }) {
  const o = useTransform(p, outProgress);
  const opacity = useTransform(p, (v) => ramp(v, 0.76, 0.79));
  return (
    <motion.g style={{ opacity }}>
      <OutputLine o={o} />
    </motion.g>
  );
}

function OutOverlayLayer({ p, time }: { p: MotionValue<number>; time: MotionValue<number> }) {
  const o = useTransform(p, outProgress);
  return <OutputOverlay o={o} time={time} />;
}

function RelayStage({ p, layers = ALL }: { p: MotionValue<number>; layers?: RelayLayer[] }) {
  const time = useStoryClock();
  const has = (l: RelayLayer) => layers.includes(l);
  return (
    <StoryStage overlay={has("out") ? <OutOverlayLayer p={p} time={time} /> : undefined}>
      {has("rack") && <RackLayer p={p} />}
      {has("sort") && <SortLayer p={p} time={time} />}
      {has("out") && <OutLayer p={p} />}
    </StoryStage>
  );
}

const breadcrumb = (
  <nav aria-label="Fil d'Ariane" className="mb-6 font-mono text-xs text-muted lg:mb-8">
    <ol className="flex flex-wrap items-center gap-2">
      <li>
        <Link href="/" className="hover:text-foreground">Accueil</Link>
      </li>
      <li aria-hidden="true" className="text-foreground/20">/</li>
      <li aria-current="page" className="text-foreground">Relais</li>
    </ol>
  </nav>
);

const scenes: StoryScene[] = [
  {
    header: breadcrumb,
    kicker: "01 · Le serveur",
    title: "Un relais qui tourne 24h/24 à New York.",
    titleAs: "h1",
    paragraphs: [
      "Il attend ton flux en permanence : tu te connectes quand tu veux.",
      "Placé sur la côte Est, il est bien relié aux Antilles et aux serveurs des plateformes.",
    ],
    staticAt: 0.22,
    render: (_, { global }) => <RelayStage p={global} layers={["rack"]} />,
  },
  {
    kicker: "02 · Le tri",
    title: "Les paquets arrivent en vrac. Le relais les remet dans l'ordre.",
    paragraphs: [
      "Tes connexions n'ont pas toutes la même vitesse : les morceaux arrivent mélangés.",
      "Le relais les range grâce à leur numéro. S'il en manque un, il le redemande.",
      "Si une connexion coupe, les autres prennent le relais : c'est le bonding.",
    ],
    // Paragraphes calés sur l'animation : désordre → paquet 7 redemandé → coupure de la 4G.
    paragraphBands: [
      [-1, 0, 0.42, 0.44],
      [0.44, 0.46, 0.56, 0.58],
      [0.58, 0.6, 2, 3],
    ],
    staticAt: 0.46,
    render: (_, { global }) => <RelayStage p={global} layers={["sort"]} />,
  },
  {
    kicker: "03 · La sortie",
    title: "Un flux propre, prêt pour ton OBS.",
    paragraphs: ["Dans OBS, tu ajoutes une source SRT : c'est tout.", "Tes scènes, overlays et alertes restent chez toi."],
    staticAt: 1,
    render: (_, { global }) => <RelayStage p={global} layers={["out"]} />,
  },
];

export default function RelayStory() {
  return (
    <ScrollStory
      aria-label="Comment fonctionne le relais SYXTEE"
      className="border-b border-line"
      scenes={scenes}
      starts={STARTS}
      height="520vh"
      stage={(p) => <RelayStage p={p} />}
    />
  );
}
