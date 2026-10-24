import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, DiscordLogo, Question } from "@phosphor-icons/react/dist/ssr";
import ContactForm from "@/components/contact/ContactForm";
import { Container } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Demander une production IRL",
  description: "Lancé par des Guadeloupéens : des solutions de streaming IRL flexibles. Décris ton projet de production IRL, on te répond avec un devis gratuit.",
  alternates: { canonical: "/contact" },
};

const cardLink = "inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline";

export default function ContactPage() {
  return (
    <>
      <section className="py-16 sm:py-24">
        <Container className="max-w-5xl">
          <h1 className="h-serif max-w-[16ch] text-[clamp(3rem,7vw,5rem)]">Demander une <em>production IRL.</em></h1>
          <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-muted sm:text-lg">Lancé par des Guadeloupéens, des solutions de streaming IRL flexibles.</p>
          <p className="mt-4 max-w-[58ch] font-medium">Tu veux qu&apos;on filme et diffuse ton direct IRL ? Décris ton projet : on s&apos;occupe de la production (régie, cadreur, réseau) et on te répond avec un devis gratuit et sur mesure.</p>
        </Container>
      </section>

      <section className="pb-16 sm:pb-24">
        <Container className="grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
          <div className="grid content-start gap-4">
            <div className="bento-cell p-6">
              <BookOpen size={24} aria-hidden="true" className="text-muted" />
              <h2 className="mt-4 text-lg font-semibold">Guide du live IRL</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">Les bases pour préparer un direct en mobilité.</p>
              <Link href="/guide-live-irl" className={`${cardLink} mt-3`}>Lire le guide <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
            <div className="bento-cell p-6">
              <Question size={24} aria-hidden="true" className="text-muted" />
              <h2 className="mt-4 text-lg font-semibold">Questions fréquentes</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">Un souci avec ton compte ? L&apos;assistance ou la FAQ répondent vite.</p>
              <Link href="/faq" className={`${cardLink} mt-3`}>Voir la FAQ <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
            <div className="bento-cell p-6">
              <h2 className="text-lg font-semibold">E-mail</h2>
              <a href="mailto:contact@syxtee-networks.fr" className="mt-3 inline-flex min-h-11 items-center text-sm text-muted hover:text-foreground">contact@syxtee-networks.fr</a>
            </div>
          </div>
          <div className="bento-cell p-6 sm:p-8">
            <h2 className="mb-6 text-xl font-semibold">Ta demande de production</h2>
            <ContactForm />
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden border-t border-line py-20 sm:py-28">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-full" style={{ background: "radial-gradient(60% 80% at 20% 100%, color-mix(in srgb, #5865f2 22%, transparent), transparent 70%)" }} />
        <Container className="relative max-w-5xl">
          <DiscordLogo size={44} weight="fill" aria-hidden="true" style={{ color: "#5865f2" }} />
          <h2 className="h-serif mt-5 max-w-[18ch] text-[clamp(2.25rem,5vw,3.5rem)]">Échange, apprends, progresse <em>ensemble.</em></h2>
          <p className="mt-5 max-w-[50ch] leading-relaxed text-muted">Partage des astuces, demande de l&apos;aide pour ton installation et grandis avec la communauté SYXTEE.</p>
          <a href={site.discord} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full border border-line-strong bg-surface-2 px-6 text-[15px] font-medium text-foreground transition-colors hover:border-foreground/30">
            Rejoindre le Discord <ArrowRight size={16} aria-hidden="true" />
          </a>
        </Container>
      </section>
    </>
  );
}
