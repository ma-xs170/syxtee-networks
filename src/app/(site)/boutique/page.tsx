import type { Metadata } from "next";
import Link from "next/link";
import BuyButton from "@/components/BuyButton";
import Glow from "@/components/landing/Glow";
import RelayBox from "@/components/landing/RelayBox";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import GridBackground from "@/components/ui/GridBackground";
import SectionHeader from "@/components/ui/SectionHeader";
import StatusPill from "@/components/ui/StatusPill";
import WordsReveal from "@/components/ui/WordsReveal";
import { product } from "@/config/product";
import { CATALOG, TIERS } from "@/lib/billing";

export const metadata: Metadata = {
  title: "Boutique",
  description: "Achète le SYXTEE Encodeur, ou prends un abonnement. Avec l'Encodeur, 4 mois de l'abonnement le plus élevé sont offerts.",
  alternates: { canonical: "/boutique" },
};

export default async function BoutiquePage({ searchParams }: { searchParams: Promise<{ commande?: string }> }) {
  const { commande } = await searchParams;
  // Sans prix Stripe configuré, pas de paiement : on propose d'être prévenu à la place.
  const canBuyEncoder = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_ENCODER;
  return (
    <>
      <Glow />
      <section className="relative -mt-[4.0625rem] overflow-hidden border-b border-line pb-16 pt-[9rem] text-center sm:pb-24 sm:pt-[10.5rem]">
        <GridBackground />
        <Container className="relative">
          <StatusPill variant="dev" label="BOUTIQUE" />
          <h1 className="h-serif mx-auto mt-8 max-w-[14ch] text-[clamp(3rem,8vw,5.5rem)]">
            <WordsReveal text="Achète ou abonne-toi." em={["abonne-toi."]} />
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] text-base leading-relaxed text-muted sm:text-lg">Le boîtier en paiement unique, ou un abonnement pour l&apos;interface et le contrôle à distance.</p>
          {commande === "ok" && <p role="status" className="mx-auto mt-6 max-w-md rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">Merci pour ta commande. Ton code d&apos;activation apparaît dans Appareils dès que le paiement est confirmé.</p>}
        </Container>
      </section>

      <section id="encodeur" className="scroll-mt-20 border-b border-line py-20 sm:py-28">
        <Container className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bento-cell p-6 sm:p-10"><RelayBox /></div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Article</p>
            <h2 className="h-serif mt-3 text-[clamp(2.25rem,4.5vw,3.5rem)]">SYXTEE <em>Encodeur.</em></h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">{product.pitch}</p>
            <ul className="mt-5 space-y-2 text-sm text-muted">
              {["Trois connexions en même temps : Wi-Fi, Ethernet, 4G ou 5G", "Une clé 4G USB ajoute une connexion de plus", "Câble USB-C de 2 m : ta caméra de poche en 1080p60", "SYXTEE NETWORKS gravé sur le boîtier"].map((x) => (
                <li key={x} className="flex gap-2.5"><span aria-hidden="true" className="text-foreground">+</span>{x}</li>
              ))}
            </ul>
            <p className="mt-6 font-mono text-4xl tabular-nums">{product.priceLabel(product.price)}</p>
            <p className="mt-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm leading-relaxed"><span className="font-medium">{product.bonusMonths} mois de l&apos;abonnement le plus élevé offerts</span> à l&apos;activation, avec un code lié à ton compte (utilisable une seule fois).</p>
            <div className="mt-6 grid gap-2 sm:max-w-sm">
              {canBuyEncoder ? <BuyButton productId="encoder">Précommander</BuyButton> : <ButtonLink href="/acces" className="w-full">Être prévenu de l&apos;ouverture</ButtonLink>}
              <ButtonLink href="/encodeur#interface" variant="secondary" className="w-full">Voir l&apos;interface</ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <section id="abonnements" className="scroll-mt-20 py-20 sm:py-28">
        <Container>
          <SectionHeader icon="obs-cloud" title={<>Ou prends un <em>abonnement.</em></>} subtitle="L'interface de l'Encodeur et le contrôle à distance d'OBS. Sans engagement : tu changes ou tu arrêtes quand tu veux." />
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {TIERS.map((t) => {
              const c = CATALOG[t];
              return (
                <article key={t} className={`bento-cell flex flex-col p-6 ${c.featured ? "!border-line-strong bg-surface-2" : ""}`}>
                  <h3 className="text-xl font-semibold tracking-tight">{c.name}</h3>
                  <p className="mt-1 text-sm text-muted">{c.pitch}</p>
                  <p className="mt-5 font-mono text-3xl tabular-nums">{c.prices.month.amount}<span className="ml-1 text-sm text-muted">par mois</span></p>
                  <p className="mt-1 text-xs text-muted">ou {c.prices.year.amount} par an</p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-muted">{c.points.map((x) => <li key={x} className="flex gap-2.5"><span aria-hidden="true" className="text-foreground">+</span>{x}</li>)}</ul>
                  <div className="mt-6"><ButtonLink href="/dashboard/abonnement" variant={c.featured ? "primary" : "secondary"} className="w-full">Choisir {c.name}</ButtonLink></div>
                </article>
              );
            })}
          </div>
          <p className="mt-6 text-center text-sm text-muted">Tous les détails sur la page <Link href="/tarifs" className="text-foreground underline-offset-4 hover:underline">Tarifs</Link>.</p>
        </Container>
      </section>
    </>
  );
}
