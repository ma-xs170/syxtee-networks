import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import CreditsTable from "@/components/credits/CreditsTable";
import { Container } from "@/components/ui";
import { credits } from "@/lib/credits";

export const metadata: Metadata = {
  title: "Crédits",
  description: "Crédits et licences des visuels tiers utilisés sur le site SYXTEE NETWORKS.",
  alternates: { canonical: "/credits" },
};

const pages = [{ href: "/moblin", label: "Moblin" }];

export default function CreditsPage() {
  return (
    <>
      <PageHero kicker="Crédits" title={<>Crédits et <em>licences.</em></>} crumb="Crédits">
        Les visuels tiers utilisés sur le site, leurs auteurs, leurs licences et les modifications apportées.
      </PageHero>

      {pages.map((p) => {
        const items = credits.filter((c) => c.page === p.href);
        if (items.length === 0) return null;
        return (
          <section key={p.href} className="border-b border-line py-16">
            <Container>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Page <Link href={p.href} className="text-foreground underline underline-offset-4">{p.label}</Link>
              </p>
              <div className="mt-6">
                <CreditsTable items={items} />
              </div>
            </Container>
          </section>
        );
      })}

      <section className="py-16">
        <Container>
          <p className="max-w-3xl text-xs leading-relaxed text-muted">
            Starlink et Starlink Mini sont des marques de SpaceX. Moblin est une app indépendante. SYXTEE NETWORKS n&apos;est
            affilié ni à SpaceX, ni au développeur de Moblin. Toutes les autres illustrations du site sont créées par
            SYXTEE NETWORKS.
          </p>
          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-muted">
            Saily est une marque de Nord Security ; son logo provient du kit officiel fourni aux partenaires. Moblin et
            Moblink sont des apps indépendantes d&apos;eerimoq. Les liens Saily sont des liens partenaires : SYXTEE NETWORKS
            peut percevoir une commission, sans surcoût pour toi.
          </p>
        </Container>
      </section>
    </>
  );
}
