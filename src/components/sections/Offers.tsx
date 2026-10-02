import ComingSoon from "../blocks/ComingSoon";
import { Container } from "../ui";

// Accueil : accès sur invitation (pas d'abonnement, pas de prix). Détail sur /offres.
export default function Offers() {
  return (
    <section id="invitation" className="border-b border-line py-24">
      <Container>
        <ComingSoon />
      </Container>
    </section>
  );
}
