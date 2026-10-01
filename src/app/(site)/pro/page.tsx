import type { Metadata } from "next";
import ProBento from "@/components/pro/ProBento";
import ProSoon from "@/components/pro/ProSoon";
import ProStory from "@/components/pro/ProStory";
import { Container } from "@/components/ui";
import { FEATURE_PRO } from "@/lib/features";

// Fiche produit complète seulement avec FEATURE_PRO=true ; sinon page « À venir » (sans prix ni caractéristiques).
export const metadata: Metadata = FEATURE_PRO
  ? {
      title: "SYXTEE PRO : le sac encodeur IRL",
      description:
        "SYXTEE PRO, le sac encodeur IRL pro le moins cher du marché : bonding 4G/5G multi-SIM, iPhone en USB-C, Starlink Mini, toute caméra HDMI. Bientôt disponible, prix de lancement 999 €.",
      alternates: { canonical: "/pro" },
    }
  : {
      title: "SYXTEE PRO : à venir",
      description: "SYXTEE PRO, notre sac encodeur IRL, est en préparation. Rejoins le Discord pour être prévenu.",
      alternates: { canonical: "/pro" },
    };

export default function ProPage() {
  if (!FEATURE_PRO) return <ProSoon />;
  return (
    <>
      <ProStory page="pro" />
      <ProBento />
      <section id="mentions" aria-label="Mentions" className="py-12">
        <Container>
          <p className="max-w-3xl text-xs leading-relaxed text-muted">
            Produit en développement : caractéristiques, prix et visuels non contractuels. Usage en vol (avion, hélicoptère) uniquement avec une
            connexion et des autorisations adaptées à l&apos;aviation, et dans le respect des règles de la compagnie ou de l&apos;opérateur.
            Starlink est une marque de SpaceX, non affilié.
          </p>
        </Container>
      </section>
    </>
  );
}
