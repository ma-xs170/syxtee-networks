import type { Metadata } from "next";
import NextStep from "@/components/NextStep";
import StudioBanner from "@/components/StudioBanner";
import DetailSection, { Point } from "@/components/blocks/DetailSection";
import RelayGrid from "@/components/blocks/RelayGrid";
import RelayWorld from "@/components/globe/RelayWorld";
import { publicCoreUrl } from "@/lib/core";
import RelayStory from "@/components/relay/RelayStory";
import { Container, SectionHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Relais",
  description:
    "Les relais SRTLA SYXTEE NETWORKS en ligne, comment choisir le plus adapté à l'endroit où tu streames, et la latence à laquelle t'attendre en IRL.",
  alternates: { canonical: "/relais" },
};

const latency = [
  { k: "Téléphone → relais", v: "quelques dizaines de ms", note: "Plus si le relais est sur un autre continent (≈ 100 ms entre l'Europe et l'Amérique du Nord)." },
  { k: "Réserve SRT", v: "1 à 3 s", note: "Le tampon qui laisse le temps de récupérer les paquets perdus. Plus ton réseau est instable, plus il doit être grand." },
  { k: "Relais → OBS", v: "très faible", note: "Ton PC est en général sur une connexion fixe, stable et rapide." },
  { k: "OBS → viewers", v: "quelques secondes", note: "La latence de la plateforme elle-même, la même que pour tes lives à la maison." },
];

export default function RelaisPage() {
  return (
    <>
      <RelayStory />

      <section className="border-b border-line py-20 sm:py-24">
        <Container>
          <SectionHeader kicker="Relais" title="Nos serveurs.">
            Les relais SYXTEE tournent 24h/24. De nouvelles régions ouvrent selon la demande de la communauté : vote pour la
            tienne sur le Discord.
          </SectionHeader>
          <div className="mt-14">
            <RelayWorld coreUrl={publicCoreUrl} />
          </div>
          <div className="mt-14">
            <RelayGrid />
          </div>
        </Container>
      </section>

      <DetailSection n="01" title="Comment choisir ton relais">
        <Point label="Le plus proche de là où tu streames">
          <p>
            Choisis le relais le plus proche de <strong>l&apos;endroit où tu vas filmer</strong>, pas de chez toi. C&apos;est
            la liaison entre ton téléphone et le relais qui est fragile : elle passe par la 4G/5G, avec des pertes. Plus le
            relais est proche, plus les paquets perdus sont renvoyés vite, et moins il faut de réserve.
          </p>
        </Point>
        <Point label="Et ton OBS ?">
          <p>
            Ton PC récupère le flux sur une connexion fixe (fibre, câble), bien plus stable. La distance entre le relais et
            ton OBS compte donc beaucoup moins que celle entre ton téléphone et le relais.
          </p>
        </Point>
        <Point label="En voyage">
          <p>
            Si tu pars streamer dans une autre région, change simplement de relais dans ton app avant le live. Ta source
            dans OBS devra pointer vers le même relais : garde une source par relais, prête à l&apos;emploi.
          </p>
        </Point>
      </DetailSection>

      <DetailSection n="02" title="Latence : à quoi t'attendre">
        <Point label="Le principe">
          <p>
            En IRL, on échange un peu de latence contre de la stabilité. Ta vidéo arrive dans OBS avec un petit retard
            volontaire, et c&apos;est ce retard qui absorbe les micro-coupures du réseau mobile.
          </p>
        </Point>
        <dl className="divide-y divide-line border-y border-line">
          {latency.map((l) => (
            <div key={l.k} className="grid gap-1 py-4 sm:grid-cols-[10rem_9rem_1fr] sm:items-baseline sm:gap-6">
              <dt className="font-mono text-xs uppercase tracking-[0.1em] text-muted">{l.k}</dt>
              <dd className="text-sm font-medium">{l.v}</dd>
              <dd className="text-sm text-muted">{l.note}</dd>
            </div>
          ))}
        </dl>
        <Point label="Au total">
          <p>
            Compte en général <strong>1 à 3 secondes de plus</strong> qu&apos;un live à la maison. Tes viewers ne le
            remarquent pas, et tu peux toujours répondre au chat normalement.
          </p>
        </Point>
      </DetailSection>

      <StudioBanner />
      <NextStep label="Demander l'accès" href="/acces" />
    </>
  );
}
