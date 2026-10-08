import MacAndPc from "@/components/landing/MacAndPc";
import Link from "next/link";
import { Container } from "../ui";
import { ButtonLink } from "../ui/Button";
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
        <h1 className="rise h-serif mx-auto max-w-[18ch] text-[clamp(2.75rem,6.5vw,5rem)]" style={rise(0)}>
          Pilote ton OBS à distance, <em>depuis n&apos;importe où.</em>
        </h1>
        <p className="rise mx-auto mt-5 max-w-[56ch] text-lg leading-relaxed text-muted" style={rise(1)}>
          Scènes, audio, démarrage du live : depuis ton navigateur ou ton téléphone, sur ton propre PC ou Mac. Aucun serveur en plus.
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
    <section id="comment" className="scroll-mt-20 border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>{product.remoteName}, ton OBS <em>dans la poche.</em></h2>
        <p className={lead}>Chaque bouton agit sur ton vrai OBS, en direct.</p>
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          <Cell className="md:col-span-2" title="Change de scène en un tap" text="Début, direct, connexion perdue, fin : la scène change sur ton OBS, sans attendre.">
            <div className="grid grid-cols-2 gap-2 pt-1">
              {["Début du stream", "En direct", "Connexion perdue", "Fin du stream"].map((s, i) => (
                <span key={s} className={`rounded-xl border px-4 py-3 text-sm ${i === 1 ? "border-foreground/40 bg-surface-2" : "border-line text-muted"}`}>{s}</span>
              ))}
            </div>
          </Cell>
          <Cell className="md:col-span-2" title="Mixer audio à distance" text="Coupe un micro ou règle un niveau pendant que tu es sur le terrain.">
            <div className="flex h-24 items-end gap-1.5 pt-1" aria-hidden="true">
              {[40, 62, 50, 78, 66, 88, 58, 72, 46, 64].map((h, i) => (
                <span key={i} className={`level-bar h-full flex-1 origin-bottom rounded-t-md ${i > 7 ? "bg-warn" : "bg-ok"}`} style={{ "--p": h / 100, transform: `scaleY(${h / 100})`, opacity: 0.8, animationDuration: `${650 + ((i * 137) % 500)}ms`, animationDelay: `${-((i * 211) % 700)}ms` } as React.CSSProperties} />
              ))}
            </div>
          </Cell>
          <Cell className="md:col-span-2" title="Espaces partagés" text="Invite un modérateur ou un monteur à piloter avec toi, chacun avec son compte et son rôle.">
            <div className="flex -space-x-2 pt-2" aria-hidden="true">
              {[["M", "from-violet-500 to-pink-500"], ["L", "from-sky-500 to-blue-600"], ["S", "from-emerald-500 to-teal-600"], ["+", "from-amber-400 to-orange-500"]].map(([l, c]) => (
                <span key={l} className={`grid h-11 w-11 place-items-center rounded-xl border border-background bg-gradient-to-br ${c} text-sm font-semibold text-white`}>{l}</span>
              ))}
            </div>
          </Cell>
          <Cell className="md:col-span-2" title="Tourne sur ton propre PC ou Mac" text="Zéro serveur à louer. Tu relies ton ordinateur avec un code.">
            <MacAndPc className="max-w-[420px]" />
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
    <section id="encodeur" className="scroll-mt-20 border-b border-line py-20 lg:py-28">
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

export function PricingSection() {
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>Choisis ta <em>formule.</em></h2>
        <p className={lead}>{product.remoteName} et l&apos;interface de l&apos;Encodeur, trois formules. Les prix seront annoncés bientôt. L&apos;accès se fait sur invitation.</p>
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
    { q: "Quelles connexions utilise l'Encodeur ?", a: "Jusqu'à trois connexions en même temps : Wi-Fi, Ethernet et 4G ou 5G. Une clé 4G USB ajoute une connexion de plus." },
    { q: "Dois-je louer un serveur pour OBS CLOUD ?", a: "Non. Le plugin tourne sur ton propre PC ou Mac et se relie à ton compte avec un code." },
    { q: "Quand est-ce disponible ?", a: "OBS CLOUD est disponible pour les comptes invités. Demande ton accès. L'Encodeur est en développement." },
    { q: "Comment obtenir de l'aide ?", a: "Le support se fait sur Discord. Donne ton ID de support dans ton ticket, on retrouve ton compte sans ton e-mail." },
  ];
  return (
    <section className="border-b border-line py-20 lg:py-28">
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
