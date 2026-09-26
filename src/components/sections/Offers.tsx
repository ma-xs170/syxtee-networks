import ComingSoon from "../blocks/ComingSoon";
import { Container, MoreLink } from "../ui";

export default function Offers() {
  return (
    <section id="offres" className="border-b border-line py-24">
      <Container>
        <ComingSoon>
          <MoreLink href="/offres">Ce qui sera inclus</MoreLink>
        </ComingSoon>
      </Container>
    </section>
  );
}
