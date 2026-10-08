import MacAndPc from "@/components/landing/MacAndPc";
import Link from "next/link";
import { Container } from "../ui";
import { ButtonLink } from "../ui/Button";
import FxIcon from "../ui/FxIcon";
import Reveal from "../ui/Reveal";
import Faq from "./Faq";
import ObsHero from "./ObsHero";
import PlatformStrip from "./PlatformStrip";
import RelayBox from "./RelayBox";
import VisualSlot from "./VisualSlot";
import { ctaLabel, product } from "@/config/product";
import { deviceImage } from "@/lib/device-images";

const h2 = "h-serif text-[clamp(2.25rem,4.5vw,3.5rem)]";
const lead = "mt-4 max-w-[60ch] text-base leading-relaxed text-muted";
const cap = "text-xs text-muted";
const rise = (i: number) => ({ "--i": i }) as React.CSSProperties;

function Cell({ className = "", title, text, children, delay = 0 }: { className?: string; title: string; text: string; children?: React.ReactNode; delay?: number }) {
  return (
    <Reveal as="article" delay={delay} className={`bento-cell flex flex-col p-6 sm:p-7 ${className}`}>
      <div className="flex h-44 items-center justify-center">{children}</div>
      <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-[48ch] text-sm leading-relaxed text-muted">{text}</p>
    </Reveal>
  );
}

