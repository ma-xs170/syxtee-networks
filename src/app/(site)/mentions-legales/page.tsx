import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Mentions légales" };

// ⚠️ Complète les champs [À COMPLÉTER] avant la mise en ligne publique.
export default function MentionsLegales() {
  return (
    <section className="py-20">
      <Container className="max-w-3xl">
        <h1 className="h-section">Mentions légales</h1>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted">
          <div>
            <h2 className="text-base font-semibold text-foreground">Éditeur du site</h2>
            <p className="mt-3">
              {site.name}
              <br />
              Responsable de la publication : [À COMPLÉTER]
              <br />
              Statut / SIRET : [À COMPLÉTER]
              <br />
              Adresse : [À COMPLÉTER], Guadeloupe
              <br />
              Contact : via le{" "}
              <a href={site.discord} className="text-foreground underline" target="_blank" rel="noopener noreferrer">
                serveur Discord
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground">Hébergement</h2>
            <p className="mt-3">
              Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis - vercel.com
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground">Propriété intellectuelle</h2>
            <p className="mt-3">
              Le nom, le logo et les contenus de {site.name} sont protégés. Toute reproduction sans autorisation est interdite.
              Les marques citées (Moblin, IRL Pro, BELABOX, OBS, Twitch, Kick, YouTube…) appartiennent à leurs propriétaires respectifs.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground">Données personnelles</h2>
            <p className="mt-3">
              Le détail des données collectées par l&apos;espace client est dans la{" "}
              <Link href="/confidentialite" className="text-foreground underline">politique de confidentialité</Link>. Le site n&apos;utilise pas de
              cookies publicitaires. Les échanges de support ont lieu sur Discord, soumis à la politique de confidentialité de Discord.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
