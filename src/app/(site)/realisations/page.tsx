import type { Metadata } from "next";
import Link from "next/link";
import BeachView from "@/components/illustrations/BeachView";
import Streamer from "@/components/illustrations/Streamer";
import PageHero from "@/components/PageHero";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Nos réalisations",
  description: "Nos dernières productions de live IRL, en mobilité et sur bateau : bientôt ici.",
  alternates: { canonical: "/realisations" },
};

const SOON = [
  { title: "Mobilité", tag: "À pied, à vélo, en voiture", Art: Streamer },
  { title: "Bateau", tag: "En mer", Art: BeachView },
] as const;

export default function RealisationsPage() {
  return (
    <>
      <PageHero title={<>Nos dernières <em>réalisations.</em></>} crumb="Réalisations">
        Nous produisons de A à Z votre prochain stream IRL. Nos premières productions arrivent bientôt et s&apos;afficheront ici.
      </PageHero>

      <section className="border-b border-line py-20 lg:py-28">
        <Container>
          <div className="flex items-end justify-between gap-6">
            <h2 className="h-serif text-[clamp(2.25rem,4.5vw,3.5rem)]">Bientôt, <em>en direct.</em></h2>
            <span className="shrink-0 rounded-full border border-line px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">À venir</span>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {SOON.map(({ title, tag, Art }) => (
              <article key={title} className="bento-cell flex flex-col overflow-hidden">
                <div aria-hidden="true" className="h-56 border-b border-line text-foreground/80 sm:h-64"><Art animated={false} /></div>
                <div className="p-6 sm:p-7">
                  <p className="font-mono text-xs uppercase tracking-wide text-muted">{tag}</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">Première réalisation en préparation.</p>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 lg:py-28">
        <Container className="text-center">
          <h2 className="h-serif mx-auto max-w-3xl text-[clamp(2.25rem,5vw,3.75rem)]">Ton événement sera <em>le prochain.</em></h2>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/contact">Contactez-nous</ButtonLink>
            <Link href="/cas-d-usage" className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border border-foreground/25 px-6 text-[15px] font-medium transition-colors hover:bg-foreground/[0.08]">Voir les cas d&apos;usage</Link>
          </div>
        </Container>
      </section>
    </>
  );
}
