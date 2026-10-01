import ComingSoon from "../blocks/ComingSoon";
import { Container, MoreLink } from "../ui";
import Highlight from "../ui/Highlight";
import { CATALOG, TIERS } from "@/lib/billing";
import { hasStripe } from "@/lib/stripe";

// Offres de l'accueil, en version courte (le détail et la bascule Mensuel / Annuel sont sur /offres).
// Paiement pas encore ouvert (variables Stripe absentes) : bloc « Bientôt disponible ».

const SUMMARY: Record<string, string> = {
  free: "Scanner, Analyseur et carte de couverture",
  basic: "1 relais, 1 flux en direct",
  paid: "5 relais SRTLA + 5 RTMP, 3 flux",
  extra: "Relais illimités, 10 flux",
};

export default function Offers() {
  if (!hasStripe) {
    return (
      <section id="offres" className="border-b border-line py-24">
        <Container>
          <ComingSoon>
            <MoreLink href="/offres">Ce qui sera inclus</MoreLink>
          </ComingSoon>
        </Container>
      </section>
    );
  }

  const plans = [
    { id: "free", name: "Gratuit", price: "0 €", featured: false },
    ...TIERS.map((t) => ({ id: t, name: CATALOG[t].name, price: CATALOG[t].prices.month.amount, featured: !!CATALOG[t].featured })),
  ];

  return (
    <section id="offres" aria-labelledby="offres-titre" className="border-b border-line py-24">
      <Container>
        <h2 id="offres-titre" className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
          Des offres pour <Highlight>chaque live.</Highlight>
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">Sans engagement. 2 mois offerts si tu paies à l&apos;année.</p>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div key={p.id} className={`flex flex-col p-6 sm:p-8 ${p.featured ? "bg-neutral-950" : "bg-black"}`}>
              <p className="text-sm font-medium">{p.name}</p>
              <p className="mt-5 text-4xl font-semibold tracking-tight tabular-nums">{p.price}</p>
              <p className="text-sm text-muted">{p.id === "free" ? "pour toujours" : "par mois"}</p>
              <p className="mt-6 text-sm leading-relaxed text-muted">{SUMMARY[p.id]}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <MoreLink href="/offres">Voir toutes les offres</MoreLink>
        </div>
      </Container>
    </section>
  );
}
