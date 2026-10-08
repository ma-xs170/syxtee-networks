import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import NextStep from "@/components/NextStep";
import FaqList from "@/components/blocks/FaqList";
import { Container } from "@/components/ui";
import { faq } from "@/lib/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "SRTLA, applications compatibles, batterie, forfaits et consommation data, OBS, Android : toutes les réponses sur le relais IRL SYXTEE NETWORKS.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <>
      <PageHero kicker="FAQ" title={<>Questions <em>fréquentes.</em></>} crumb="FAQ">
        Tout ce qu&apos;on nous demande sur le Discord, au même endroit. Ta question n&apos;y est pas ? Ouvre un ticket.
      </PageHero>

      <section className="border-b border-line py-20 sm:py-24">
        <Container>
          <div className="mx-auto max-w-3xl">
            <FaqList items={faq} />
          </div>
        </Container>
      </section>

      <NextStep label="Retour à l'accueil" href="/" />
    </>
  );
}
