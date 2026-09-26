"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import ScrollStory, { type StoryScene } from "@/components/story/ScrollStory";
import StoryStage from "@/components/story/StoryStage";
import { DiscordButton } from "@/components/ui";
import Highlight from "@/components/ui/Highlight";
import { useNarrow } from "./kit";
import { SceneAntennas, SceneCapture, SceneInternet } from "./scenesA";
import { SceneDataCenter, SceneServer, SceneSubsea } from "./scenesB";
import { SceneHome, SceneLive, SceneObs } from "./scenesC";
import TripMap from "./TripMap";

// « Le trajet d'un live, de A à Z » : 9 scènes (~110vh chacune), un même paquet vidéo #0427 suivi de bout en bout.

const N = 9;
const at = (i: number, f: number) => (i + f) / N; // progrès global figé de la scène i en version statique

const stage = (node: ReactNode) => <StoryStage>{node}</StoryStage>;

function Breadcrumb() {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-6 font-mono text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="pointer-events-auto hover:text-foreground">
            Accueil
          </Link>
        </li>
        <li aria-hidden="true" className="text-white/20">
          /
        </li>
        <li aria-current="page" className="text-foreground">
          Fonctionnement
        </li>
      </ol>
    </nav>
  );
}

export default function FonctionnementStory() {
  const narrow = useNarrow();
  const scenes: StoryScene[] = [
    {
      kicker: "01 · Téléphone",
      title: "Tout commence dans ta poche.",
      titleAs: "h1",
      header: <Breadcrumb />,
      paragraphs: ["La caméra filme, Moblin compresse la vidéo en temps réel.", "Puis il la découpe en milliers de petits paquets numérotés."],
      render: (p) => stage(<SceneCapture progress={p} />),
      staticAt: at(0, 0.8),
    },
    {
      kicker: "02 · Antennes",
      title: "Trois chemins valent mieux qu'un.",
      paragraphs: [
        "Moblin envoie les paquets sur toutes tes connexions en même temps : c'est le bonding SRTLA.",
        "Une antenne sature ? Les paquets passent par les autres.",
      ],
      render: (p) => stage(<SceneAntennas progress={p} narrow={narrow} />),
      staticAt: at(1, 0.75),
    },
    {
      kicker: "03 · Internet",
      title: "Tes paquets traversent le réseau.",
      paragraphs: ["Ils passent de routeur en routeur, en quelques millisecondes.", "Direction : la côte, là où partent les câbles sous-marins."],
      render: (p) => stage(<SceneInternet progress={p} />),
      staticAt: at(2, 0.55),
    },
    {
      kicker: "04 · Sous l'océan",
      title: (
        <>
          Ta vidéo traverse la mer… <Highlight>en lumière.</Highlight>
        </>
      ),
      paragraphs: [
        "Des câbles en fibre optique posés au fond de l'océan relient les Antilles au continent.",
        "Tes paquets y voyagent sous forme d'impulsions de lumière.",
      ],
      render: (p) => stage(<SceneSubsea progress={p} narrow={narrow} />),
      staticAt: at(3, 0.6),
    },
    {
      kicker: "05 · New York",
      title: "Arrivée au data center.",
      paragraphs: ["Ton relais SYXTEE tourne 24h/24 dans un data center à New York.", "Tes 3 flux y arrivent… mais pas dans l'ordre."],
      render: (p) => stage(<SceneDataCenter progress={p} />),
      staticAt: at(4, 0.86),
    },
    {
      kicker: "06 · Le relais",
      title: "On remet tout dans l'ordre.",
      paragraphs: ["Le relais range les paquets grâce à leur numéro.", "S'il en manque un, il le redemande. Le flux ressort propre et continu."],
      render: (p) => stage(<SceneServer progress={p} />),
      staticAt: at(5, 0.76),
    },
    {
      kicker: "07 · Chez toi",
      title: "Le flux arrive sur ton PC.",
      paragraphs: ["Ton OBS récupère le flux du relais comme une simple source vidéo.", "Ton PC peut rester à la maison pendant que tu es dehors."],
      render: (p) => stage(<SceneHome progress={p} />),
      staticAt: at(6, 0.8),
    },
    {
      kicker: "08 · OBS",
      title: (
        <>
          Tu gardes <Highlight>le contrôle total.</Highlight>
        </>
      ),
      paragraphs: [
        "Dans OBS, ajoute une source Média avec l'adresse SRT du relais.",
        "Tes scènes, overlays, alertes et chat restent les tiens.",
        "Signal perdu ? OBS peut basculer automatiquement sur ta scène BRB.",
      ],
      render: (p) => stage(<SceneObs progress={p} />),
      staticAt: at(7, 0.62),
    },
    {
      kicker: "09 · Live",
      title: "Et le monde te regarde.",
      paragraphs: ["Tout ce trajet prend quelques secondes.", "Toi, tu profites de ton live."],
      footer: (
        <div className="flex flex-col gap-3 sm:flex-row">
          <DiscordButton />
          <Link
            href="/relais"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
          >
            Voir les relais <span aria-hidden="true">→</span>
          </Link>
        </div>
      ),
      render: (p) => stage(<SceneLive progress={p} narrow={narrow} />),
      staticAt: at(8, 0.9),
    },
  ];

  return (
    <ScrollStory
      aria-label="Le trajet d'un live, de A à Z"
      className="border-b border-line"
      scenes={scenes}
      height={`${N * 110}vh`}
      backdrop={(p) => <TripMap p={p} />}
      progress={false}
    />
  );
}
