import type { Metadata } from "next";
import Hero from "@/components/sections/Hero";
import FeatureExplorer from "@/components/home/FeatureExplorer";
import StreamerWall from "@/components/home/StreamerWall";
import RelayBento from "@/components/home/RelayBento";
import StudioPromo from "@/components/sections/StudioPromo";
import CreateSteps from "@/components/home/CreateSteps";
import Guides from "@/components/sections/Guides";
import Offers from "@/components/sections/Offers";
import FinalCta from "@/components/sections/FinalCta";
import { getHomeStreamers } from "@/lib/streamers";

export const metadata: Metadata = {
  title: { absolute: "Relais SRTLA et RTMP pour streamer en IRL · SYXTEE NETWORKS" },
  description:
    "Relais SRTLA et RTMP pour streamer en IRL : bonding 4G/5G, Wi-Fi et Starlink, santé du flux. Des serveurs dans le monde entier.",
  alternates: { canonical: "/" },
};

// Accueil statique, régénéré toutes les 60 s (streamers et statut live Twitch).
// Centré sur le relais. SYXTEE PRO est « À venir » (FEATURE_PRO) : plus de teaser ici.
export default async function Home() {
  const streamers = await getHomeStreamers();
  return (
    <>
      <Hero streamers={streamers} />
      <FeatureExplorer />
      <StudioPromo />
      <StreamerWall streamers={streamers} />
      <RelayBento />
      <CreateSteps />
      <Guides />
      <Offers />
      <FinalCta />
    </>
  );
}
