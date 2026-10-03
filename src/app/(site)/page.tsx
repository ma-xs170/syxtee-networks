import type { Metadata } from "next";
import Hero from "@/components/sections/Hero";
import StreamerWall from "@/components/home/StreamerWall";
import NumberedFeatures from "@/components/sections/NumberedFeatures";
import Faq from "@/components/sections/Faq";
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
      <NumberedFeatures />
      <StreamerWall streamers={streamers} />
      <Faq />
      <FinalCta />
    </>
  );
}
