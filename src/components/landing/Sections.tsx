import MacAndPc from "@/components/landing/MacAndPc";
import Link from "next/link";
import { Container } from "../ui";
import { ButtonLink } from "../ui/Button";
import Highlight from "../ui/Highlight";
import DirectorDemo from "./DirectorDemo";
import Reveal from "../ui/Reveal";
import Faq from "./Faq";
import ObsHero from "./ObsHero";
import SceneSwitcher from "./SceneSwitcher";
import PlatformStrip from "./PlatformStrip";
import CtaGlobe from "./CtaGlobe";
import StudioWire from "@/components/illustrations/StudioWire";
import Streamer from "@/components/illustrations/Streamer";
import BackpackEncoder from "@/components/illustrations/BackpackEncoder";
import BeachView from "@/components/illustrations/BeachView";
import StreamerStack from "@/components/home/StreamerStack";
import type { HomeStreamer } from "@/lib/streamers";
import EncoderViewer from "@/components/encoder/EncoderViewer";
import VisualSlot from "./VisualSlot";
import { ctaLabel, product } from "@/config/product";
import { deviceImage } from "@/lib/device-images";
import { CATALOG, TIERS } from "@/lib/billing";

const h2 = "h-serif text-[clamp(2.25rem,4.5vw,3.5rem)]";
const lead = "mt-4 max-w-[60ch] text-base leading-relaxed text-muted";
const rise = (i: number) => ({ "--i": i }) as React.CSSProperties;

function Cell({ className = "", title, text, children, delay = 0, href, cta }: { className?: string; title: string; text: string; children?: React.ReactNode; delay?: number; href?: string; cta?: string }) {
  return (
    <Reveal as="article" delay={delay} className={`bento-cell flex flex-col p-6 sm:p-7 ${className}`}>
      <div className="flex h-44 items-center justify-center">{children}</div>
      <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-[48ch] text-sm leading-relaxed text-muted">{text}</p>
      {href && cta && <Link href={href} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm text-foreground underline-offset-4 hover:underline">{cta} <span aria-hidden="true">→</span></Link>}
    </Reveal>
  );
}

/* Accueil : promesse, deux parcours (production sur devis, streamers indépendants) */
export function HomeHero() {
  return (
    <section data-theme="dark" className="relative isolate overflow-hidden border-b border-line bg-background text-foreground">
      <CtaGlobe variant="full" />
      <Container className="relative pb-24 pt-20 text-center lg:pb-36 lg:pt-32">
        <h1 className="rise h-serif mx-auto max-w-[16ch] text-[clamp(2.75rem,7vw,5.5rem)]" style={rise(0)}>
          Le live IRL, <em>partout.</em>
        </h1>
        <p className="rise mx-auto mt-6 max-w-[58ch] text-lg leading-relaxed text-muted" style={rise(1)}>
          Une équipe de production, des cadreurs et des relais SRTLA pour diffuser depuis n&apos;importe où. Lancé par des Guadeloupéens, des solutions de streaming IRL flexibles, depuis la Caraïbe française. Et si tu streames seul, les mêmes outils à petit prix.
        </p>
        <div className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={rise(2)}>
          <ButtonLink href="/contact">Demander une production IRL</ButtonLink>
          <ButtonLink href="#streamers" variant="secondary">Je suis streamer indépendant</ButtonLink>
        </div>
      </Container>
    </section>
  );
}

const WHITE_BTN = "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full bg-foreground px-7 text-[15px] font-medium text-background transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function ProductionSection() {
  return (
    <section id="production" className="scroll-mt-20 border-b border-line py-24 lg:py-36">
      <Container>
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className={h2}>On produit ton live IRL, <em>de A à Z.</em></h2>
          <p className={`${lead} mx-auto`}>
            Tu veux un direct sans monter d&apos;équipe ? Nos équipes s&apos;occupent de tout, à pied, à vélo, en voiture ou en bateau, avec notre propre infrastructure. Solutions payantes ou sur devis, partout dans le monde.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          <Reveal as="article" className="bento-cell flex flex-col overflow-hidden md:row-span-2">
            <div aria-hidden="true" className="h-64 flex-1 border-b border-line text-foreground/80 md:min-h-72"><StudioWire animated={false} /></div>
            <div className="p-6 sm:p-7">
              <p className="font-mono text-xs text-muted">01</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">Régie en direct</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">Un régisseur pilote scènes, audio, caméras et plateformes pendant que tu es sur le terrain.</p>
            </div>
          </Reveal>

          <Reveal as="article" delay={0.07} className="bento-cell flex flex-col overflow-hidden">
            <div aria-hidden="true" className="h-44 border-b border-line text-foreground/80"><Streamer animated={false} /></div>
            <div className="p-6">
              <p className="font-mono text-xs text-muted">02</p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight">Cadreurs IRL</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">Des vidéastes formés au live en mobilité, à l&apos;épaule ou sur gimbal.</p>
            </div>
          </Reveal>

          <Reveal as="article" delay={0.14} className="bento-cell flex flex-col overflow-hidden">
            <div aria-hidden="true" className="h-44 border-b border-line text-foreground/80"><BackpackEncoder animated={false} /></div>
            <div className="p-6">
              <p className="font-mono text-xs text-muted">03</p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight">Un réseau qui tient</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">Plusieurs connexions cumulées sur nos relais SRTLA : le direct reste stable dans la foule.</p>
            </div>
          </Reveal>

          <Reveal as="article" delay={0.21} className="bento-cell grid overflow-hidden sm:grid-cols-2 md:col-span-2">
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <p className="font-mono text-xs text-muted">04</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">Sur place ou à distance</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">On se déplace, ou on pilote de loin depuis la Guadeloupe. Un seul interlocuteur du premier message au dernier plan.</p>
            </div>
            <div aria-hidden="true" className="h-48 border-t border-line text-foreground/80 sm:h-auto sm:border-l sm:border-t-0"><BeachView className="h-full w-full" animated={false} /></div>
          </Reveal>
        </div>

        <Reveal className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/contact" className={WHITE_BTN}>Demander une production IRL</Link>
          <Link href="/production" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-foreground underline-offset-4 hover:underline">Voir comment on travaille <span aria-hidden="true">→</span></Link>
        </Reveal>
      </Container>
    </section>
  );
}

