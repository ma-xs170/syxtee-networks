import Link from "next/link";
import { Container } from "../ui";
import { ButtonLink } from "../ui/Button";
import { Badge } from "../ui/Badge";
import Diagram from "./Diagram";
import Faq from "./Faq";
import IntegrationTabs from "./IntegrationTabs";
import LiveDemo from "./LiveDemo";
import ObsHero from "./ObsHero";
import PlatformStrip from "./PlatformStrip";
import RelayBox from "./RelayBox";
import VisualSlot from "./VisualSlot";
import { ctaLabel, product } from "@/config/product";

const h2 = "text-3xl font-medium tracking-[-0.03em] sm:text-4xl";
const lead = "mt-4 max-w-[60ch] text-base leading-relaxed text-muted";
const cap = "text-xs text-muted";
const rise = (i: number) => ({ "--i": i }) as React.CSSProperties;

function Cell({ className = "", title, text, children }: { className?: string; title: string; text: string; children?: React.ReactNode }) {
  return (
    <article className={`bento-cell flex flex-col p-6 sm:p-7 ${className}`}>
      <div className="min-h-0 flex-1">{children}</div>
      <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-[48ch] text-sm leading-relaxed text-muted">{text}</p>
    </article>
  );
}

/* 1. OBS CLOUD : hero, démo Mac + iPhone, bento, schéma */
export function ObsHeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <Container className="pb-14 pt-14 text-center lg:pt-20">
        <h1 className="rise h-hero mx-auto max-w-[18ch] text-[clamp(2.5rem,6.5vw,4.75rem)]" style={rise(0)}>
          Pilote ton OBS à distance, depuis n&apos;importe où.
        </h1>
        <p className="rise mx-auto mt-5 max-w-[56ch] text-lg leading-relaxed text-muted" style={rise(1)}>
          Scènes, audio, démarrage du live : depuis ton navigateur ou ton téléphone, sur ton propre PC ou Mac. Aucun serveur en plus.
        </p>
        <div className="rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" style={rise(2)}>
          <ButtonLink href="/acces">Demander l&apos;accès</ButtonLink>
          <ButtonLink href="#comment" variant="secondary">Voir comment ça marche</ButtonLink>
        </div>
        <div className="rise mt-12" style={rise(3)}>
          <ObsHero />
        </div>
        <div className="mt-6"><PlatformStrip /></div>
      </Container>
    </section>
  );
}

export function ObsBento() {
  return (
    <section id="comment" className="scroll-mt-20 border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>{product.remoteName}, ton OBS dans la poche.</h2>
        <p className={lead}>Chaque bouton agit sur ton vrai OBS, en direct.</p>
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          <Cell className="md:col-span-2" title="Change de scène en un tap" text="Live, drone, BRB : la scène change sur ton OBS, sans attendre.">
            <div className="grid grid-cols-2 gap-2 pt-1">
              {["Live IRL", "Drone", "BRB", "Chat"].map((s, i) => (
                <span key={s} className={`rounded-xl border px-4 py-3 text-sm ${i === 0 ? "border-foreground/40 bg-surface-2" : "border-line text-muted"}`}>{s}</span>
              ))}
            </div>
          </Cell>
          <Cell className="md:col-span-2" title="Mixer audio à distance" text="Coupe un micro ou règle un niveau pendant que tu es sur le terrain.">
            <div className="flex h-24 items-end gap-1.5 pt-1" aria-hidden="true">
              {[40, 62, 50, 78, 66, 88, 58, 72, 46, 64].map((h, i) => (
                <span key={i} className={`flex-1 rounded-t-md ${i > 7 ? "bg-warn" : "bg-ok"}`} style={{ height: `${h}%`, opacity: 0.8 }} />
              ))}
            </div>
          </Cell>
          <Cell className="md:col-span-2" title="Espaces partagés" text="Invite un modérateur ou un monteur à piloter avec toi, chacun avec son compte et son rôle.">
            <div className="flex -space-x-2 pt-2" aria-hidden="true">
              {["M", "L", "S", "+"].map((l, i) => (
                <span key={l} className="grid h-11 w-11 place-items-center rounded-xl border border-background bg-gradient-to-br from-violet-500 to-pink-500 text-sm font-semibold text-white" style={{ opacity: 1 - i * 0.12 }}>{l}</span>
              ))}
            </div>
          </Cell>
          <Cell className="md:col-span-2" title="Tourne sur ton propre PC ou Mac" text="Zéro serveur à louer. Tu relies ton ordinateur avec un code.">
            <p className="inline-flex items-center gap-3 rounded-xl border border-line-strong bg-background/60 px-5 py-3 font-mono text-lg tracking-[0.3em]">SYX-4F7K</p>
            <p className={`${cap} mt-2`}>Exemple de code de pairing</p>
          </Cell>
        </div>
        <div className="bento-cell mt-4 p-6">
          <Diagram />
        </div>
      </Container>
    </section>
  );
}

/* 2. Relais */
export function RelaySection() {
  return (
    <section id="relais" className="scroll-mt-20 border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>Un relais qui ne lâche pas ton direct.</h2>
        <p className={`${lead} max-w-[68ch]`}>
          Ton téléphone envoie la vidéo en SRT ou SRTLA par plusieurs connexions à la fois (4G, 5G, eSIM, satellite). Le relais les réunit en un seul flux : si une connexion tombe, les autres compensent, et une mire de coupure s&apos;affiche si tout lâche. Serveur à {product.relayServer.city} ({product.relayServer.code}).
        </p>
        <div className="mt-12 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <IntegrationTabs />
          <div className="bento-cell flex flex-col justify-between p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight">Où capter</h3>
              <Badge>Bientôt</Badge>
            </div>
            <VisualSlot name="coverage-map" className="mt-5" fallback={<CoverageMap />} />
            <p className="mt-4 text-sm text-muted">La carte de couverture 4G et 5G de la communauté, pour choisir ton spot.</p>
          </div>
        </div>
        <div className="mt-10">
          <LiveDemo />
        </div>
      </Container>
    </section>
  );
}

