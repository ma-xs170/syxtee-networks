import { faq } from "@/lib/faq";
import FaqList from "../blocks/FaqList";
import { Container, MoreLink } from "../ui";

export default function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-titre" className="border-b border-line py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-3xl">
          <h2 id="faq-titre" className="h-section">
            Les questions qu&apos;on nous pose.
          </h2>
          <div className="mt-10">
            <FaqList items={faq.slice(0, 5)} />
          </div>
          <div className="mt-8">
            <MoreLink href="/faq">Toutes les questions</MoreLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
