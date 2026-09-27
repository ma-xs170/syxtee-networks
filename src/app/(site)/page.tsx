import ProTeaser from "@/components/pro/ProTeaser";
import Hero from "@/components/sections/Hero";
import JourneyStory from "@/components/home/JourneyStory";
import Compat from "@/components/sections/Compat";
import Services from "@/components/sections/Services";
import HowItWorks from "@/components/sections/HowItWorks";
import LowCost from "@/components/sections/LowCost";
import Relays from "@/components/sections/Relays";
import Guides from "@/components/sections/Guides";
import Offers from "@/components/sections/Offers";
import Streamers from "@/components/sections/Streamers";
import Faq from "@/components/sections/Faq";
import FinalCta from "@/components/sections/FinalCta";
import { getHomeStreamers } from "@/lib/streamers";

// Accueil statique, régénéré toutes les 60 s (streamers et statut live Twitch).
export const revalidate = 60;

export default async function Home() {
  const streamers = await getHomeStreamers();
  return (
    <>
      <ProTeaser />
      <Hero />
      <JourneyStory />
      <Compat />
      <Services />
      <HowItWorks />
      <LowCost />
      <Relays />
      <Guides />
      <Offers />
      <Streamers streamers={streamers} />
      <Faq />
      <FinalCta />
    </>
  );
}
