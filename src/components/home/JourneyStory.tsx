"use client";

import ScrollStory, { type StoryScene } from "@/components/story/ScrollStory";
import { DiscordButton } from "@/components/ui";
import JourneyStage from "./journey/JourneyStage";

// « Le voyage d'un live » : la scène signature de l'accueil, en 4 scènes, dans le style filaire de /starlink.

const scenes: StoryScene[] = [
  {
    kicker: "01 · Tu filmes",
    title: "Tu sors, tu lances le live.",
    paragraphs: [
      "Ton téléphone filme et encode la vidéo, directement dans Moblin.",
      "Il utilise toutes tes connexions en même temps : 4G, 5G, Wi-Fi.",
    ],
    staticAt: 0.18,
    render: (_, { global }) => <JourneyStage p={global} layers={["street"]} />,
  },
  {
    kicker: "02 · En route",
    title: "Ta vidéo voyage en morceaux.",
    paragraphs: [
      "Chaque connexion transporte une partie des paquets vidéo.",
      "Si une connexion faiblit, les autres continuent : le live ne coupe pas.",
    ],
    staticAt: 0.44,
    render: (_, { global }) => <JourneyStage p={global} layers={["map"]} />,
  },
  {
    kicker: "03 · Le relais",
    title: "On recolle tout, en quelques millisecondes.",
    paragraphs: ["Le relais SYXTEE rassemble les paquets et reconstitue un flux propre."],
    staticAt: 0.72,
    render: (_, { global }) => <JourneyStage p={global} layers={["relay"]} />,
  },
  {
    kicker: "04 · En direct",
    title: "Et ton live est stable.",
    paragraphs: ["Le flux arrive dans ton OBS, avec tes scènes et tes alertes, puis part sur Twitch, Kick et YouTube."],
    footer: <DiscordButton />,
    staticAt: 1,
    render: (_, { global }) => <JourneyStage p={global} layers={["live"]} />,
  },
];

export default function JourneyStory() {
  return (
    <ScrollStory
      id="voyage"
      aria-label="Le voyage d'un live, de la rue à tes viewers"
      className="border-b border-line"
      scenes={scenes}
      stage={(p) => <JourneyStage p={p} />}
    />
  );
}
