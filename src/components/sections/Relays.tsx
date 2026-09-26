import RelayGrid from "../blocks/RelayGrid";
import { Container, MoreLink, SectionHeader } from "../ui";

export default function Relays() {
  return (
    <section id="relais" className="border-b border-line py-24">
      <Container>
        <SectionHeader kicker="Relais" title="Nos serveurs.">
          Choisis le relais le plus proche de là où tu streames. De nouvelles régions arrivent selon la demande de la communauté.
        </SectionHeader>

        <div className="mt-14">
          <RelayGrid />
        </div>

        <div className="mt-10">
          <MoreLink href="/relais" />
        </div>
      </Container>
    </section>
  );
}
