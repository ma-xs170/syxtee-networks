import Link from "next/link";
import { ButtonLink } from "../ui/Button";
import { Card } from "../ui/Card";
import GlassIcon from "../ui/GlassIcon";
import StatusDot from "../ui/StatusDot";
import { Broadcast, Cpu, ChartLineUp, ChatsCircle, Faders, Globe, PlugsConnected, WifiHigh } from "@/components/icons";
import { site } from "@/lib/site";
import { Container } from "../ui";
import HeroObject from "./HeroObject";
import IntegrationTabs from "./IntegrationTabs";

// Landing façon Resend : hero, compatibilité, intégration, deux produits, aperçus, grille de fonctions, formules, appel final.

const h2 = "text-3xl font-medium tracking-[-0.03em] sm:text-4xl";
const lead = "mt-4 max-w-[60ch] text-base leading-relaxed text-muted";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <Container className="grid min-h-[34rem] items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div>
          <h1 className="rise h-hero max-w-[14ch] text-[clamp(2.75rem,7vw,5rem)]" style={{ "--i": 0 } as React.CSSProperties}>
            Le relais IRL pour les streamers.
          </h1>
          <p className="rise mt-6 max-w-[46ch] text-lg leading-relaxed text-muted" style={{ "--i": 1 } as React.CSSProperties}>
            Réunis 4G, 5G, Wi-Fi et Starlink en un flux stable, et pilote ton OBS depuis ton téléphone.
          </p>
          <div className="rise mt-9 flex flex-col gap-3 sm:flex-row" style={{ "--i": 2 } as React.CSSProperties}>
            <ButtonLink href="/acces">Commencer</ButtonLink>
            <ButtonLink href={site.discord} external variant="secondary">
              Rejoindre le Discord
            </ButtonLink>
          </div>
        </div>
        <div className="rise flex justify-center lg:justify-end" style={{ "--i": 3 } as React.CSSProperties}>
          <HeroObject />
        </div>
      </Container>
    </section>
  );
}

