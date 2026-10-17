import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import DetailSection, { IllustrationCard, Point } from "@/components/blocks/DetailSection";
import FaqList from "@/components/blocks/FaqList";
import JsonLd from "@/components/seo/JsonLd";
import ObsInterface from "@/components/illustrations/ObsInterface";
import PhoneMoblin from "@/components/illustrations/PhoneMoblin";
import StarlinkMini from "@/components/illustrations/StarlinkMini";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import type { FaqItem } from "@/lib/faq";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Faire un live IRL : matériel, forfait et relais",
  description: "Le guide du live IRL sur Twitch, Kick ou YouTube : téléphone, forfait data, bonding SRTLA, relais et OBS. Sans matériel à plusieurs milliers d'euros.",
  alternates: { canonical: "/guide-live-irl" },
};

const faq: FaqItem[] = [
  { q: "Quel matériel pour un premier live IRL ?", a: "Un smartphone récent, une application qui gère le SRTLA (Moblin sur iPhone, IRL Pro sur Android), un forfait avec beaucoup de data, une batterie externe USB-C et une perche ou un stabilisateur. Un PC avec OBS, à la maison, récupère le flux et l'envoie à ta plateforme." },
  { q: "Combien de data pour un live IRL ?", a: "Environ 1,4 Go par heure à 3 Mb/s, 2,7 Go à 6 Mb/s et 3,6 Go à 8 Mb/s. Prévois environ 10 % de plus pour les paquets renvoyés quand le réseau est instable. Pour de l'IRL, 4 à 6 Mb/s en 1080p H.265 est un bon compromis." },
  { q: "Le bonding, c'est quoi ?", a: "Le téléphone envoie la vidéo sur plusieurs connexions en même temps (4G, 5G, Wi-Fi). Un relais SRTLA rassemble les paquets et reconstitue un flux stable. Si une connexion lâche, le live continue sur les autres." },
  { q: "SRTLA, SRT ou RTMP ?", a: "Le RTMP est simple mais fragile sur un réseau mobile. Le SRT récupère mieux les paquets perdus. Le SRTLA ajoute le bonding : c'est le choix le plus stable quand tu bouges." },
  { q: "Que faire quand le réseau tombe vraiment ?", a: "Prépare une scène de secours « BRB » dans OBS. Un outil comme NOALBS ou le plugin Advanced Scene Switcher peut basculer automatiquement quand le bitrate chute, puis revenir quand le signal repart." },
];

