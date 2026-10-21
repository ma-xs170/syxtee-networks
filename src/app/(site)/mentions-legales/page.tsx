import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Mentions légales", description: "Éditeur, hébergeur et contact de SYXTEE NETWORKS, mentions légales du site.", alternates: { canonical: "/mentions-legales" } };

export default function MentionsLegales() {
  return (
    <section className="py-20">
      <Container className="max-w-3xl">
        <h1 className="h-section">Mentions légales</h1>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted">
          <div>
            <h2 className="text-base font-semibold text-foreground">Éditeur du site</h2>
            <p className="mt-3">
              {site.name}, édité par LAWCY MUSIC
              <br />
              SIREN : 131 041 725 · SIRET : 131 041 725 00014
              <br />
              Siège : 2476 chemin de Bel Air Desrozières, 97170 Petit-Bourg, Guadeloupe
              <br />
              Directeur de la publication : Mathis CUSTOS
              <br />
              Contact et réclamations (litiges compris) :{" "}
              <a href="mailto:contact@syxtee-networks.fr" className="text-foreground underline">contact@syxtee-networks.fr</a>
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground">Hébergement</h2>
            <p className="mt-3">
              OVH SAS, 2 rue Kellermann, 59100 Roubaix, France - ovhcloud.com. Serveurs situés à Beauharnois (Québec, Canada).
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground">Propriété intellectuelle</h2>
            <p className="mt-3">
              Le nom, le logo et les contenus de {site.name} sont protégés. Toute reproduction sans autorisation est interdite.
              Les marques citées (Moblin, IRL Pro, TVU, LiveU, OBS, Twitch, Kick, YouTube…) appartiennent à leurs propriétaires respectifs.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground">Données personnelles</h2>
            <p className="mt-3">
              Le détail des données collectées par l&apos;espace client est dans la{" "}
              <Link href="/confidentialite" className="text-foreground underline">politique de confidentialité</Link>. Le site n&apos;utilise pas de
              cookies publicitaires. Le support se fait par messagerie depuis l&apos;espace client.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
