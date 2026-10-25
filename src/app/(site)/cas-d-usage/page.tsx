import type { Metadata } from "next";
import Link from "next/link";
import BeachView from "@/components/illustrations/BeachView";
import Streamer from "@/components/illustrations/Streamer";
import PageHero from "@/components/PageHero";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Cas d'usage",
  description: "Mobilité et bateau : les deux terrains de live IRL que nos équipes de production couvrent.",
  alternates: { canonical: "/cas-d-usage" },
};

const CASES = [
  { title: "Mobilité", tag: "À pied, à vélo, en voiture", text: "Marathon, course, festival, manifestation, exploration urbaine : un direct qui suit le mouvement, avec cadreur et régie à distance.", Art: Streamer },
  { title: "Bateau", tag: "En mer", text: "Traversée, régate, pêche, plaisance : le direct continue loin des côtes, avec une liaison pensée pour la mer.", Art: BeachView },
] as const;

const GUIDES = [
  { title: "Débuter en IRL", text: "Les bases pour préparer un premier direct en mobilité.", href: "/guide-live-irl" },
  { title: "Contrôler OBS à distance", text: "Pilote scènes et audio depuis un téléphone.", href: "/controle-a-distance" },
  { title: "Une équipe pour ton événement", text: "Régie, cadreurs et relais, sur devis.", href: "/production" },
];

export default function CasDUsagePage() {
  return (
    <>
      <PageHero title={<>Streame ce que tu fais <em>de mieux.</em></>} crumb="Cas d'usage">
        Lancé par des Guadeloupéens, des solutions de streaming IRL flexibles, pour les créateurs, les marques et les équipes de production.
      </PageHero>

      <section className="border-b border-line py-20 lg:py-28">
        <Container>
          <h2 className="h-serif text-[clamp(2.25rem,4.5vw,3.5rem)]">Chaque moment, <em>en direct.</em></h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {CASES.map(({ title, tag, text, Art }) => (
              <article key={title} className="bento-cell flex flex-col overflow-hidden">
                <div aria-hidden="true" className="h-56 border-b border-line text-foreground/80 sm:h-64"><Art animated={false} /></div>
                <div className="p-6 sm:p-7">
                  <p className="font-mono text-xs uppercase tracking-wide text-muted">{tag}</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-line py-20 lg:py-28">
        <Container>
          <h2 className="h-serif text-[clamp(2.25rem,4.5vw,3.5rem)]">Pour <em>aller plus loin.</em></h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {GUIDES.map((g) => (
              <Link key={g.href} href={g.href} className="bento-cell group block p-6 transition-colors hover:border-foreground/30 sm:p-7">
                <h3 className="text-lg font-semibold tracking-tight">{g.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{g.text}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">Lire <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span></span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 lg:py-28">
        <Container className="text-center">
          <h2 className="h-serif mx-auto max-w-3xl text-[clamp(2.25rem,5vw,3.75rem)]">Prêt à raconter ton <em>histoire ?</em></h2>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/contact">Contactez-nous</ButtonLink>
            <ButtonLink href="/inscription" variant="secondary">Créer mon compte</ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
