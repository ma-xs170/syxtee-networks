import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Link from "next/link";
import { ArrowRight, DiscordLogo, GithubLogo, Heart } from "@phosphor-icons/react/dist/ssr";
import ServerRack from "@/components/illustrations/ServerRack";
import { site } from "@/lib/site";
import { Container } from "@/components/ui";
import Highlight from "@/components/ui/Highlight";
import { monthly, support, totalMonthly } from "@/config/support";

export const metadata: Metadata = {
  title: "Soutenir",
  description: "Les coûts réels de SYXTEE NETWORKS (serveur, domaine) et comment aider à garder le palier gratuit ouvert.",
  alternates: { canonical: "/soutenir" },
};

const pill = "inline-flex h-12 w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-medium transition-[background-color,border-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const ghost = "border border-line-strong bg-surface-2 text-foreground hover:border-foreground/30";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export default function SoutenirPage() {
  return (
    <>
      <PageHero kicker="Soutenir" title={<>Garder le palier gratuit <Highlight>ouvert.</Highlight></>} crumb="Soutenir">
        Chaque compte gratuit a 1 relais et 1 flux. Les serveurs ont un coût réel : voici exactement ce que le service coûte, et comment aider.
      </PageHero>

      <section className="border-b border-line py-16">
        <Container className="max-w-3xl">
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

      <section className="py-16 sm:py-24">
        <Container>
          <div className="mt-5 overflow-hidden rounded-3xl border border-line bg-surface">
            <div className="grid gap-10 p-7 sm:p-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
              <div className="max-w-xl">
                <h2 className="h-serif text-3xl sm:text-4xl">
                  Vous aimez SYXTEE&nbsp;? Aidez à garder le palier gratuit <Highlight>ouvert.</Highlight>
                </h2>
                <p className="mt-5 leading-relaxed text-muted">
                  Un don finance les serveurs, rien d&apos;autre. Les formules payantes couvrent le service&nbsp;; les dons gardent le palier gratuit ouvert et financent les parties ouvertes du projet. Aucun don n&apos;est obligatoire, et aucune fonction n&apos;est réservée aux donateurs.
                </p>
                <ul className="mt-8 flex flex-wrap gap-2.5" aria-label="Ce que finance un don">
                  {[`${eur.format(totalMonthly())} / mois de serveur et de domaine`, "1 relais gratuit par compte", "50 Go gratuits par mois"].map((t) => (
                    <li key={t} className="rounded-full border border-line-strong bg-surface-2 px-4 py-2 font-mono text-xs text-muted">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative z-10 flex flex-col gap-3">
                {support.sponsors ? (
                  <a href={support.sponsors} target="_blank" rel="noopener noreferrer" className={`${pill} btn-tonal`}>
                    <Heart size={20} weight="fill" aria-hidden="true" />
                    Soutenir sur GitHub Sponsors
                  </a>
                ) : (
                  <span aria-disabled="true" className={`${pill} cursor-not-allowed border border-line-strong bg-surface-2 text-muted`}>
                    <GithubLogo size={20} aria-hidden="true" />
                    GitHub Sponsors
                    <span className="rounded-full border border-line-strong px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em]">bientôt</span>
                  </span>
                )}
                <a href={site.discord} target="_blank" rel="noopener noreferrer" className={`${pill} ${ghost}`}>
                  <DiscordLogo size={20} aria-hidden="true" />
                  Passer sur la communauté
                </a>
                <Link href="/tarifs" className={`${pill} ${ghost}`}>
                  <ArrowRight size={20} aria-hidden="true" />
                  Voir les formules
                </Link>
                <div aria-hidden="true" className="pointer-events-none mx-auto mt-3 hidden h-36 w-56 overflow-hidden opacity-60 [mask-image:linear-gradient(to_bottom,black_40%,transparent)] lg:block">
                  <ServerRack animated={false} className="w-full" />
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
