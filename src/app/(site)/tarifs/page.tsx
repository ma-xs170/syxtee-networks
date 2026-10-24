import type { Metadata } from "next";
import Link from "next/link";
import Glow from "@/components/landing/Glow";
import { Check, X } from "@/components/icons";
import { Container } from "@/components/ui";
import CloudBackdrop from "@/components/home/CloudBackdrop";
import JsonLd from "@/components/seo/JsonLd";
import { CATALOG, PROD_TIERS, PRODUCTION, TIERS } from "@/lib/billing";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "Trois formules dès 5 € par mois : connexions SRTLA, contrôle à distance d'OBS dès Signature, multistream, équipes et régies. Sans engagement.",
  alternates: { canonical: "/tarifs" },
};

// Le bouton de chaque formule mène au choix de formule du compte (connexion demandée au besoin), où se fait le paiement Stripe.
// Les trois tableaux ci-dessous donnent une valeur par formule, dans l'ordre : Essentiel, Signature, Prestige.
type Three<T> = [T, T, T];

const tiers = [
  { id: "essentiel", name: "Essentiel", price: "5", pitch: "Le point de départ d'un direct maîtrisé, de n'importe où.", highlight: false },
  { id: "signature", name: "Signature", price: "10", pitch: "Pour les créateurs qui diffusent régulièrement et veulent tout.", highlight: true },
  { id: "prestige", name: "Prestige", price: "19,99", pitch: "Pour les régies et les équipes qui exigent le meilleur.", highlight: false },
];

// Chiffres clés : « 0 » s'affiche ✕.
const limits: { label: string; v: Three<string> }[] = [
  { label: "Connexions SRTLA", v: ["1", "10", "∞"] },
  { label: "Directs en même temps", v: ["1", "3", "10"] },
  { label: "Espaces partagés", v: ["0", "1", "5"] },
  { label: "Invités au contrôle à distance", v: ["0", "3", "5"] },
];

// Fonctions : ✓ inclus, ✕ non inclus. Le serveur inclut le secours automatique, la garde audio et la santé du flux.
const features: { label: string; v: Three<boolean> }[] = [
  { label: "Contrôle à distance (+ multistream)", v: [false, true, true] },
  { label: "Régie automatique (drone, prises)", v: [false, true, true] },
  { label: "Statistiques (+ historique des directs)", v: [false, true, true] },
  { label: "Accès anticipé aux nouveautés", v: [false, false, true] },
];

/** Barre de séparation fine façon calligraphie : trait effilé aux deux bouts, légèrement incurvé. */
const Slash = () => (
  <svg aria-hidden="true" viewBox="0 0 8 18" width="8" height="18" className="shrink-0 text-muted" fill="currentColor">
    <path d="M6.9 0.4C6.3 5.2 3.6 12 0.9 17.6C3.9 12.4 6.2 6.2 6.9 0.4Z" />
  </svg>
);

export default function TarifsPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: site.name,
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Web, iOS, Android",
          url: `${site.url}/tarifs`,
          offers: TIERS.map((t) => ({ "@type": "Offer", name: CATALOG[t].name, description: CATALOG[t].pitch, price: (CATALOG[t].prices.month.cents / 100).toFixed(2), priceCurrency: "EUR", url: `${site.url}/tarifs` })),
        }}
      />
      <Glow />
      <section data-theme="dark" className="relative bg-background text-foreground -mt-[4.0625rem] overflow-hidden border-b border-line pb-16 pt-[9rem] text-center sm:pb-24 sm:pt-[10.5rem]">
        <CloudBackdrop />
        <Container className="relative">
          <h1 className="h-serif mx-auto max-w-3xl text-[clamp(2.75rem,7vw,4.75rem)]">Des tarifs <em>simples.</em></h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Trois formules, à partir de <strong>5 € par mois</strong>. Sans engagement : tu changes ou tu arrêtes quand tu veux.
          </p>
          <p className="mx-auto mt-2 text-sm text-muted">TVA non applicable, article 293 B du CGI.</p>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {tiers.map((t, k) => (
              <article key={t.id} className={`flex flex-col rounded-2xl border p-7 ${t.highlight ? "border-foreground/40 bg-surface" : "border-line"}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{t.name}</h2>
                  {t.highlight && <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs text-muted">Le plus choisi</span>}
                </div>
                <p className="mt-3 min-h-[3rem] text-sm leading-relaxed text-muted">{t.pitch}</p>
                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="whitespace-nowrap text-4xl font-semibold tracking-tight">{t.price} €</span>
                  <span className="text-sm text-muted">/ mois</span>
                </p>
                <Link href="/dashboard/compte?onglet=formule" className={`btn mt-6 w-full ${t.highlight ? "btn-primary" : "btn-secondary"}`}>
                  Choisir {t.name}
                </Link>

                <ul className="mt-8 space-y-3.5 text-sm">
                  {limits.map((l) => {
                    const v = l.v[k];
                    const none = v === "0";
                    return (
                      <li key={l.label} className={`flex items-center gap-2.5 ${none ? "text-muted" : ""}`}>
                        <span className="flex min-w-7 justify-end font-mono text-base font-semibold leading-none">
                          {none ? <X size={15} weight="bold" aria-label="Aucun" /> : v}
                        </span>
                        <Slash />
                        {l.label}
                      </li>
                    );
                  })}
                </ul>
                <ul className="mt-6 space-y-3.5 border-t border-foreground/10 pt-6 text-sm">
                  {features.map((f) => {
                    const on = f.v[k];
                    return (
                      <li key={f.label} className={`flex items-center gap-2.5 ${on ? "" : "text-muted"}`}>
                        <span className="flex min-w-7 justify-end">
                          {on ? <Check size={17} weight="bold" className="text-ok" aria-label="Inclus" /> : <X size={15} weight="bold" aria-label="Non inclus" />}
                        </span>
                        <Slash />
                        {f.label}
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-line py-16 sm:py-20" aria-labelledby="production">
        <Container>
          <h2 id="production" className="h-section text-center">Une <em>production</em> ? Un espace pour toute l&apos;équipe.</h2>
          <p className="mx-auto mt-3 max-w-[56ch] text-center text-sm leading-relaxed text-muted">Streamers, vidéastes et planning réunis dans un espace partagé. Chaque streamer a son relais, chaque direct a son responsable.</p>
          <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {PROD_TIERS.map((t) => {
              const c = PRODUCTION[t];
              return (
                <article key={t} className={`flex flex-col rounded-2xl border p-7 ${c.featured ? "border-foreground/40 bg-surface" : "border-line"}`}>
                  <h3 className="text-lg font-semibold">{c.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{c.pitch}</p>
                  <p className="mt-6 flex items-baseline gap-1.5">
                    <span className="whitespace-nowrap text-4xl font-semibold tracking-tight">{c.prices.month.amount}</span>
                    <span className="text-sm text-muted">/ mois</span>
                  </p>
                  <Link href="/dashboard/compte?onglet=formule" className={`btn mt-6 w-full ${c.featured ? "btn-primary" : "btn-secondary"}`}>Choisir {c.name}</Link>
                  <ul className="mt-8 space-y-3 text-sm">
                    {c.points.map((x) => (
                      <li key={x} className="flex items-start gap-2.5"><Check size={17} weight="bold" className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />{x}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
