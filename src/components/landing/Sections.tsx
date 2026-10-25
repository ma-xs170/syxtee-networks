import MacAndPc from "@/components/landing/MacAndPc";
import Link from "next/link";
import { Container } from "../ui";
import { ButtonLink } from "../ui/Button";
import Highlight from "../ui/Highlight";
import DirectorDemo from "./DirectorDemo";
import Reveal from "../ui/Reveal";
import { Envelope, UserCircle } from "@phosphor-icons/react/dist/ssr";
import L from "../L";
import { glow } from "@/lib/glow";
import HeroVideo from "./HeroVideo";
import HeroChat from "./HeroChat";
import TwitchCategories from "./TwitchCategories";
import Faq from "./Faq";
import ObsHero from "./ObsHero";
import SceneSwitcher from "./SceneSwitcher";
import GuadeloupeMap from "./GuadeloupeMap";
import Streamer from "@/components/illustrations/Streamer";
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

function Cell({ className = "", title, text, children, delay = 0, href, cta }: { className?: string; title: React.ReactNode; text: React.ReactNode; children?: React.ReactNode; delay?: number; href?: string; cta?: React.ReactNode }) {
  // Même structure pour les quatre cartes : une zone d'illustration de hauteur fixe, un filet, puis titre et texte.
  return (
    <Reveal as="article" delay={delay} className={`bento-cell flex h-full flex-col ${className}`}>
      <div className="flex h-56 items-center justify-center border-b border-line px-6 sm:px-8">{children}</div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-muted">{text}</p>
        {href && cta && <Link href={href} className="mt-auto inline-flex min-h-11 items-center pt-4 text-sm font-medium text-foreground underline-offset-4 hover:underline">{cta}</Link>}
      </div>
    </Reveal>
  );
}

export function HomeHero() {
  return (
    <section id="accueil-hero" data-theme="dark" className="relative isolate flex min-h-dvh items-center overflow-hidden text-foreground">
      <HeroVideo><HeroChat /></HeroVideo>
      <Container className="relative pb-24 pt-[calc(5rem+65px)] text-center lg:pb-32">
        <h1 className="rise h-serif mx-auto max-w-[16ch] text-[clamp(2.75rem,6.5vw,5.5rem)] [text-shadow:0_2px_30px_rgba(0,0,0,0.5)]" style={rise(0)}>
          <L fr={<>Ton direct, <em>sans limites.</em></>} en={<>Your live, <em>without limits.</em></>} />
        </h1>
        <p className="rise mx-auto mt-6 max-w-[40ch] text-lg leading-relaxed text-foreground/80 [text-shadow:0_1px_16px_rgba(0,0,0,0.6)]" style={rise(1)}>
          <L fr={<><strong className="font-semibold text-foreground">Nous produisons de A à Z</strong> votre prochain stream IRL.</>} en={<><strong className="font-semibold text-foreground">We produce from A to Z</strong> your next IRL stream.</>} />
        </p>
        <div className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={rise(2)}>
          <Link href="/contact" className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-foreground px-6 text-[15px] font-medium text-background transition-opacity hover:opacity-85"><L fr="Contactez-nous" en="Contact us" /></Link>
          <Link href="/realisations" className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-foreground/25 bg-foreground/[0.06] px-6 text-[15px] font-medium text-foreground transition-colors hover:border-foreground/40 hover:bg-foreground/[0.12]"><L fr="Nos réalisations" en="Our work" /></Link>
        </div>
      </Container>
    </section>
  );
}


export function ProductionSection() {
  return (
    <section id="production" className="relative isolate scroll-mt-20 overflow-hidden border-b border-line pb-24 pt-20 lg:pb-32 lg:pt-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={glow("var(--bad)", "100% 0%", 70, 60, 28)} />
      <Container>
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className={h2}><L fr={<>Ton live IRL, <em>entre de bonnes mains.</em></>} en={<>Your IRL live, <em>in good hands.</em></>} /></h2>
        </Reveal>

        <Reveal className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/contact" className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-foreground px-6 text-[15px] font-medium text-background transition-opacity hover:opacity-85"><L fr="Contactez-nous" en="Contact us" /></Link>
          <ButtonLink href="/realisations" variant="secondary" className="h-12 px-6 text-[15px]"><L fr="Nos réalisations" en="Our work" /></ButtonLink>
        </Reveal>
        <TwitchCategories />
      </Container>
    </section>
  );
}

