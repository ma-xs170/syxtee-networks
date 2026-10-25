import type { Metadata } from "next";
import Link from "next/link";
import { Envelope, FilmSlate } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/ui";
import { glow } from "@/lib/glow";
import HeroVideo from "@/components/landing/HeroVideo";
import TwitchCategories from "@/components/landing/TwitchCategories";

export const metadata: Metadata = {
  title: "Production de live IRL",
  description: "Nous produisons de A à Z votre prochain stream IRL : régie, cadreurs et relais SRTLA, où que vous soyez. Équipe basée en Guadeloupe, devis gratuit.",
  alternates: { canonical: "/production" },
};

const OFFERS = [
  { n: "01", title: "Régie en direct", text: "Un régisseur pilote OBS pendant que tu es sur le terrain." },
  { n: "02", title: "Cadreurs IRL", text: "Des vidéastes formés au live en mobilité." },
  { n: "03", title: "Réseau et supervision", text: "On suit chaque connexion en direct et on corrige avant le public." },
  { n: "04", title: "Connectivité cellulaire et satellite", text: "Multi-opérateurs, Starlink et plus : le signal tient partout." },
];

const STEPS = [
  { n: "1", title: "Tu décris ton événement", text: "Date, lieu, nombre de caméras, plateformes. Un message suffit." },
  { n: "2", title: "On te propose un devis", text: "Une proposition claire, gratuite et sans engagement, avec ce qui est inclus." },
  { n: "3", title: "On s'en charge", text: "L'équipe prépare, diffuse et suit le direct. Tu reçois le retour de fin de live." },
];

const solid = "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-foreground px-6 text-[15px] font-medium text-background transition-opacity hover:opacity-85";
const glass = "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-foreground/25 bg-foreground/[0.06] px-6 text-[15px] font-medium text-foreground backdrop-blur-sm transition-colors hover:border-foreground/45 hover:bg-foreground/[0.12]";

export default function ProductionPage() {
  return (
    <>
      <section data-hero data-theme="dark" className="relative isolate flex min-h-[85dvh] items-end overflow-hidden text-foreground">
        <HeroVideo />
        <Container className="relative pb-16 pt-[calc(5rem+65px)] sm:pb-24">
          <nav aria-label="Fil d'Ariane" className="font-mono text-xs text-foreground/70">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link href="/" className="hover:text-foreground">Accueil</Link></li>
              <li aria-hidden="true" className="text-foreground/30">/</li>
              <li aria-current="page" className="text-foreground">Production</li>
            </ol>
          </nav>
          <h1 className="rise h-hero mt-8 max-w-4xl [text-shadow:0_2px_30px_rgba(0,0,0,0.5)]" style={{ "--i": 1 } as React.CSSProperties}>
            Ton live IRL, <em>produit pour toi.</em>
          </h1>
          <p className="rise mt-6 max-w-xl text-lg leading-relaxed text-foreground/80 [text-shadow:0_1px_16px_rgba(0,0,0,0.6)]" style={{ "--i": 2 } as React.CSSProperties}>
            <strong className="font-semibold text-foreground">Nous produisons de A à Z</strong> votre prochain stream IRL : régie, cadreurs et relais, depuis la Guadeloupe. Sur devis.
          </p>
          <div className="rise mt-9 flex flex-col gap-3 sm:flex-row" style={{ "--i": 3 } as React.CSSProperties}>
            <Link href="/contact" className={solid}><Envelope size={18} weight="bold" aria-hidden="true" />Contactez-nous</Link>
            <Link href="/realisations" className={glass}><FilmSlate size={18} weight="bold" aria-hidden="true" />Nos réalisations</Link>
          </div>
        </Container>
      </section>

      <section className="py-20 lg:py-28">
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Ce qu&apos;on fait</p>
            <h2 className="h-serif mt-4 text-[clamp(2.25rem,4.5vw,3.5rem)]">Une équipe, <em>un seul direct.</em></h2>
            <p className="mt-5 max-w-[34ch] text-base leading-relaxed text-muted">Tu racontes l&apos;histoire. On s&apos;occupe de tout ce qui la fait arriver jusqu&apos;au public.</p>
          </div>
          <ol className="border-t border-line">
            {OFFERS.map((o) => (
              <li key={o.n} className="group grid grid-cols-[3rem_1fr] gap-4 border-b border-line py-7 sm:grid-cols-[4.5rem_1fr] sm:py-9">
                <span className="font-mono text-sm text-muted transition-colors group-hover:text-foreground">{o.n}</span>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{o.title}</h3>
                  <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-muted">{o.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="relative isolate overflow-hidden pb-6 pt-20 text-center lg:pb-8 lg:pt-28">
        {/* bleu mer */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={glow("#2b7fe0", "100% 50%", 70, 100, 34)} />

        <Container>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Sur le terrain</p>
          <h2 className="h-serif mx-auto mt-4 max-w-3xl text-[clamp(2.25rem,4.5vw,3.5rem)]">Mobilité, soirée, mer&nbsp;: <em>on te suit partout.</em></h2>
        </Container>
        <TwitchCategories />
      </section>

      <section className="pb-20 pt-10 lg:pb-28 lg:pt-14">

        <Container>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Comment ça se passe</p>
          <h2 className="h-serif mt-4 text-[clamp(2.25rem,4.5vw,3.5rem)]">Trois étapes, <em>zéro stress.</em></h2>
          <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            <span aria-hidden="true" className="absolute left-0 right-0 top-5 hidden h-px bg-line md:block" />
            {STEPS.map((s) => (
              <li key={s.n} className="relative">
                <span className="relative grid size-10 place-items-center rounded-full border border-line bg-background font-mono text-sm text-foreground">{s.n}</span>
                <h3 className="mt-6 text-xl font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="relative isolate overflow-hidden border-t border-line py-24 lg:py-32">
        {/* vert tropical : la Guadeloupe, le terrain */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={glow("#1f9d55", "50% 100%", 80, 100, 45)} />
        <Container className="text-center">
          <h2 className="h-serif mx-auto max-w-3xl text-[clamp(2.25rem,5vw,3.75rem)]">Parle-nous de ton <em>événement.</em></h2>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/contact" className={solid}><Envelope size={18} weight="bold" aria-hidden="true" />Contactez-nous</Link>
            <Link href="/realisations" className={glass}><FilmSlate size={18} weight="bold" aria-hidden="true" />Nos réalisations</Link>
          </div>
          <p className="mt-6 text-sm text-muted">
            Tu streames seul ? <Link href="/tarifs" className="text-foreground underline underline-offset-4">Voir les outils et les tarifs</Link>.
          </p>
        </Container>
      </section>
    </>
  );
}