function CoverageMap() {
  const hexes: [number, number, number][] = [[40, 40, 0.5], [88, 40, 0.8], [136, 40, 0.3], [64, 82, 0.9], [112, 82, 0.6], [160, 82, 0.2], [40, 124, 0.4], [88, 124, 1], [136, 124, 0.7]];
  return (
    <svg viewBox="0 0 200 160" className="h-44 w-full" aria-hidden="true">
      {hexes.map(([x, y, o], i) => (
        <path key={i} d={`M${x} ${y - 24} l21 12 v24 l-21 12 l-21 -12 v-24z`} fill="var(--ok)" fillOpacity={o * 0.35} stroke="var(--foreground)" strokeOpacity="0.2" />
      ))}
      <circle cx="88" cy="124" r="4" fill="var(--foreground)" />
    </svg>
  );
}

/* 3. Encodeur : en développement, teaser sobre */
export function EncoderSection() {
  const { specs } = product;
  const rows: [string, string][] = [
    ["Connexions bondées", `Jusqu'à ${specs.bondedConnections}`],
    ["Latence moyenne", `${specs.latencyMs} ms`],
    ["Protocoles", specs.protocols.join(", ")],
    ["Ports", specs.ports.join(", ")],
    ["Alimentation", specs.power],
  ];
  return (
    <section id="encodeur" className="scroll-mt-20 border-b border-line py-20 lg:py-28">
      <Container>
        <div className="bento-cell grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="opacity-90 [filter:saturate(0.7)]">
            <VisualSlot name="encoder-hero" fallback={<RelayBox />} />
          </div>
          <div>
            <span className="inline-flex items-center rounded-full border border-warn/40 bg-warn/15 px-3.5 py-1 text-xs font-semibold tracking-[0.12em] text-warn">EN DÉVELOPPEMENT</span>
            <h2 className={`${h2} mt-5`}>SYXTEE Encodeur.</h2>
            <p className={lead}>{product.tagline}</p>
            <dl className="mt-6 divide-y divide-line text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-mono">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted">Caractéristiques indicatives, susceptibles d&apos;évoluer. Prix : bientôt disponible.</p>
            <div className="mt-6">
              <ButtonLink href={product.discord} external>{product.availability === "available" ? ctaLabel(product.availability) : "Être prévenu"}</ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function PricingSection() {
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>Choisis ta formule.</h2>
        <p className={lead}>{product.remoteName} et le relais, trois formules. Les prix seront annoncés bientôt. L&apos;accès se fait sur invitation.</p>
        <div className="mt-12 grid items-stretch gap-4 md:grid-cols-3">
          {product.plans.map((p) => (
            <article key={p.id} className={`bento-cell flex flex-col p-6 ${"featured" in p && p.featured ? "!border-line-strong bg-surface-2 md:-my-3 md:py-9" : ""}`}>
              <h3 className="text-xl font-semibold tracking-tight">{p.name}</h3>
              <p className="mt-1 text-sm text-muted">{p.text}</p>
              <p className="mt-5 text-2xl font-medium tracking-tight text-foreground/70">{product.priceLabel(p.price) ?? "Bientôt disponible"}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-muted">
                {p.points.map((x) => (
                  <li key={x} className="flex gap-2.5"><span aria-hidden="true" className="text-foreground">+</span>{x}</li>
                ))}
              </ul>
              <div className="mt-6">
                <ButtonLink href={product.discord} external variant={"featured" in p && p.featured ? "primary" : "secondary"} className="w-full">Rejoindre la communauté</ButtonLink>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">
          Tarifs en vigueur : page <Link href="/tarifs" className="text-foreground underline-offset-4 hover:underline">Tarifs</Link>. Le SYXTEE Encodeur est en développement, prix bientôt disponible.
        </p>
      </Container>
    </section>
  );
}

export function FaqSection() {
  const items = [
    { q: "Faut-il un abonnement ?", a: "L'accès se fait sur invitation. Les formules Gratuit, Payant et Partenaire existent ; les prix seront annoncés bientôt." },
    { q: "Quelles connexions puis-je utiliser ?", a: "Ton téléphone envoie en SRT, SRTLA ou RTMP. Les connexions 4G, 5G, eSIM et satellite se réunissent en un seul flux." },
    { q: "Dois-je louer un serveur pour OBS CLOUD ?", a: "Non. Le plugin tourne sur ton propre PC ou Mac et se relie à ton compte avec un code." },
    { q: "Quand est-ce disponible ?", a: "OBS CLOUD et le relais sont disponibles pour les comptes invités. Demande ton accès. L'Encodeur est en développement." },
    { q: "Comment obtenir de l'aide ?", a: "Le support se fait sur Discord. Donne ton ID de support dans ton ticket, on retrouve ton compte sans ton e-mail." },
  ];
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={`${h2} mb-10 text-center`}>Questions fréquentes</h2>
        <Faq items={items} />
      </Container>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="py-24 sm:py-32">
      <Container className="text-center">
        <h2 className="h-hero mx-auto max-w-3xl">Prêt à piloter ton direct ?</h2>
        <div className="mt-9 flex justify-center">
          <ButtonLink href="/acces">Demander l&apos;accès</ButtonLink>
        </div>
        <div className="mt-12"><PlatformStrip /></div>
      </Container>
    </section>
  );
}
