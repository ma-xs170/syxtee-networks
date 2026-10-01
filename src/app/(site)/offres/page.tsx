import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import NextStep from "@/components/NextStep";
import Link from "next/link";
import PlanCards from "@/components/billing/PlanCards";
import { Container, SectionHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Offres",
  description:
    "Formules SYXTEE : Basique 5,99 €, Premium 14,99 €, Extra 34,99 € par mois, 2 mois offerts à l'année. Relais SRTLA/SRT et RTMP, compatibles Moblin, IRL Pro et BELABOX, sans engagement.",
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
        Trois formules, au mois ou à l&apos;année. Sans engagement, résiliable en deux clics.
      </PageHero>

      <section className="border-b border-line py-20 sm:py-24">
        <Container>
          <PlanCards mode="signup" />
          <p className="mt-6 text-sm text-muted">
            Déjà un compte ? Choisis ta formule depuis{" "}
            <Link href="/dashboard/abonnement" className="text-foreground underline underline-offset-4">
              ton dashboard
            </Link>
            . Paiement sécurisé par Stripe, voir les{" "}
            <Link href="/cgv" className="text-foreground underline underline-offset-4">
              CGV
            </Link>
            .
          </p>
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader kicker="Inclus" title="Ce qui est inclus.">
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
