import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import NextStep from "@/components/NextStep";
import ComingSoon from "@/components/blocks/ComingSoon";
import { Container, SectionHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Offres",
  description:
    "Les offres SYXTEE NETWORKS arrivent bientôt : relais SRTLA/SRT, compatibilité Moblin, IRL Pro et BELABOX, sans engagement et avec support Discord.",
  alternates: { canonical: "/offres" },
};

const included = [
  {
    t: "Accès au relais SRTLA",
    d: "Ton téléphone envoie sa vidéo en bonding sur tes connexions 4G, 5G et Wi-Fi, et le relais reconstitue un flux stable.",
  },
  {
    t: "Sortie SRT pour ton OBS",
    d: "Le flux ressort en SRT, prêt à être ajouté comme source média dans OBS. Tes scènes, overlays et alertes restent chez toi.",
  },
  {
    t: "Ton identifiant de stream",
    d: "Un identifiant personnel, donné sur le Discord à l'ouverture de ton accès, pour que ton flux n'appartienne qu'à toi.",
  },
  {
    t: "Relais disponible 24h/24",
    d: "Pas de créneau à réserver : tu lances ton live quand tu veux, le relais t'attend.",
  },
  {
    t: "Compatible Moblin, IRL Pro, BELABOX",
    d: "Tu gardes l'app ou le matériel que tu connais. On fournit l'adresse, tu la colles, c'est tout.",
  },
  {
    t: "Sans engagement",
    d: "Tu streames en IRL l'été et pas l'hiver ? Tu arrêtes quand tu veux.",
  },
  {
    t: "Support Discord",
    d: "Un ticket, une vraie personne, et de l'aide pour régler ton setup de A à Z.",
  },
];

export default function OffresPage() {
  return (
    <>
      <PageHero kicker="Offres" title="Du live pro, sans le budget pro." crumb="Offres">
        Les tarifs arrivent bientôt. Voici déjà ce que tu auras entre les mains.
      </PageHero>

      <section className="border-b border-line py-20 sm:py-24">
        <Container>
          <ComingSoon />
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader kicker="Inclus" title="Ce qui sera inclus.">
            L&apos;essentiel pour un live IRL stable, rien de superflu.
          </SectionHeader>
          <ol className="divide-y divide-line border-y border-line">
            {included.map((item, i) => (
              <li key={item.t} className="grid gap-2 py-5 sm:grid-cols-[3rem_1fr]">
                <span className="font-mono text-sm text-muted">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="text-base font-medium">{item.t}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <NextStep label="Questions fréquentes" href="/faq" />
    </>
  );
}