export default function GuideLiveIrlPage() {
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Faire un live IRL : matériel, forfait et relais",
          inLanguage: "fr-FR",
          mainEntityOfPage: `${site.url}/guide-live-irl`,
          author: { "@id": `${site.url}/#organization` },
          publisher: { "@id": `${site.url}/#organization` },
          dateModified: "2026-10-17",
        }}
      />
      <PageHero kicker="Guide" title={<>Faire un live <em>IRL.</em></>} crumb="Guide du live IRL">
        Un live IRL, c&apos;est diffuser depuis la rue, un festival ou un voyage. Ce guide couvre ce qu&apos;il faut vraiment : le téléphone, la connexion, le relais et OBS.
      </PageHero>

      <DetailSection
        n="01"
        title="Le matériel : ton téléphone suffit pour commencer"
        visual={
          <IllustrationCard label="Moblin sur iPhone, bonding sur plusieurs réseaux">
            <PhoneMoblin />
          </IllustrationCard>
        }
      >
        <Point label="Le minimum">
          <p>
            Un smartphone récent, une <strong>batterie externe USB-C</strong>, une perche ou un stabilisateur, et une application qui gère le SRTLA :{" "}
            <Link href="/moblin" className="text-foreground underline underline-offset-4">Moblin</Link> sur iPhone, IRL Pro sur Android. Pas besoin d&apos;un sac à dos à plusieurs milliers d&apos;euros pour un premier direct.
          </p>
        </Point>
        <Point label="La chauffe">
          <p>
            Encoder en continu sur plusieurs réseaux est ce qu&apos;on demande de plus dur à un téléphone. Retire la coque, évite le soleil direct, baisse la luminosité et passe en 720p ou en 30 images/s si ça chauffe. Le H.265 demande moins de bitrate pour la même qualité.
          </p>
        </Point>
      </DetailSection>

      <DetailSection n="02" title="La connexion : forfait data et bonding" reverse>
        <Point label="Combien de data ?">
          <p>
            Compte environ <strong>1,4 Go par heure à 3 Mb/s</strong>, <strong>2,7 Go à 6 Mb/s</strong> et <strong>3,6 Go à 8 Mb/s</strong>, plus environ 10 % de paquets renvoyés quand le réseau est instable. Pour l&apos;IRL, 4 à 6 Mb/s en 1080p H.265 est un bon compromis. Prends un forfait de 100 Go ou plus si tu lives souvent, sans bridage après un volume donné.
          </p>
        </Point>
        <Point label="Le bonding">
          <p>
            Le téléphone envoie la vidéo sur <strong>plusieurs connexions en même temps</strong> (4G, 5G, Wi-Fi). Si l&apos;une faiblit, les autres compensent. Idéalement, prends deux opérateurs différents. Un iPhone n&apos;utilise qu&apos;une ligne de données à la fois : la deuxième connexion passe par un autre appareil, par exemple avec une{" "}
            <Link href="/saily" className="text-foreground underline underline-offset-4">eSIM Saily</Link>.
          </p>
        </Point>
        <Point label="Zones sans réseau">
          <p>
            En zone blanche, en mer ou en montagne, un{" "}
            <Link href="/starlink" className="text-foreground underline underline-offset-4">Starlink Mini</Link> apporte une connexion de plus, qui s&apos;ajoute au bonding.
          </p>
        </Point>
      </DetailSection>

      <DetailSection
        n="03"
        title="Le relais SRTLA : pourquoi et comment"
        visual={
          <IllustrationCard label="Le relais remet les paquets dans l'ordre">
            <StarlinkMini />
          </IllustrationCard>
        }
      >
        <Point label="RTMP, SRT, SRTLA">
          <p>
            Le RTMP est simple mais fragile sur un réseau mobile. Le <strong>SRT</strong> récupère mieux les paquets perdus. Le <strong>SRTLA</strong> ajoute le bonding. Il faut un relais pour rassembler les paquets des différentes connexions.
          </p>
        </Point>
        <Point label="Choisir son relais">
          <p>
            Plus le relais est proche de toi, plus la latence est basse. Les relais SYXTEE sont décrits sur la page{" "}
            <Link href="/relais" className="text-foreground underline underline-offset-4">Nos serveurs</Link>, et le détail du fonctionnement sur{" "}
            <Link href="/fonctionnement" className="text-foreground underline underline-offset-4">Fonctionnement</Link>.
          </p>
        </Point>
      </DetailSection>

      <DetailSection
        n="04"
        title="OBS à la maison, et une scène de secours"
        reverse
        visual={
          <IllustrationCard label="Le flux du relais devient une source dans OBS">
            <ObsInterface />
          </IllustrationCard>
        }
      >
        <Point label="Le principe">
          <p>
            OBS tourne sur ton PC, à la maison. Il récupère le flux du relais comme <strong>Source média</strong> et l&apos;envoie à Twitch, Kick ou YouTube avec tes scènes, overlays et alertes. Le PC reste allumé, connecté et sans mise en veille tant que tu es en live.
          </p>
        </Point>
        <Point label="Quand le signal tombe">
          <p>
            Prépare une scène <strong>« BRB »</strong>. NOALBS ou le plugin Advanced Scene Switcher bascule dessus quand le bitrate chute, puis revient quand le signal repart. Tu peux aussi{" "}
            <Link href="/controle-a-distance" className="text-foreground underline underline-offset-4">piloter OBS depuis ton téléphone</Link>.
          </p>
        </Point>
      </DetailSection>

      <section className="border-b border-line py-20 sm:py-24">
        <Container>
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-sm text-muted">05</p>
            <h2 className="mt-4 h-section">Questions fréquentes</h2>
            <div className="mt-8">
              <FaqList items={faq} />
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/acces">Demander l&apos;accès</ButtonLink>
              <ButtonLink href="/tarifs" variant="secondary">Voir les tarifs</ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
