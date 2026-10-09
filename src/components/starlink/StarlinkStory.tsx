"use client";

import Link from "next/link";
import { motion, useTransform, type MotionValue } from "motion/react";
import Starfield from "@/components/illustrations/Starfield";
import ScrollStory, { type StoryScene } from "@/components/story/ScrollStory";
import StoryStage from "@/components/story/StoryStage";
import MiniExploded from "./MiniExploded";
import { FlowOverlay, GroundLayer, SkyLayer } from "./SkyGround";
import { FINALE_BAND, PARA_BANDS, SCENE_BANDS, SCENE_STARTS, STATIC_AT, ramp, skyState } from "./timeline";

// Scrollytelling Starlink en 3 scènes : le Mini en squelette → là-haut → au sol.
// Construit sur le moteur ScrollStory, avec les fenêtres réglées à la main de ./timeline :
// un conteneur de 400vh et un seul visuel persistant (le ciel, le sol et le Mini se relaient dans la même scène).

const keyFigures = [
  { v: "1,10 kg", l: "Poids" },
  { v: "Wi-Fi 5", l: "Intégré" },
  { v: "USB-C 100 W", l: "Alimentation" },
  { v: "IP67", l: "Pluie et poussière" },
];

function Finale() {
  return (
    <div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4 lg:grid-cols-2">
        {keyFigures.map((k) => (
          <div key={k.v} className="bg-background px-4 py-3">
            <dt className="sr-only">{k.l}</dt>
            <dd className="font-mono text-base text-foreground sm:text-lg">{k.v}</dd>
            <dd className="mt-0.5 text-xs text-muted">{k.l}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5">
        <Link href="/dashboard/support" className="inline-flex items-center justify-center gap-2 rounded-full border border-line-strong px-5 py-3 text-sm font-medium transition-colors hover:bg-foreground/[0.08]">Une question ? Assistance</Link>
      </div>
    </div>
  );
}

// La page /starlink commence directement par l'histoire : fil d'Ariane et h1 dans la scène 1.
const breadcrumb = (
  <nav aria-label="Fil d'Ariane" className="mb-6 font-mono text-xs text-muted lg:mb-8">
    <ol className="flex flex-wrap items-center gap-2">
      <li>
        <Link href="/" className="hover:text-foreground">Accueil</Link>
      </li>
      <li aria-hidden="true" className="text-foreground/20">/</li>
      <li aria-current="page" className="text-foreground">Starlink</li>
    </ol>
  </nav>
);

const scenes: StoryScene[] = [
  {
    header: breadcrumb,
    kicker: "01 · Comment ça marche",
    title: "Une antenne qui vise le ciel toute seule.",
    titleAs: "h1",
    subtitle: <p className="mt-3 font-mono text-xs text-foreground">1,10 kg · Wi-Fi intégré · USB-C 100 W</p>,
    paragraphs: [
      "L'antenne à réseau phasé oriente son faisceau électroniquement vers les satellites, sans aucune pièce mobile.",
      "Le routeur Wi-Fi est intégré : ton iPhone s'y connecte directement, sans boîtier en plus.",
      "1,10 kg, alimenté en USB-C : une powerbank suffit.",
    ],
    band: SCENE_BANDS[0],
    paragraphBands: [...PARA_BANDS[0]],
    staticAt: STATIC_AT[0],
    render: (_, { global }) => (
      <StoryStage>
        <MiniExploded p={global} />
      </StoryStage>
    ),
  },
  {
    kicker: "02 · En orbite",
    title: "Des milliers de satellites au-dessus de toi.",
    paragraphs: [
      "Starlink utilise des satellites en orbite basse : bien plus proches que les satellites classiques, donc beaucoup moins de latence.",
      "Ils défilent en permanence : ton antenne passe de l'un à l'autre sans couper la connexion.",
    ],
    band: SCENE_BANDS[1],
    paragraphBands: [...PARA_BANDS[1]],
    staticAt: STATIC_AT[1],
    staticBackdrop: (global) => <Starfield p={global} state={skyState} animate={false} className="absolute inset-0 h-full w-full opacity-70" />,
    render: (_, { global }) => (
      <StoryStage>
        <SkyLayer p={global} />
      </StoryStage>
    ),
  },
  {
    kicker: "03 · Réception",
    title: "Le signal arrive, ton live part.",
    paragraphs: [
      "Le Mini reçoit le signal du satellite et le partage en Wi-Fi.",
      "Moblin combine ce Wi-Fi avec ta 4G/5G : si le ciel est masqué, le réseau mobile prend le relais.",
      "Le relais SYXTEE recolle le tout et l'envoie dans ton OBS.",
    ],
    band: SCENE_BANDS[2],
    paragraphBands: [...PARA_BANDS[2]],
    footer: <Finale />,
    footerBand: FINALE_BAND,
    staticAt: STATIC_AT[2],
    render: (_, { global }) => (
      <StoryStage overlay={<FlowOverlay p={global} />}>
        <SkyLayer p={global} />
        <GroundLayer p={global} />
      </StoryStage>
    ),
  },
];

// Voile derrière le texte pour garder la lisibilité par-dessus les étoiles.
function SkyVeil({ p }: { p: MotionValue<number> }) {
  const opacity = useTransform(p, (v) => ramp(v, 0.3, 0.37));
  return (
    <motion.div
      style={{ opacity }}
      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/70 via-40% to-transparent to-55% lg:bg-gradient-to-r lg:from-background/85 lg:via-background/50 lg:via-35% lg:to-transparent lg:to-55%"
    />
  );
}

export default function StarlinkStory() {
  return (
    <ScrollStory
      aria-label="Comment fonctionne le Starlink Mini"
      className="border-b border-line"
      scenes={scenes}
      height="400vh"
      starts={SCENE_STARTS}
      backdrop={(p) => (
        <>
          <Starfield p={p} state={skyState} className="absolute inset-0 h-full w-full" />
          <SkyVeil p={p} />
        </>
      )}
      stage={(p) => (
        <StoryStage overlay={<FlowOverlay p={p} />}>
          <SkyLayer p={p} />
          <GroundLayer p={p} />
          <MiniExploded p={p} />
        </StoryStage>
      )}
    />
  );
}
