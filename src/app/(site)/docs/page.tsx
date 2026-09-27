import type { Metadata } from "next";
import Link from "next/link";
import NextStep from "@/components/NextStep";
import PageHero from "@/components/PageHero";
import { ToolArt } from "@/components/NavTools";
import { Container } from "@/components/ui";
import type { ToolIcon } from "@/lib/site";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Les guides SYXTEE NETWORKS pour démarrer en IRL : Moblin, Starlink, eSIM Saily, relais SRTLA, trajet d'un live et FAQ.",
  alternates: { canonical: "/docs" },
};

// Point d'entrée de la documentation : renvoie vers les guides existants.
const guides: { href: string; title: string; text: string; icon: ToolIcon }[] = [
  { href: "/fonctionnement", title: "Fonctionnement", text: "Le trajet d'un live de A à Z, du téléphone à ton OBS.", icon: "route" },
  { href: "/moblin", title: "Moblin", text: "Installer l'app et la brancher sur le relais SYXTEE.", icon: "phone" },
  { href: "/relais", title: "Relais SYXTEE", text: "Choisir ton serveur SRTLA et savoir à quelle latence t'attendre.", icon: "rack" },
  { href: "/starlink", title: "Starlink", text: "Streamer là où la 4G ne passe plus.", icon: "dish" },
  { href: "/saily", title: "Saily", text: "Ajouter une 4G de plus à ton bonding avec une eSIM.", icon: "esim" },
  { href: "/faq", title: "FAQ", text: "Batterie, data, OBS, Android : les réponses aux questions fréquentes.", icon: "faq" },
];

export default function DocsPage() {
  return (
    <>
      <PageHero kicker="Documentation" title="Les guides pour bien démarrer." crumb="Documentation">
        Tout ce qu&apos;il faut pour passer du premier réglage au premier live.
      </PageHero>

      <section className="border-b border-line py-20 sm:py-24">
        <Container>
          <ul className="grid gap-4 md:grid-cols-2">
            {guides.map((g) => (
              <li key={g.href}>
                <Link href={g.href} className="group flex items-center gap-6 rounded-2xl border border-line p-5 transition-colors hover:bg-white/[0.03] sm:p-6">
                  <span className="h-20 w-20 shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.05]">
                    <ToolArt icon={g.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-lg font-medium">
                      {g.title}
                      <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted">{g.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <NextStep label="Retour à l'accueil" href="/" />
    </>
  );
}
