import type { Metadata } from "next";
import Link from "next/link";
import HoverVideo from "@/components/landing/HoverVideo";
import PageHero from "@/components/PageHero";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Cas d'usage",
  description: "Mobilité et bateau : les deux terrains de live IRL que nos équipes de production couvrent.",
  alternates: { canonical: "/cas-d-usage" },
};

const CASES = [
  { title: "Mobilité", text: "Un direct qui suit le mouvement.", video: "/videos/mobilite-hover" },
  { title: "Mer", text: "Le direct continue loin des côtes.", video: "/videos/mer-hover" },
];

const GUIDES = [
  { title: "Débuter en IRL", text: "Préparer un premier direct.", href: "/guide-live-irl" },
  { title: "Contrôler OBS", text: "Scènes et audio depuis ton téléphone.", href: "/controle-a-distance" },
  { title: "Une équipe", text: "Régie, cadreurs et relais.", href: "/production" },
];

export default function CasDUsagePage() {
  return (
    <>
      <PageHero title={<>Streame ce que tu fais <em>de mieux.</em></>} crumb="Cas d'usage">
        Mobilité ou mer : le direct te suit partout.
      </PageHero>

      <section className="border-b border-line py-20 lg:py-28">
        <Container>
          <h2 className="h-serif text-center text-[clamp(2.25rem,4.5vw,3.5rem)]">Chaque moment, <em>en direct.</em></h2>
          <ul className="mx-auto mt-14 grid max-w-3xl gap-8 sm:grid-cols-2">
            {CASES.map((c) => (
              <li key={c.title}>
                <HoverVideo video={c.video} />
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{c.title}</h3>
                <p className="mt-1 text-sm text-muted">{c.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="border-b border-line py-20 lg:py-28">
        <Container>
          <h2 className="h-serif text-center text-[clamp(2.25rem,4.5vw,3.5rem)]">Pour <em>aller plus loin.</em></h2>
          <ul className="mx-auto mt-14 grid max-w-5xl gap-x-12 gap-y-8 sm:grid-cols-3">
            {GUIDES.map((g) => (
              <li key={g.href}>
                <Link href={g.href} className="group block">
                  <h3 className="text-lg font-semibold tracking-tight underline-offset-4 group-hover:underline">{g.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{g.text}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="py-20 lg:py-28">
        <Container className="text-center">
          <h2 className="h-serif mx-auto max-w-3xl text-[clamp(2.25rem,5vw,3.75rem)]">Prêt à raconter ton <em>histoire ?</em></h2>
          <div className="mt-9 flex justify-center">
            <ButtonLink href="/contact">Contactez-nous</ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