export function StreamersIntro({ streamers = [] }: { streamers?: HomeStreamer[] }) {
  return (
    <section id="streamers" className="scroll-mt-20 border-b border-line py-24 lg:py-36">
      <Container className="text-center">
        <Reveal>
          <h2 className={`${h2} mx-auto max-w-[20ch]`}>Streamers indépendants : les mêmes outils, <em>pas cher.</em></h2>
          <p className={`${lead} mx-auto`}>Pilote ton OBS depuis ton téléphone, diffuse en SRTLA sur nos relais et suis ton flux à la seconde. Gratuit pour commencer, puis dès 5 € par mois, sans engagement.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/inscription">Créer mon compte</ButtonLink>
            <ButtonLink href="/tarifs" variant="secondary">Voir les tarifs</ButtonLink>
          </div>
        </Reveal>
        <div className="mt-14">
          <ObsHero images={{ laptop: deviceImage("laptop"), phone: deviceImage("phone") }} />
        </div>
        <div className="mt-8"><StreamerStack streamers={streamers.map((s) => ({ handle: s.handle, avatar: s.avatar }))} /></div>
      </Container>
    </section>
  );
}

/* 1. OBS CLOUD : hero, démo Mac + iPhone, bento, schéma */
export function ObsHeroSection({ streamers = [] }: { streamers?: HomeStreamer[] }) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <Container className="pb-14 pt-14 text-center lg:pt-20">
        <h1 className="rise h-serif mx-auto max-w-[18ch] text-[clamp(2.75rem,6.5vw,5rem)]" style={rise(0)}>
          Pilote ton OBS à distance, <em>depuis n&apos;importe où.</em>
        </h1>
        <p className="rise mx-auto mt-5 max-w-[56ch] text-lg leading-relaxed text-muted" style={rise(1)}>
          Scènes, audio, direct : pilote ton OBS depuis ton téléphone ou ton navigateur, sur ton propre ordinateur. Aucun serveur à louer.
        </p>
        <div className="rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" style={rise(2)}>
          <ButtonLink href="/inscription">Créer mon compte</ButtonLink>
          <ButtonLink href="#comment" variant="secondary">Voir comment ça marche</ButtonLink>
        </div>
        <div className="rise mt-12" style={rise(3)}>
          <ObsHero images={{ laptop: deviceImage("laptop"), phone: deviceImage("phone") }} />
        </div>
        <div className="mt-8"><StreamerStack streamers={streamers.map((s) => ({ handle: s.handle, avatar: s.avatar }))} /></div>
      </Container>
    </section>
  );
}

