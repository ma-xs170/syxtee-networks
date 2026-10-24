import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui";
import Highlight from "@/components/ui/Highlight";
import { monthly, support, totalMonthly } from "@/config/support";

export const metadata: Metadata = {
  title: "Soutenir",
  description: "Les coûts réels de SYXTEE NETWORKS (serveur, domaine) et comment aider à garder le palier gratuit ouvert.",
  alternates: { canonical: "/soutenir" },
};

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export default function SoutenirPage() {
  return (
    <>
      <PageHero kicker="Soutenir" title={<>Garder le palier gratuit <Highlight>ouvert.</Highlight></>} crumb="Soutenir">
        Chaque compte gratuit a 1 relais et 1 flux. Les serveurs ont un coût réel : voici exactement ce que le service coûte, et comment aider.
      </PageHero>

      <section className="border-b border-line py-16">
        <Container className="max-w-3xl">
          <p className="label-mono">Coûts mensuels</p>
          <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
            {support.costs.map((c) => (
              <li key={c.label} className="flex items-start justify-between gap-6 p-5">
                <div>
                  <p className="font-semibold">{c.label}</p>
                  <p className="mt-1 text-sm text-muted">
                    {c.note}
                    {c.perYear !== undefined && ` · ${eur.format(c.perYear)} par an`}
                  </p>
                </div>
                <p className="whitespace-nowrap font-mono text-sm">{eur.format(monthly(c))} / mois</p>
              </li>
            ))}
            <li className="flex items-center justify-between gap-6 p-5">
              <p className="font-semibold">Total</p>
              <p className="whitespace-nowrap font-mono text-sm font-semibold">{eur.format(totalMonthly())} / mois</p>
            </li>
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Montants TTC. Ils montent avec l&apos;usage : plus de relais actifs, plus de CPU et de bande passante. Le palier gratuit est plafonné à 50 Go de données par mois pour rester tenable.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container className="max-w-3xl">
          <p className="label-mono">Aider</p>
          <h2 className="h-serif mt-3 text-3xl">Un don finance les serveurs, rien d&apos;autre.</h2>
          <p className="mt-4 max-w-[60ch] leading-relaxed text-muted">
            Les formules payantes couvrent le service. Les dons servent à garder le palier gratuit ouvert et à financer les parties ouvertes du projet. Aucun don n&apos;est obligatoire, et aucune fonction n&apos;est réservée aux donateurs.
          </p>
          <div className="mt-8">
            {support.sponsors ? (
              <ButtonLink href={support.sponsors} external>Soutenir sur GitHub Sponsors</ButtonLink>
            ) : (
              <p className="inline-flex rounded-full border border-line px-4 py-2 font-mono text-xs text-muted">GitHub Sponsors : bientôt</p>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
