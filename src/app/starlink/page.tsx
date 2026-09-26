import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Figure from "@/components/Figure";
import NextStep from "@/components/NextStep";
import DetailSection, { Point } from "@/components/blocks/DetailSection";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Starlink en IRL",
  description:
    "Streamer en IRL avec Starlink : quand l'utiliser, quel matériel prévoir, ses limites, et comment le combiner à ta 4G/5G avec Moblin et le relais SRTLA SYXTEE.",
  alternates: { canonical: "/starlink" },
};

const limits = [
  { t: "Il lui faut le ciel", d: "L'antenne doit voir le ciel dégagé. Arbres, immeubles, tunnels ou parkings couverts coupent le signal. En ville dense, la 4G/5G reste souvent plus fiable." },
  { t: "Le mouvement", d: "L'usage en déplacement dépend de ton forfait Starlink. Vérifie ce qu'il autorise avant de partir en live en marchant ou en voiture." },
  { t: "Le poids et l'énergie", d: "C'est un kilo de plus sur le dos, et une consommation bien plus forte qu'un téléphone. Il faut une batterie dédiée." },
  { t: "Le prix", d: "Matériel et abonnement ont un coût, qui change selon le pays et le forfait. Regarde les tarifs à jour sur le site officiel de Starlink." },
];

export default function StarlinkPage() {
  return (
    <>
      <PageHero kicker="Connexion" title="Starlink en IRL." crumb="Starlink">
        Quand la 4G ne capte plus, le satellite prend le relais. Voici quand Starlink vaut le coup pour tes lives, et
        comment le brancher sur ton setup SYXTEE.
      </PageHero>

      <DetailSection
        n="01"
        title="Pourquoi Starlink pour l'IRL"
        visual={<Figure src="/photos/starlink-irl.jpg" alt="antenne Starlink Mini utilisée pendant un live en extérieur" caption="Une antenne Starlink Mini en live, en pleine nature." />}
      >
        <Point label="Là où la 4G lâche">
          <p>
            Campagne, montagne, bord de mer, route isolée : là où il n&apos;y a qu&apos;une barre de réseau, Starlink
            capte par satellite. Et dans un festival ou un stade où l&apos;antenne 4G est saturée par des milliers de
            téléphones, le satellite, lui, n&apos;est pas encombré par la foule.
          </p>
        </Point>
        <Point label="Une connexion de plus dans ton bonding">
          <p>
            Pour ton téléphone, Starlink est simplement un réseau <strong>Wi-Fi</strong>. Moblin ou IRL Pro le combine à ta
            4G/5G, et le relais SYXTEE recolle le tout. Tu n&apos;as rien à changer côté relais ou OBS.
          </p>
        </Point>
      </DetailSection>

      <DetailSection
        n="02"
        title="Le matériel"
        reverse
        visual={<Figure src="/photos/starlink-sac.jpg" alt="Starlink Mini fixé sur un sac à dos, antenne vers le ciel" caption="Montage sac à dos : l'antenne reste tournée vers le ciel." />}
      >
        <Point label="Starlink Mini">
          <p>
            Pour l&apos;IRL, c&apos;est le modèle <strong>Mini</strong> qui a du sens : il est compact, pèse un peu plus
            d&apos;un kilo et intègre son propre routeur Wi-Fi. Pas de boîtier en plus à transporter.
          </p>
        </Point>
        <Point label="L'alimentation">
          <p>
            Le Mini s&apos;alimente en USB-C Power Delivery. Il faut une batterie externe capable de sortir{" "}
            <strong>100 W en USB-C</strong>. Il consomme en moyenne entre 25 et 40 W : avec une batterie de 100 Wh (la
            limite autorisée en cabine d&apos;avion), compte environ 2 à 3 heures de live.
          </p>
        </Point>
        <Point label="Le montage">
          <p>
            L&apos;antenne doit rester à plat et tournée vers le ciel. En marchant, fixe-la en haut de ton sac à dos ;
            en statique, pose-la sur son pied, loin des arbres et des murs.
          </p>
        </Point>
      </DetailSection>

      <section className="border-b border-line py-20 sm:py-24">
        <Container>
          <p className="font-mono text-sm text-muted">03</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Les limites à connaître.</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {limits.map((l) => (
              <article key={l.t} className="bg-black p-8">
                <h3 className="text-lg font-semibold">{l.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{l.d}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <DetailSection n="04" title="Brancher Starlink sur ton setup">
        <Point label="Côté téléphone">
          <p>
            Connecte ton téléphone au Wi-Fi du Starlink et <strong>garde les données cellulaires activées</strong>. Dans{" "}
            <Link href="/moblin" className="text-foreground underline underline-offset-4">Moblin</Link>, le bonding utilise
            alors les deux : Starlink quand le ciel est dégagé, la 4G/5G quand tu passes sous des arbres.
          </p>
        </Point>
        <Point label="Avant le live">
          <p>
            Allume le Starlink quelques minutes avant de lancer le live : au démarrage, il lui faut un peu de temps pour
            trouver les satellites. Vérifie dans les stats de Moblin que les deux connexions envoient bien des données.
          </p>
        </Point>
        <p className="text-xs text-muted">
          SYXTEE NETWORKS n&apos;est pas affilié à Starlink ni à SpaceX. Les caractéristiques du matériel peuvent évoluer :
          vérifie-les sur le site officiel.
        </p>
      </DetailSection>

      <NextStep label="Choisir ton relais" href="/relais" />
    </>
  );
}
