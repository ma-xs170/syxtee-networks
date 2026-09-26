"use client";

import Link from "next/link";
import ScrollStory, { type StoryScene } from "@/components/story/ScrollStory";
import MoblinStage from "./MoblinStage";

// ScrollStory de /moblin, centré sur un iPhone filaire en paysage (4 scènes).

const APP_STORE = "https://apps.apple.com/app/id6466745933";

const breadcrumb = (
  <nav aria-label="Fil d'Ariane" className="mb-6 font-mono text-xs text-muted lg:mb-8">
    <ol className="flex flex-wrap items-center gap-2">
      <li>
        <Link href="/" className="hover:text-foreground">Accueil</Link>
      </li>
      <li aria-hidden="true" className="text-white/20">/</li>
      <li aria-current="page" className="text-foreground">Moblin</li>
    </ol>
  </nav>
);

const stage = (p: Parameters<StoryScene["render"]>[1]["global"]) => <MoblinStage p={p} />;

const scenes: StoryScene[] = [
  {
    header: breadcrumb,
    kicker: "01 · Moblin",
    title: "Ton encodeur IRL dans la poche.",
    titleAs: "h1",
    paragraphs: [
      "Gratuit et open source, sur iPhone.",
      "Il filme, encode et envoie ton live sur plusieurs connexions en même temps.",
    ],
    footer: (
      <a
        href={APP_STORE}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-medium transition-colors hover:bg-white/5"
      >
        Télécharger sur l&apos;App Store <span aria-hidden="true">↗</span>
      </a>
    ),
    staticAt: 0.2,
    render: (_, { global }) => stage(global),
  },
  {
    kicker: "02 · Bonding",
    title: "Une connexion faiblit ? Les autres compensent.",
    paragraphs: ["Moblin répartit ta vidéo sur toutes tes connexions.", "Le total reste stable, même quand le réseau varie."],
    staticAt: 0.42,
    render: (_, { global }) => stage(global),
  },
  {
    kicker: "03 · SYXTEE",
    title: "Colle l'adresse du relais. Lance le live.",
    paragraphs: ["L'adresse et ton identifiant sont donnés sur le Discord.", "C'est tout : le relais s'occupe du reste."],
    footer: (
      <a
        href="#tutoriel"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-medium transition-colors hover:bg-white/5"
      >
        Configurer pas à pas <span aria-hidden="true">↓</span>
      </a>
    ),
    staticAt: 0.72,
    render: (_, { global }) => stage(global),
  },
  {
    kicker: "04 · + de réseau",
    title: "Ajoute une 2e 4G en quelques minutes.",
    paragraphs: [
      "Ton iPhone n'utilise qu'une ligne de données à la fois. Pour ajouter une 4G, on passe par un 2e appareil.",
      "Installe une eSIM Saily sur un téléphone Android avec l'app Moblink : il s'ajoute automatiquement au bonding de Moblin.",
      "Deux opérateurs différents = beaucoup moins de risques de coupure.",
    ],
    footer: (
      <Link
        href="/saily"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
      >
        Ajouter une 4G avec Saily <span aria-hidden="true">→</span>
      </Link>
    ),
    staticAt: 0.95,
    render: (_, { global }) => stage(global),
  },
];

export default function MoblinStory() {
  return (
    <ScrollStory
      aria-label="Moblin, de l'encodeur de poche au live sur le relais SYXTEE"
      className="border-b border-line"
      scenes={scenes}
      stage={(p) => <MoblinStage p={p} />}
    />
  );
}
