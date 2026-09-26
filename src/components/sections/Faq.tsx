import { faq } from "@/lib/faq";
import FaqList from "../blocks/FaqList";
import { Container, MoreLink, SectionHeader } from "../ui";

export default function Faq() {
  return (
    <section id="faq" className="border-b border-line py-24">
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHeader kicker="FAQ" title="Questions fréquentes." />
          <div className="mt-8">
            <MoreLink href="/faq">Toutes les questions</MoreLink>
          </div>
        </div>
        <FaqList items={faq.slice(0, 5)} />
      </Container>
    </section>
  );
}
