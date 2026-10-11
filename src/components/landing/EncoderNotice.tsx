import MadeToOrder from "@/components/encoder/MadeToOrder";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";

/** Accueil : l'Encodeur arrive, avec l'avertissement de fabrication (tarif bas, quantités limitées, 4 mois maximum). */
export default function EncoderNotice() {
  return (
    <section id="encodeur" className="scroll-mt-20 border-b border-line py-16 sm:py-24">
      <Container className="max-w-4xl">
        <div className="bento-cell flex flex-col items-start justify-between gap-6 p-7 sm:flex-row sm:items-center sm:p-9">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">SYXTEE Encodeur · À venir</p>
            <h2 className="h-section mt-3">Un boîtier, <em>fait main.</em></h2>
            <MadeToOrder compact className="mt-4 max-w-[58ch]" />
          </div>
          <ButtonLink href="/encodeur" variant="secondary" className="shrink-0">Découvrir l&apos;Encodeur</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