export function ObsBento() {
  return (
    <section id="comment" className="scroll-mt-20 border-b border-line py-24 lg:py-36">
      <Container>
        <Reveal>
          <h2 className={h2}>{product.remoteName}, ton OBS <em>dans la poche.</em></h2>
          <p className={lead}>Chaque bouton agit sur ton vrai OBS, en direct.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          <Cell delay={0.0} className="md:col-span-2" title="Change de scène en un tap" text="Début, direct, connexion perdue, fin : la scène change sur ton OBS, sans attendre.">
            <SceneSwitcher />
          </Cell>
          <Cell delay={0.08} className="md:col-span-2" title="Mixer audio à distance" text="Coupe un micro ou règle un niveau pendant que tu es sur le terrain.">
            <div className="flex h-32 w-full items-end gap-1.5" aria-hidden="true">
              {[40, 62, 50, 78, 66, 88, 58, 72, 46, 64].map((h, i) => (
                <span key={i} className={`level-bar h-full flex-1 origin-bottom rounded-t-md ${i > 7 ? "bg-warn" : "bg-ok"}`} style={{ "--p": h / 100, transform: `scaleY(${h / 100})`, opacity: 0.8, animationDuration: `${650 + ((i * 137) % 500)}ms`, animationDelay: `${-((i * 211) % 700)}ms` } as React.CSSProperties} />
              ))}
            </div>
          </Cell>
          <Cell delay={0.16} className="md:col-span-2" title="Espaces partagés" text="Invite un modérateur ou un monteur à piloter avec toi, chacun avec son compte et son rôle." href="/espaces-partages" cta="Découvrir les espaces partagés">
            <div className="flex items-center justify-center gap-4" aria-hidden="true">
              {[["M", "from-violet-500 to-pink-500"], ["L", "from-sky-500 to-blue-600"], ["S", "from-emerald-500 to-teal-600"], ["+", "from-amber-400 to-orange-500"]].map(([l, c]) => (
                <span key={l} className={`grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${c} text-xl font-semibold text-white shadow-lg`}>{l}</span>
              ))}
            </div>
          </Cell>
          <Cell delay={0.24} className="md:col-span-2" title="Tourne sur ton propre PC ou Mac" text="Zéro serveur à louer. Tu relies ton ordinateur avec un code.">
            <MacAndPc className="mx-auto max-w-[440px]" />
          </Cell>
        </div>
      </Container>
    </section>
  );
}

/* 2. Régie IA : plusieurs caméras, l'IA met la bonne au programme */
export function DirectorSection() {
  return (
    <section id="regie-ia" className="scroll-mt-20 border-b border-line py-24 lg:py-36">
      <Container>
        <DirectorDemo
          intro={
            <Reveal>
              <h2 className={h2}>
                Ta régie IA choisit <Highlight>la bonne caméra.</Highlight>
              </h2>
              <p className={lead}>Osmo, iPhone, drone, téléphones en SRTLA : l&apos;IA regarde chaque image et met au programme celle où il se passe quelque chose.</p>
            </Reveal>
          }
          outro={
            <Reveal className="mt-8">
              <p className="max-w-[52ch] text-sm leading-relaxed text-muted">
                Tu écris tes consignes en français, comme à un réalisateur. Une caméra coupée ou figée n&apos;est jamais choisie, et tu reprends la main d&apos;un tap.
              </p>
              <div className="mt-6">
                <ButtonLink href="/inscription">Créer mon compte</ButtonLink>
              </div>
            </Reveal>
          }
        />
      </Container>
    </section>
  );
}

