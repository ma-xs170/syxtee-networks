import Hero from "@/components/sections/Hero";
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

export default function Home() {
  return (
    <>
      <Hero />
      <Compat />
      <Services />
      <HowItWorks />
      <LowCost />
      <Relays />
      <Guides />
      <Offers />
      <Streamers />
      <Faq />
      <FinalCta />
    </>
  );
}