/* 1. OBS CLOUD : hero, démo Mac + iPhone, bento, schéma */
export function ObsHeroSection() {
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
          <ButtonLink href="/acces">Demander l&apos;accès</ButtonLink>
          <ButtonLink href="#comment" variant="secondary">Voir comment ça marche</ButtonLink>
        </div>
        <div className="rise mt-12" style={rise(3)}>
          <ObsHero images={{ laptop: deviceImage("laptop"), phone: deviceImage("phone"), watch: deviceImage("watch") }} />
        </div>
        <div className="mt-6"><PlatformStrip /></div>
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
            <div className="grid w-full grid-cols-2 gap-3">
              {["Début du stream", "En direct", "Connexion perdue", "Fin du stream"].map((s, i) => (
                <span key={s} className={`rounded-xl border px-4 py-4 text-center text-sm ${i === 1 ? "border-foreground/40 bg-surface-2" : "border-line text-muted"}`}>{s}</span>
              ))}
            </div>
          </Cell>
          <Cell delay={0.08} className="md:col-span-2" title="Mixer audio à distance" text="Coupe un micro ou règle un niveau pendant que tu es sur le terrain.">
            <div className="flex h-32 w-full items-end gap-1.5" aria-hidden="true">
              {[40, 62, 50, 78, 66, 88, 58, 72, 46, 64].map((h, i) => (
                <span key={i} className={`level-bar h-full flex-1 origin-bottom rounded-t-md ${i > 7 ? "bg-warn" : "bg-ok"}`} style={{ "--p": h / 100, transform: `scaleY(${h / 100})`, opacity: 0.8, animationDuration: `${650 + ((i * 137) % 500)}ms`, animationDelay: `${-((i * 211) % 700)}ms` } as React.CSSProperties} />
              ))}
            </div>
          </Cell>
          <Cell delay={0.16} className="md:col-span-2" title="Espaces partagés" text="Invite un modérateur ou un monteur à piloter avec toi, chacun avec son compte et son rôle.">
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

/* 3. Encodeur : en développement, teaser sobre */
export function EncoderSection() {
  const { specs } = product;
  const rows: [string, string][] = [
    ["Connexions simultanées", `${specs.simultaneous} : Wi-Fi, Ethernet, 4G ou 5G`],
    ["Clé 4G USB", "Une connexion de plus par clé"],
    ["Caméra", "USB-C 2 m, 1080p60"],
    ["Prix", product.priceLabel(product.price) ?? "Bientôt disponible"],
  ];
  return (
    <section id="encodeur" className="scroll-mt-20 border-b border-line py-24 lg:py-36">
      <Container>
        <div className="bento-cell grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="opacity-90 [filter:saturate(0.7)]">
            <VisualSlot name="encoder-hero" fallback={<RelayBox />} />
          </div>
          <div>
            <span className="inline-flex items-center rounded-full border border-warn/40 bg-warn/15 px-3.5 py-1 text-xs font-semibold tracking-[0.12em] text-warn">EN DÉVELOPPEMENT</span>
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
              <ButtonLink href="/contact">Demander un devis</ButtonLink>
              <span className="text-sm text-muted">Gratuit et sans engagement.</span>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

const PLAN_ICON: Record<string, React.ReactNode> = {
  free: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  paid: <path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z" />,
  partner: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />,
};

export function PricingSection() {
  return (
    <section className="border-b border-line py-24 lg:py-36">
      <Container>
        <Reveal>
          <h2 className={h2}>Choisis ta <em>formule.</em></h2>
          <p className={lead}>Le compte gratuit est ouvert à tous, l&apos;accès partenaire se demande, et les formules payantes arrivent bientôt.</p>
        </Reveal>
        <div className="mt-12 grid items-stretch gap-4 md:grid-cols-3">
          {product.plans.map((p, k) => (
            <Reveal as="article" delay={k * 0.08} key={p.id} className={`group bento-cell flex flex-col p-6 ${"featured" in p && p.featured ? "!border-line-strong bg-surface-2" : ""}`}>
              <h3 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
                <FxIcon kind={p.id === "free" ? "user" : p.id === "paid" ? "bolt" : "star"}>{PLAN_ICON[p.id]}</FxIcon>
                {p.name}
              </h3>
              <p className="mt-1 min-h-10 text-sm text-muted">{p.text}</p>
              <p className={`mt-5 flex items-center gap-3 text-2xl font-medium tracking-tight ${p.id === "paid" ? "text-foreground/70" : "text-foreground"}`}>
                <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${p.id === "paid" ? "bg-warn" : "bg-ok"}`} />
                {p.id === "paid" ? (product.priceLabel(p.price) ?? "Bientôt disponible") : "Disponible"}
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-muted">
                {p.points.map((x) => (
                  <li key={x} className="flex gap-2.5"><span aria-hidden="true" className="text-foreground">+</span>{x}</li>
                ))}
              </ul>
              <div className="mt-6">
                <ButtonLink href={p.id === "free" ? "/inscription" : p.id === "partner" ? "/acces" : "/tarifs"} variant={p.id === "paid" ? "secondary" : "primary"} className="w-full">{p.id === "free" ? "Créer un compte" : p.id === "partner" ? "Demander l'accès" : "Voir les tarifs"}</ButtonLink>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">
          Tarifs en vigueur : page <Link href="/tarifs" className="text-foreground underline-offset-4 hover:underline">Tarifs</Link>.
        </p>
      </Container>
    </section>
  );
}

export function FaqSection() {
  const items = [
    { q: "Faut-il un abonnement ?", a: "L'accès se fait sur invitation. Les formules Gratuit, Payant et Partenaire existent ; les prix seront annoncés bientôt." },
    { q: "Dois-je louer un serveur pour le contrôle à distance ?", a: "Non. Le plugin tourne sur ton propre PC ou Mac et se relie à ton compte avec un code." },
    { q: "Quand est-ce disponible ?", a: "Le contrôle à distance est disponible pour les comptes invités. Demande ton accès." },
    { q: "Comment obtenir de l'aide ?", a: "Le support se fait sur Discord. Donne ton ID de support dans ton ticket, on retrouve ton compte sans ton e-mail." },
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
    <section className="py-24 sm:py-32">
      <Container className="text-center">
        <h2 className="h-serif mx-auto max-w-3xl text-[clamp(2.75rem,6vw,4.5rem)]">Prêt à piloter ton <em>direct ?</em></h2>
        <div className="mt-9 flex justify-center">
          <ButtonLink href="/acces">Demander l&apos;accès</ButtonLink>
        </div>
        <div className="mt-12"><PlatformStrip /></div>
      </Container>
    </section>
  );
}