export function CompatStrip() {
  const names = ["Moblin", "OBS", "BELABOX", "Twitch", "YouTube", "Kick", "Starlink"];
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

export function ProductsSection() {
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>Une expérience first-class.</h2>
        <p className={lead}>Deux produits, un seul compte.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col">
            <GlassIcon>
              <Broadcast weight="light" />
            </GlassIcon>
            <h3 className="mt-6 text-xl font-semibold tracking-tight">Relais SRTLA</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Le bonding de plusieurs connexions vers un relais au Canada, avec santé du flux en temps réel et mire de coupure.</p>
            <div className="mt-6 rounded-xl border border-line bg-background p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted">bhs1 · Beauharnois</span>
                <StatusDot status="live" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  ["Débit", "6,2 Mb/s"],
                  ["Latence", "41 ms"],
                  ["Perte", "0,3 %"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-muted">{k}</p>
                    <p className="mt-1 font-mono text-sm">{v}</p>
                  </div>
                ))}
              </div>
            </div>
            <Link href="/relais" className="mt-6 text-sm text-muted transition-colors hover:text-foreground">
              En savoir plus →
            </Link>
          </Card>
          <Card className="flex flex-col">
            <GlassIcon>
              <Faders weight="light" />
            </GlassIcon>
            <h3 className="mt-6 text-xl font-semibold tracking-tight">OBS CLOUD</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Scènes, mixeur audio, direct et multistream : le contrôle à distance de ton OBS depuis un téléphone.</p>
            <div className="mt-6 rounded-xl border border-line bg-background p-4">
              <div className="flex gap-2">
                {["Live", "BRB", "Drone"].map((s, i) => (
                  <span key={s} className={`rounded-lg border px-3 py-1.5 text-xs ${i === 0 ? "border-foreground/40 bg-surface-2 text-foreground" : "border-line text-muted"}`}>
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-4 space-y-2" aria-hidden="true">
                {[72, 48].map((w) => (
                  <div key={w} className="h-1.5 rounded-full bg-foreground/10">
                    <div className="h-full rounded-full bg-foreground/50" style={{ width: `${w}%` }} />
                  </div>
                ))}
              </div>
            </div>
            <Link href="/controle-a-distance" className="mt-6 text-sm text-muted transition-colors hover:text-foreground">
              En savoir plus →
            </Link>
          </Card>
        </div>
      </Container>
    </section>
  );
}

export function GoFurtherSection() {
  const spark = "M0 38 L20 30 L40 34 L60 20 L80 26 L100 12 L120 18";
  const cards = [
    { title: "Santé du flux", value: "Stable", sub: "Aucune coupure sur 30 min", status: "live" as const },
    { title: "Débit agrégé", value: "6,2 Mb/s", sub: "4 connexions actives", status: "live" as const },
    { title: "Réseau", value: "4G + 5G", sub: "Où capter : carte de couverture", status: "unstable" as const },
  ];
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>Va plus loin.</h2>
        <p className={lead}>Chaque métrique de ton direct, en temps réel, dans ton dashboard. Exemples ci-dessous.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.title}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">{c.title}</p>
                <StatusDot status={c.status} label={c.status === "unstable" ? "Variable" : undefined} />
              </div>
              <p className="mt-4 text-3xl font-medium tracking-tight">{c.value}</p>
              <p className="mt-1 text-sm text-muted">{c.sub}</p>
              <svg viewBox="0 0 120 44" className="mt-6 h-12 w-full" fill="none" aria-hidden="true">
                <path d={spark} stroke="var(--ok)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function FeatureGrid() {
  const items = [
    { icon: Globe, title: "Relais au Canada", text: "Un serveur à Beauharnois, joignable par un nom de domaine stable." },
    { icon: WifiHigh, title: "Bonding multi-connexions", text: "4G, 5G, Wi-Fi et Starlink réunis en un seul flux." },
    { icon: PlugsConnected, title: "Mire de coupure", text: "Si ta source tombe, une mire prend le relais pour tes viewers." },
    { icon: ChartLineUp, title: "Monitoring temps réel", text: "Débit, latence et perte de paquets par connexion." },
    { icon: Cpu, title: "Contrôle OBS à distance", text: "Scènes, audio et direct depuis ton téléphone." },
    { icon: ChatsCircle, title: "Support Discord", text: "L'équipe répond sur le Discord de la communauté." },
  ];
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>Pensé pour le direct en mobilité.</h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.title} className="bg-background p-8 transition-colors hover:bg-surface">
              <it.icon size={24} weight="light" aria-hidden="true" />
              <h3 className="mt-5 text-base font-semibold tracking-tight">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{it.text}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function PricingSection() {
  const plans = [
    { name: "Gratuit", text: "Découvre le dashboard et le contrôle à distance.", points: ["Compte et dashboard", "Accès à la documentation", "Support Discord"] },
    { name: "Payant", text: "Relais, santé du flux et multistream pour streamer chaque semaine.", points: ["Relais SRTLA et RTMP", "Santé du flux et mire", "Contrôle à distance d'OBS"], featured: true },
    { name: "Partenaire", text: "Pour les créateurs et les régies que l'équipe accompagne.", points: ["Accès illimité", "Espaces partagés", "Contact direct avec l'équipe"] },
  ];
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>Des formules simples.</h2>
        <p className={lead}>Les prix seront annoncés bientôt. L&apos;accès se fait sur invitation.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.name} className={p.featured ? "border-line-strong" : ""}>
              <h3 className="text-lg font-semibold tracking-tight">{p.name}</h3>
              <p className="mt-1 text-sm text-muted">{p.text}</p>
              <p className="mt-6 text-2xl font-medium tracking-tight text-foreground/70">Bientôt disponible</p>
              <ul className="mt-6 space-y-2.5 text-sm text-muted">
                {p.points.map((x) => (
                  <li key={x} className="flex gap-2.5">
                    <span aria-hidden="true" className="text-foreground">+</span>
                    {x}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">
          Les tarifs en vigueur sont sur la page{" "}
          <Link href="/tarifs" className="text-foreground underline-offset-4 hover:underline">
            Tarifs
          </Link>
          .
        </p>
      </Container>
    </section>
  );
}

export function LandingFinalCta() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <Container className="relative text-center">
        <h2 className="h-hero mx-auto max-w-3xl">Ton stream, réinventé. Disponible aujourd&apos;hui.</h2>
        <div className="mt-9 flex justify-center">
          <ButtonLink href="/acces">Commencer</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
