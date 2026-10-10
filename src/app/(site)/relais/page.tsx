import type { Metadata } from "next";
import NextStep from "@/components/NextStep";
import Glow from "@/components/landing/Glow";
import StreamPath from "@/components/landing/StreamPath";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import GridBackground from "@/components/ui/GridBackground";
import SectionHeader from "@/components/ui/SectionHeader";
import StatusPill from "@/components/ui/StatusPill";
import WordsReveal from "@/components/ui/WordsReveal";

export const metadata: Metadata = {
  title: "Nos serveurs",
  description:
    "Ta caméra envoie son flux à nos serveurs, qui le stabilisent avant de le livrer à ton OBS. Les serveurs SYXTEE NETWORKS en ligne et la latence à prévoir.",
  alternates: { canonical: "/relais" },
};

export default function RelaisPage() {
  return (
    <>
      <Glow />
      {/* Hero */}
      <section className="relative -mt-[4.0625rem] overflow-hidden border-b border-line pb-20 pt-[9rem] text-center sm:pb-28 sm:pt-[10.5rem]">
        <GridBackground />
        <Container className="relative">
          <StatusPill variant="ok" label="Serveurs opérationnels" />
          <h1 className="h-serif mx-auto mt-8 max-w-[16ch] text-[clamp(3rem,8vw,5.5rem)]">
            <WordsReveal text="Ta caméra, nos serveurs, ton OBS." />
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] text-base leading-relaxed text-muted sm:text-lg">
            Ton flux passe par un de nos serveurs avant d&apos;arriver dans OBS. Résultat : une vidéo stable, même sur un réseau mobile.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/acces">Demander l&apos;accès</ButtonLink>
            <ButtonLink href="#serveurs" variant="secondary">Voir les serveurs</ButtonLink>
          </div>
        </Container>
      </section>

      {/* Le trajet du flux */}
      <section className="border-b border-line py-24 sm:py-32">
        <Container>
          <SectionHeader title={<>Le trajet de <em>ton flux.</em></>} subtitle="Trois étapes, de ta caméra jusqu'à ton direct." />
          <div className="mt-16">
            <StreamPath />
          </div>
          <p className="mx-auto mt-14 max-w-[58ch] text-center text-sm leading-relaxed text-muted">
            Prends le serveur le plus proche de l&apos;endroit où tu filmes, pas de chez toi : c&apos;est la liaison mobile entre ton téléphone et le serveur qui est fragile. En voyage, change de serveur avant le live.
          </p>
        </Container>
      </section>

      {/* Latence */}
      <section className="py-24 sm:py-32">
        <Container>
          <SectionHeader title={<>Un petit retard, pour un flux qui <em>tient.</em></>} subtitle="En IRL, on échange un peu de latence contre de la stabilité : ce retard volontaire absorbe les micro-coupures du réseau mobile." />
          <div className="bento-cell mt-14 flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Au total</p>
              <p className="mt-2 font-mono text-5xl font-medium tabular-nums tracking-tight sm:text-6xl">+1 à 3 s</p>
            </div>
            <p className="max-w-[48ch] text-sm leading-relaxed text-muted">
              Une à trois secondes de plus qu&apos;un live à la maison. Tes viewers ne le remarquent pas, et tu peux toujours répondre au chat normalement.
            </p>
          </div>
        </Container>
      </section>
      <NextStep label="Demander l'accès" href="/acces" />
    </>
  );
}
