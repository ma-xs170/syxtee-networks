import type { Metadata } from "next";
import Link from "next/link";
import HoverVideo from "@/components/landing/HoverVideo";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Nos réalisations",
  description: "Nos dernières productions de live IRL, en mobilité et sur bateau : bientôt ici.",
  alternates: { canonical: "/realisations" },
};

const SOON = [
  { title: "Mobilité", video: "/videos/mobilite-hover" },
  { title: "Soirée", video: "/videos/event-hover" },
  { title: "Mer", video: "/videos/mer-hover" },
] as const;

export default function RealisationsPage() {
  return (
    <>
      <section data-hero data-theme="dark" className="bg-background text-foreground">
        <Container className="pb-12 pt-[calc(5rem+65px)] text-center lg:pb-16 lg:pt-[calc(7rem+65px)]">
          <h1 className="rise h-serif mx-auto max-w-[14ch] text-[clamp(2.75rem,6.5vw,5.5rem)]" style={{ "--i": 0 } as React.CSSProperties}>
            Nos dernières <em>réalisations.</em>
          </h1>
          <p className="rise mx-auto mt-6 max-w-[40ch] text-lg leading-relaxed text-muted" style={{ "--i": 1 } as React.CSSProperties}>
            Les premières productions arrivent bientôt.
          </p>
        </Container>
      </section>

      <section className="pb-24 lg:pb-32">
        <Container>
          <ul className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3">
            {SOON.map(({ title, video }) => (
              <li key={title}>
                <HoverVideo video={video} />
                <p className="mt-4 text-center text-lg font-semibold tracking-tight">{title}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="border-t border-line py-20 lg:py-28">
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