/* 3. Encodeur : en développement, teaser sobre */
export function EncoderSection() {
  const { specs } = product;
  const rows: [string, string][] = [
    ["Connexions simultanées", `${specs.simultaneous} : Wi-Fi, Ethernet, 4G ou 5G`],
    ["Clé 4G USB", "Une connexion de plus par clé"],
    ["Caméra", "Entrée HDMI, 1080p60"],
    ["Prix", `${product.priceLabel(product.price)} + abonnement`],
    ["Livraison", product.shipping.map((c) => c.flag).join(" ")],
  ];
  return (
    <section id="encodeur" className="scroll-mt-20 border-b border-line py-24 lg:py-36">
      <Container>
        <div className="bento-cell grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="opacity-90 [filter:saturate(0.7)]">
            <VisualSlot name="encoder-hero" fallback={<EncoderViewer zoom={0.65} className="h-[280px] sm:h-[360px]" />} />
          </div>
          <div>
            <span className="inline-flex items-center rounded-full border border-warn/40 bg-warn/15 px-3.5 py-1 text-xs font-semibold tracking-[0.12em] text-warn">À VENIR</span>
            <h2 className={`${h2} mt-5`}>SYXTEE <em>Encodeur.</em></h2>
            <p className={lead}>{product.tagline}</p>
            <dl className="mt-6 divide-y divide-line text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-mono">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted">Caractéristiques indicatives, susceptibles d&apos;évoluer. Prix annoncé à la sortie.</p>
            <div className="mt-6">
              <ButtonLink href={product.discord} external>{product.availability === "available" ? ctaLabel(product.availability) : "Être prévenu"}</ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

const FIELD: { title: string; text: string; span: string; tint: string }[] = [
  { title: "Marathon et courses à pied", text: "Un direct qui suit les coureurs sur 42 km, sans coupure quand la foule sature le réseau.", span: "md:col-span-2", tint: "from-foreground/[0.09] via-transparent to-transparent" },
  { title: "Course cycliste", text: "Mobilité rapide, liaison stable.", span: "", tint: "from-transparent via-foreground/[0.04] to-foreground/[0.1]" },
  { title: "Manifestation publique", text: "Dans la foule, ton flux tient.", span: "", tint: "from-foreground/[0.07] to-transparent" },
  { title: "Festival et concert", text: "Plusieurs caméras, un seul pilotage.", span: "", tint: "from-transparent to-foreground/[0.08]" },
  { title: "Reportage en mobilité", text: "Légèreté et fiabilité, partout.", span: "", tint: "from-foreground/[0.1] via-transparent to-transparent" },
];

export function FieldSection() {
  return (
    <section className="border-b border-line py-24 lg:py-36">
      <Container>
        <Reveal>
          <h2 className={h2}>Pensé pour le <em>terrain.</em></h2>
          <p className={lead}>Là où le réseau est le plus dur, ton direct doit rester stable. On t&apos;aide à le préparer.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {FIELD.map((f, i) => (
            <Reveal as="article" key={f.title} delay={i * 0.07} className={`bento-cell flex min-h-52 flex-col justify-end p-6 sm:p-7 ${f.span}`}>
              <span aria-hidden="true" className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${f.tint}`} />
              <svg aria-hidden="true" viewBox="0 0 200 80" className="pointer-events-none absolute right-4 top-4 h-16 w-40 text-foreground/15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d={`M2 ${60 - i * 4} C50 ${10 + i * 6} 90 ${70 - i * 3} 140 ${34 + i * 3} S190 20 198 ${14 + i * 5}`} /><circle cx="198" cy={14 + i * 5} r="3" fill="currentColor" /></svg>
              <h3 className="relative text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="relative mt-1.5 max-w-[40ch] text-sm leading-relaxed text-muted">{f.text}</p>
            </Reveal>
          ))}
          <Reveal as="article" delay={0.35} className="bento-cell flex min-h-52 flex-col justify-between bg-surface-2 p-6 sm:p-7 md:col-span-2">
            <p className="h-serif max-w-[22ch] text-[clamp(1.75rem,3vw,2.5rem)]">Ton projet est <em>unique.</em></p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <ButtonLink href="/contact">Demander une production IRL</ButtonLink>
              <span className="text-sm text-muted">Gratuit et sans engagement.</span>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

export function PricingSection() {
  return (
    <section className="border-b border-line py-24 lg:py-36">
      <Container>
        <Reveal>
          <h2 className={h2}>Des tarifs <em>clairs.</em></h2>
          <p className={lead}>Trois formules, sans engagement. Tu changes ou tu arrêtes quand tu veux.</p>
        </Reveal>
        <div className="mt-12 grid items-stretch gap-4 md:grid-cols-3">
          {TIERS.map((t, k) => {
            const c = CATALOG[t];
            return (
              <Reveal as="article" delay={k * 0.08} key={t} className={`bento-cell flex flex-col p-6 ${c.featured ? "!border-line-strong bg-surface-2" : ""}`}>
                <h3 className="text-xl font-semibold tracking-tight">{c.name}</h3>
                <p className="mt-1 min-h-10 text-sm text-muted">{c.pitch}</p>
                <p className="mt-5 text-4xl font-semibold tracking-tight">{c.prices.month.amount}<span className="ml-1.5 text-sm font-normal text-muted">par mois</span></p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-muted">
                  {c.points.slice(0, 4).map((x) => (
                    <li key={x} className="flex gap-2.5"><span aria-hidden="true" className="text-foreground">+</span>{x}</li>
                  ))}
                </ul>
                <div className="mt-6">
                  <ButtonLink href="/tarifs" variant={c.featured ? "primary" : "secondary"} className="w-full">Voir les détails</ButtonLink>
                </div>
              </Reveal>
            );
          })}
        </div>
        <p className="mt-6 text-sm text-muted">
          TVA non applicable, article 293 B du CGI. Détail et comparaison sur la page <Link href="/tarifs" className="text-foreground underline-offset-4 hover:underline">Tarifs</Link>.
        </p>
      </Container>
    </section>
  );
}

export function FaqSection() {
  const items = [
    { q: "Faut-il un abonnement ?", a: "Le compte est gratuit. Les services s'ouvrent avec une formule : Essentiel, Signature ou Prestige, sans engagement." },
    { q: "Dois-je louer un serveur pour le contrôle à distance ?", a: "Non. Le plugin tourne sur ton propre PC ou Mac et se relie à ton compte avec un code." },
    { q: "Quand est-ce disponible ?", a: "Le contrôle à distance est disponible pour les comptes invités. Crée ton compte." },
    { q: "Comment obtenir de l'aide ?", a: "Depuis ton espace, page Assistance : tu écris à l'équipe et tu suis la réponse sur place, généralement sous 24 h. Le Discord est réservé à la communauté." },
  ];
  return (
    <section className="border-b border-line py-24 lg:py-36">
      <Container>
        <h2 className={`${h2} mb-10 text-center`}>Questions <em>fréquentes</em></h2>
        <Faq items={items} />
      </Container>
    </section>
  );
}

export function FinalCta() {
  return (
    <section data-theme="dark" className="relative isolate overflow-hidden bg-background pb-56 pt-24 text-foreground sm:pb-72 sm:pt-32">
      <CtaGlobe />
      <Container className="relative text-center">
        <h2 className="h-serif mx-auto max-w-3xl text-[clamp(2.75rem,6vw,4.5rem)]">Prêt à partir en <em>direct ?</em></h2>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/contact">Demander une production IRL</ButtonLink>
          <ButtonLink href="/inscription" variant="secondary">Créer mon compte</ButtonLink>
        </div>
        <div className="mt-12"><PlatformStrip /></div>
      </Container>
    </section>
  );
}
