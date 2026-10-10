import type { Metadata } from "next";
import Glow from "@/components/landing/Glow";
import { deviceImage } from "@/lib/device-images";
import StreamPath from "@/components/landing/StreamPath";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import CloudBackdrop from "@/components/home/CloudBackdrop";
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
      <section data-theme="dark" className="relative bg-background text-foreground -mt-[4.0625rem] overflow-hidden border-b border-line pb-20 pt-[9rem] text-center sm:pb-28 sm:pt-[10.5rem]">
        <CloudBackdrop />
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
            <StreamPath images={{ laptop: deviceImage("laptop"), phone: deviceImage("phone") }} />
          </div>
          <p className="mx-auto mt-14 max-w-[58ch] text-center text-sm leading-relaxed text-muted">
            Prends le serveur le plus proche de l&apos;endroit où tu filmes, pas de chez toi : c&apos;est la liaison mobile entre ton téléphone et le serveur qui est fragile. En voyage, change de serveur avant le live.
          </p>
        </Container>
      </section>

    </>
  );
}