export function StreamersIntro({ streamers = [] }: { streamers?: HomeStreamer[] }) {
  return (
    <section id="streamers" className="relative isolate scroll-mt-20 overflow-hidden border-b border-line pb-12 pt-24 lg:pb-16 lg:pt-36">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={glow("#9146ff", "0% 0%", 70, 55, 24)} />
      <Container className="text-center">
        <Reveal>
          <h2 className={`${h2} mx-auto max-w-[20ch]`}><L fr={<>Streamers indépendants : les mêmes outils, <em>pas cher.</em></>} en={<>Independent streamers: the same tools, <em>for less.</em></>} /></h2>
          <p className={`${lead} mx-auto`}><L fr="Pilote ton OBS depuis ton téléphone et diffuse en SRTLA sur nos relais. Gratuit pour commencer, dès 5 € par mois." en="Control your OBS from your phone and stream over SRTLA on our relays. Free to start, from €5 a month." /></p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/inscription"><L fr="Créer mon compte" en="Create my account" /></ButtonLink>
            <ButtonLink href="/tarifs" variant="secondary"><L fr="Voir les tarifs" en="See pricing" /></ButtonLink>
          </div>
        </Reveal>
        <div className="mt-14">
          <ObsHero images={{ laptop: deviceImage("laptop"), phone: deviceImage("phone") }} />
        </div>
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
    <section id="comment" className="scroll-mt-20 pb-24 pt-12 lg:pb-36 lg:pt-16">
      <Container>
        <Reveal className="text-center">
          <h2 className={`${h2} mx-auto max-w-[20ch]`}><L fr={<>{product.remoteName}, ton OBS <em>dans la poche.</em></>} en={<>Remote control, your OBS <em>in your pocket.</em></>} /></h2>
          <p className={`${lead} mx-auto`}><L fr="Chaque bouton agit sur ton vrai OBS, en direct." en="Every button acts on your real OBS, live." /></p>
        </Reveal>
        <div className="mx-auto mt-12 grid max-w-4xl auto-rows-fr gap-5 md:grid-cols-2">
          <Cell delay={0.0} title={<L fr="Change de scène en un tap" en="Switch scenes in one tap" />} text={<L fr="Début, direct, connexion perdue, fin : la scène change sur ton OBS, sans attendre." en="Start, live, connection lost, end: the scene changes on your OBS, instantly." />}>
            <SceneSwitcher />
          </Cell>
          <Cell delay={0.08} title={<L fr="Mixer audio à distance" en="Remote audio mixer" />} text={<L fr="Coupe un micro ou règle un niveau pendant que tu es sur le terrain." en="Mute a mic or set a level while you are out in the field." />}>
            <div aria-hidden="true" className="flex h-24 w-full max-w-xs items-end gap-1.5">
              {[40, 62, 50, 78, 66, 88, 58, 72, 46, 64].map((h, i) => (
                <span key={i} className={`level-bar h-full flex-1 origin-bottom rounded-t-md ${i > 7 ? "bg-bad" : "bg-foreground/55"}`} style={{ "--p": h / 100, transform: `scaleY(${h / 100})`, animationDuration: `${650 + ((i * 137) % 500)}ms`, animationDelay: `${-((i * 211) % 700)}ms` } as React.CSSProperties} />
              ))}
            </div>
          </Cell>
          <Cell delay={0.16} title={<L fr="Espaces partagés" en="Shared spaces" />} text={<L fr="Invite un modérateur ou un monteur à piloter avec toi, chacun avec son compte et son rôle." en="Invite a moderator or an editor to control with you, each with their own account and role." />} href="/espaces-partages" cta={<L fr="Découvrir les espaces partagés" en="Discover shared spaces" />}>
            <div aria-hidden="true" className="flex items-center justify-center gap-4">
              {[["M", "from-violet-500 to-pink-500"], ["L", "from-sky-500 to-blue-600"], ["S", "from-emerald-500 to-teal-600"], ["+", "from-amber-400 to-orange-500"]].map(([l, c]) => (
                <span key={l} className={`grid size-14 place-items-center rounded-2xl bg-gradient-to-br ${c} text-lg font-semibold text-white shadow-lg`}>{l}</span>
              ))}
            </div>
          </Cell>
          <Cell delay={0.24} title={<L fr="Tourne sur ton propre PC ou Mac" en="Runs on your own PC or Mac" />} text={<L fr="Zéro serveur à louer. Tu relies ton ordinateur avec un code." en="No server to rent. You link your computer with a code." />}>
            <MacAndPc className="mx-auto max-h-full max-w-[320px]" />
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
              <ButtonLink href="/contact">Contactez-nous</ButtonLink>
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
    <section data-theme="dark" className="relative isolate flex min-h-[680px] items-center overflow-hidden border-t border-line bg-background py-24 text-foreground sm:min-h-[820px] sm:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={glow("var(--bad)", "50% 50%", 60, 70, 22)} />
      <GuadeloupeMap />
      {/* Voile sombre derrière le texte : la carte reste en fond, le texte garde tout son contraste. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: "radial-gradient(40% 45% at 50% 50%, color-mix(in srgb, var(--background) 88%, transparent), transparent 100%)" }} />
      <Container className="relative w-full text-center">
        <h2 className="h-serif mx-auto max-w-[14ch] text-[clamp(2.75rem,6vw,4.5rem)]"><L fr={<>Ton prochain direct <em>commence ici.</em></>} en={<>Your next live <em>starts here.</em></>} /></h2>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/contact" className="inline-flex h-12 items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-foreground px-6 text-[15px] font-medium text-background transition-opacity hover:opacity-85"><Envelope size={18} weight="fill" aria-hidden="true" /><L fr="Contactez-nous" en="Contact us" /></Link>
          <Link href="/inscription" className="inline-flex h-12 items-center justify-center gap-2.5 whitespace-nowrap rounded-full border border-foreground/25 bg-foreground/[0.06] px-6 text-[15px] font-medium text-foreground transition-colors hover:border-foreground/40 hover:bg-foreground/[0.12]"><UserCircle size={18} weight="fill" aria-hidden="true" /><L fr="Créer un compte" en="Create an account" /></Link>
        </div>
      </Container>
    </section>
  );
}
