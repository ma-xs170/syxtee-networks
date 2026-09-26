import Hero from "@/components/sections/Hero";
import Compat from "@/components/sections/Compat";
import Services from "@/components/sections/Services";
import HowItWorks from "@/components/sections/HowItWorks";
import LowCost from "@/components/sections/LowCost";
import Relays from "@/components/sections/Relays";
import Offers from "@/components/sections/Offers";
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
      <Offers />
      <Faq />
      <FinalCta />
    </>
  );
}
