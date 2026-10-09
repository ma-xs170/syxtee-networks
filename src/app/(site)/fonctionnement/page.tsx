import type { Metadata } from "next";
import NextStep from "@/components/NextStep";
import BondingDiagram from "@/components/blocks/BondingDiagram";
import DetailSection, { IllustrationCard, Point } from "@/components/blocks/DetailSection";
import ObsInterface from "@/components/illustrations/ObsInterface";
import FonctionnementStory from "@/components/fonctionnement/FonctionnementStory";
import { Container, SectionHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Fonctionnement",
  description:
    "Téléphone → relais SRTLA → OBS → Twitch, Kick ou YouTube : comment SYXTEE NETWORKS combine tes connexions 4G, 5G et Wi-Fi et envoie le flux SRT dans ton OBS.",
  alternates: { canonical: "/fonctionnement" },
};

const obsSteps = [
  "Dans ta scène IRL, clique sur + dans Sources, puis choisis « Source média ».",
  "Décoche « Fichier local ».",
  "Dans « Entrée », colle l'adresse SRT affichée dans ton tableau de bord, page Serveurs (du type srt://<ADRESSE_RELAIS>:<PORT>…).",
  "Dans « Format d'entrée », mets mpegts, puis valide.",
  "Lance le live sur ton téléphone : l'image apparaît dans OBS en quelques secondes.",
];

const glossary = [
  {
    term: "SRT",
    def: "Secure Reliable Transport. Un protocole vidéo conçu pour les réseaux instables : il renvoie les paquets perdus au lieu de laisser l'image se casser. C'est ce qui sort du relais vers ton OBS.",
  },
  {
    term: "SRTLA",
    def: "SRT Link Aggregation. Une extension du SRT qui répartit un même flux sur plusieurs connexions. C'est ce que ton téléphone envoie au relais.",
  },
  {
    term: "Bonding",
    def: "Le fait de combiner plusieurs connexions (4G, 5G, Wi-Fi) pour qu'elles travaillent ensemble. Plus de débit disponible, et surtout moins de coupures.",
  },
  {
    term: "Bitrate",
    def: "La quantité de données envoyée par seconde, en Mb/s. Plus il est haut, plus l'image est détaillée, mais plus il faut de réseau et de data. En IRL, 4 à 6 Mb/s en 1080p est un bon point de départ.",
  },
  {
    term: "Latence",
    def: "Le délai entre ce que tu filmes et ce qui arrive dans OBS. Une petite réserve (en général 1 à 2 secondes) laisse au relais le temps de récupérer les paquets en retard : c'est elle qui absorbe les micro-coupures.",
  },
];

export default function FonctionnementPage() {
  return (
    <>
      <FonctionnementStory />

      <DetailSection
        n="En détail"
        title="Tes connexions 4G, 5G et Wi-Fi combinées pour moins de coupures"
        visual={<BondingDiagram />}
      >
        <Point label="Le principe">
          <p>
            Ton téléphone ne choisit pas <em>une</em> connexion : il les utilise <strong>toutes en même temps</strong>. La
            vidéo est découpée en paquets numérotés, et chaque paquet part sur la connexion qui a de la place à ce
            moment-là.
          </p>
        </Point>
        <Point label="Côté relais">
          <p>
            Les paquets arrivent au relais dans le désordre, par des chemins différents. Le relais les remet dans
            l&apos;ordre grâce à leur numéro et redemande ceux qui manquent. S&apos;il en manque encore, la petite réserve
            de latence laisse le temps de les récupérer.
          </p>
        </Point>
        <Point label="Quand une connexion lâche">
          <p>
            Si ta 4G tombe dans une rue mal couverte, les paquets passent simplement par la 5G et le Wi-Fi. Le live
            continue, parfois avec un bitrate plus bas le temps que ça revienne. Avec Moblin ou IRL Pro, active le bitrate
            adaptatif : l&apos;app baisse la qualité toute seule au lieu de couper.
          </p>
        </Point>
      </DetailSection>

      <DetailSection
        n="Dans OBS"
        title="Le flux récupéré directement dans ton OBS"
        reverse
        visual={
          <IllustrationCard label="Le flux SRT du relais, comme une source vidéo dans OBS">
            <ObsInterface />
          </IllustrationCard>
        }
      >
        <Point label="La source SRT">
          <p>
            Le relais ne diffuse rien sur Twitch à ta place : il met ton flux à disposition en <strong>SRT</strong>, et
            c&apos;est ton OBS qui vient le chercher. Pour lui, ton téléphone devient une source vidéo comme une autre.
          </p>
        </Point>
        <Point label="Dans OBS">
          <ol className="space-y-3">
            {obsSteps.map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="font-mono text-sm text-foreground">0{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </Point>
        <Point label="Bon à savoir">
          <p>
            Garde une scène « BRB » prête. Si le signal disparaît, tu bascules dessus (à la main, ou automatiquement avec
            NOALBS ou Advanced Scene Switcher) et tes viewers voient un écran propre au lieu d&apos;une image figée.
          </p>
        </Point>
      </DetailSection>

      <section className="border-b border-line py-20 sm:py-24">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader kicker="Glossaire" title="Les mots à connaître.">
            Cinq termes que tu vas croiser dans Moblin, OBS et sur le Discord.
          </SectionHeader>
          <dl className="divide-y divide-line border-y border-line">
            {glossary.map((g) => (
              <div key={g.term} className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-[8rem_1fr] sm:gap-6">
                <dt className="font-mono text-sm uppercase tracking-[0.1em]">{g.term}</dt>
                <dd className="text-sm leading-relaxed text-muted">{g.def}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>
      <NextStep label="Configurer Moblin" href="/moblin" />
    </>
  );
}
