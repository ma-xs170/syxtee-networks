import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Figure from "@/components/Figure";
import NextStep from "@/components/NextStep";
import BondingDiagram from "@/components/blocks/BondingDiagram";
import DetailSection, { Point } from "@/components/blocks/DetailSection";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Relais SRTLA, bonding 4G/5G/Wi-Fi, flux SRT dans OBS et support Discord : tout ce que SYXTEE NETWORKS fait pour ton live IRL depuis ton téléphone.",
  alternates: { canonical: "/services" },
};

const ticket = [
  { k: "App", v: "Moblin ou IRL Pro + version" },
  { k: "Réseau", v: "Opérateur, 4G / 5G / Wi-Fi" },
  { k: "Relais", v: "New York" },
  { k: "Heure", v: "Quand le souci est arrivé" },
  { k: "Capture", v: "Écran de l'erreur ou des stats" },
];

export default function ServicesPage() {
  return (
    <>
      <PageHero kicker="Services" title="Tout ce qu'il faut pour sortir streamer." crumb="Services">
        Quatre briques simples : un relais qui encaisse les coupures, ton téléphone comme encodeur, ton OBS aux commandes, et
        une vraie personne sur Discord quand ça coince.
      </PageHero>

      <DetailSection n="01" title="Relais SRTLA" visual={<BondingDiagram />}>
        <Point label="Ce que c'est">
          <p>
            Le SRTLA, c&apos;est du <strong>bonding</strong> : ton téléphone découpe la vidéo en petits paquets et les envoie
            en même temps sur toutes tes connexions (4G, 5G, Wi-Fi). Le relais SYXTEE reçoit tout, remet les paquets dans
            l&apos;ordre et reconstitue un seul flux propre.
          </p>
        </Point>
        <Point label="Pourquoi c'est utile en IRL">
          <p>
            Dehors, le réseau bouge sans arrêt : une rue mal couverte, une antenne saturée, un tunnel. Avec une seule
            connexion, chaque trou devient une coupure. Avec le bonding, si une connexion faiblit, les autres compensent.
          </p>
        </Point>
        <Point label="Ce que ça change">
          <p>
            Moins d&apos;écrans noirs, moins de « le stream a planté » dans le chat, et un bitrate plus stable. Tu te
            concentres sur ce que tu filmes, pas sur les barres de réseau.
          </p>
        </Point>
      </DetailSection>

      <DetailSection
        n="02"
        title="Ton téléphone suffit"
        reverse
        visual={<Figure src="/photos/telephone-irl.jpg" alt="téléphone sur perche en live IRL" caption="Moblin sur iPhone, monté sur une perche." />}
      >
        <Point label="Ce que c'est">
          <p>
            Avec <Link href="/moblin" className="text-foreground underline underline-offset-4">Moblin</Link> sur iPhone ou
            IRL Pro sur Android, ton téléphone fait le travail d&apos;un encodeur dédié : il filme, compresse la vidéo et
            l&apos;envoie en SRTLA vers le relais.
          </p>
        </Point>
        <Point label="Pourquoi c'est utile en IRL">
          <p>
            Un sac à dos IRL avec encodeur et modems coûte vite plusieurs milliers d&apos;euros. Ton téléphone, tu l&apos;as
            déjà, il est léger, et sa caméra est souvent meilleure qu&apos;une petite caméra d&apos;action.
          </p>
        </Point>
        <Point label="Ce que ça change">
          <p>
            Tu peux faire ton premier live IRL avec une perche, une batterie externe et ton forfait. Si tu veux plus de
            stabilité plus tard, tu ajoutes une deuxième connexion, pas un nouvel équipement.
          </p>
        </Point>
      </DetailSection>

      <DetailSection
        n="03"
        title="Tu gardes la main dans OBS"
        visual={<Figure src="/photos/obs-source-srt.jpg" alt="capture d'OBS avec la source média SRT" caption="La source SRT du relais dans une scène OBS." />}
      >
        <Point label="Ce que c'est">
          <p>
            Le relais sort un flux <strong>SRT</strong>. Dans OBS, tu l&apos;ajoutes comme <strong>Source média</strong>,
            avec l&apos;adresse qu&apos;on te donne, et ton téléphone apparaît dans ta scène comme une webcam.
          </p>
        </Point>
        <Point label="Pourquoi c'est utile en IRL">
          <p>
            Tes scènes, overlays, alertes, sons et widgets de chat restent chez toi, dans ton OBS. C&apos;est aussi OBS qui
            envoie vers Twitch, Kick ou YouTube, avec tes réglages habituels.
          </p>
          <p>
            Et quand le signal tombe vraiment (métro, zone blanche), tu bascules sur une scène de secours{" "}
            <strong>« BRB »</strong> au lieu d&apos;afficher un écran figé. Un outil comme NOALBS ou le plugin Advanced
            Scene Switcher peut faire la bascule automatiquement quand le bitrate chute, puis revenir dès que ça repart.
          </p>
        </Point>
        <Point label="Ce que ça change">
          <p>
            Ton live IRL a la même tête que tes lives à la maison. Tes viewers gardent leurs repères, et une coupure
            devient une pause propre plutôt qu&apos;un stream qui s&apos;arrête.
          </p>
        </Point>
      </DetailSection>

      <DetailSection
        n="04"
        title="Support Discord"
        reverse
        visual={
          <div className="rounded-2xl border border-line bg-white/[0.02] p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Ticket · ce qu&apos;il faut fournir</p>
            <dl className="mt-6 divide-y divide-line border-y border-line">
              {ticket.map((t) => (
                <div key={t.k} className="flex items-baseline justify-between gap-6 py-3">
                  <dt className="font-mono text-xs uppercase text-muted">{t.k}</dt>
                  <dd className="text-right text-sm">{t.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        }
      >
        <Point label="Ce que c'est">
          <p>
            Le support se fait uniquement sur le Discord. Tu vas dans le salon support, tu cliques pour{" "}
            <strong>ouvrir un ticket</strong>, et un salon privé s&apos;ouvre entre toi et l&apos;équipe.
          </p>
        </Point>
        <Point label="Pourquoi c'est utile en IRL">
          <p>
            Un souci de config, ça se règle mieux en direct qu&apos;avec des emails. Tu peux envoyer une capture, une vidéo
            de l&apos;écran, et on avance ensemble jusqu&apos;à ce que ça marche.
          </p>
        </Point>
        <Point label="Ce que ça change">
          <p>
            Pour qu&apos;on t&apos;aide vite, donne tout de suite : l&apos;app que tu utilises et sa version, ton réseau
            (opérateur, 4G, 5G ou Wi-Fi), le relais, l&apos;heure du problème et une capture de l&apos;erreur ou des stats
            de l&apos;app. Avec ça, on trouve la cause en quelques messages au lieu de vingt.
          </p>
        </Point>
      </DetailSection>

      <NextStep label="Comment ça marche" href="/fonctionnement" />
    </>
  );
}
