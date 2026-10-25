import type { Metadata } from "next";
import Link from "next/link";
import FaqList from "@/components/blocks/FaqList";
import JsonLd from "@/components/seo/JsonLd";
import { Container } from "@/components/ui";
import { faq } from "@/lib/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "SRTLA, applications compatibles, batterie, forfaits et consommation data, OBS, Android : toutes les réponses sur le relais IRL SYXTEE NETWORKS.",
  alternates: { canonical: "/faq" },
};

const WHITE = "inline-flex h-12 items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-foreground px-6 text-[15px] font-medium text-background transition-opacity hover:opacity-85";

export default function FaqPage() {
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <section data-hero data-theme="dark" className="bg-background text-foreground">
        <Container className="pb-12 pt-[calc(5rem+65px)] text-center lg:pb-16 lg:pt-[calc(7rem+65px)]">
          <h1 className="rise h-serif mx-auto max-w-[20ch] text-[clamp(2.75rem,6.5vw,5.5rem)]" style={{ "--i": 0 } as React.CSSProperties}>
            Questions <em>fréquentes.</em>
          </h1>
        </Container>
      </section>

      <section className="pb-24 sm:pb-32">
        <Container>
          <div className="mx-auto max-w-3xl">
            <FaqList items={faq} />
          </div>
        </Container>
      </section>

      <section className="border-t border-line py-24 text-center sm:py-32">
        <Container>
          <h2 className="h-serif mx-auto max-w-[16ch] text-[clamp(2.25rem,4.5vw,3.5rem)]">Une autre <em>question&nbsp;?</em></h2>
          <div className="mt-9 flex justify-center">
            <Link href="/contact" className={WHITE}>Contactez-nous</Link>
          </div>
        </Container>
      </section>
    </>
  );
}
