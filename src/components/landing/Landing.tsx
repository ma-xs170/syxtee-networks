import { ButtonLink } from "../ui/Button";
import { ctaLabel, fromPrice, product } from "@/config/product";
import { Container } from "../ui";
import HeroBox from "./HeroBox";
import IntegrationTabs from "./IntegrationTabs";
import LiveDemo from "./LiveDemo";

// Landing façon Resend : hero, compatibilité, intégration, deux produits, aperçus, grille de fonctions, formules, appel final.

const h2 = "text-3xl font-medium tracking-[-0.03em] sm:text-4xl";
const lead = "mt-4 max-w-[60ch] text-base leading-relaxed text-muted";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <Container className="pb-12 pt-14 text-center lg:pt-20">
        <h1 className="rise h-hero mx-auto text-[clamp(2.75rem,8vw,5.5rem)]" style={{ "--i": 0 } as React.CSSProperties}>
          {product.name}
        </h1>
        <p className="rise mx-auto mt-5 max-w-[52ch] text-lg leading-relaxed text-muted" style={{ "--i": 1 } as React.CSSProperties}>
          {product.tagline}
        </p>
        <div className="rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ "--i": 2 } as React.CSSProperties}>
          <ButtonLink href="/acces">{ctaLabel(product.availability)}</ButtonLink>
          <ButtonLink href={product.discord} external variant="secondary">
            Rejoindre le Discord
          </ButtonLink>
        </div>
        <p className="rise mt-4 text-sm text-muted" style={{ "--i": 3 } as React.CSSProperties}>
          {fromPrice()}
        </p>
        <div className="rise mt-6" style={{ "--i": 4 } as React.CSSProperties}>
          <HeroBox />
        </div>
      </Container>
    </section>
  );
}

export function LiveDemoSection() {
  return (
    <section aria-label="Démo en direct" className="border-b border-line py-16 lg:py-24">
      <Container>
        <h2 className={h2}>Regarde le bonding travailler.</h2>
        <p className={lead}>Une simulation : coupe une connexion et suis le débit, la latence et la perte réagir.</p>
        <div className="mt-10">
          <LiveDemo />
        </div>
      </Container>
    </section>
  );
}

export function CompatStrip() {
  const names = product.compat;
  return (
    <section aria-label="Compatibilité" className="border-b border-line">
      <Container className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 py-8">
        {names.map((n) => (
          <span key={n} className="text-lg font-semibold tracking-tight text-foreground/45">
            {n}
          </span>
        ))}
      </Container>
    </section>
  );
}

export function IntegrationSection() {
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <h2 className={h2}>Intègre-toi en quelques minutes.</h2>
          <p className={lead}>Colle l&apos;adresse du relais dans ton logiciel. Pas de serveur à monter, pas de port à ouvrir.</p>
        </div>
        <IntegrationTabs />
      </Container>
    </section>
  );
}

export function LandingFinalCta() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <Container className="relative text-center">
        <h2 className="h-hero mx-auto max-w-3xl">Ton stream, réinventé.</h2>
        <div className="mt-9 flex justify-center">
          <ButtonLink href="/acces">{ctaLabel(product.availability)}</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
