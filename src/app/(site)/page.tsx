import type { Metadata } from "next";
import Hero from "@/components/sections/Hero";
import FeatureExplorer from "@/components/home/FeatureExplorer";
import StreamerWall from "@/components/home/StreamerWall";
import RelayBento from "@/components/home/RelayBento";
import StudioPromo from "@/components/sections/StudioPromo";
import MultichatPromo from "@/components/sections/MultichatPromo";
import FinalCta from "@/components/sections/FinalCta";
import { getHomeStreamers } from "@/lib/streamers";

export const metadata: Metadata = {
  title: { absolute: "Relais SRTLA, RTMP et RIST pour streamer en IRL · SYXTEE NETWORKS" },
  description:
    "Relais SRTLA, RTMP et RIST (nouveau) pour streamer en IRL : bonding 4G/5G, Wi-Fi et Starlink, santé du flux. Des serveurs dans le monde entier.",
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
      <MultichatPromo />
      <StreamerWall streamers={streamers} />
      <RelayBento />
      <FinalCta />
    </>
  );
}
