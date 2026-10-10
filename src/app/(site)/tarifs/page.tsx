import type { Metadata } from "next";
import Link from "next/link";
import Glow from "@/components/landing/Glow";
import { Container } from "@/components/ui";
import GridBackground from "@/components/ui/GridBackground";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "Trois formules, à partir de 4,99 € par mois : serveurs SRTLA et RTMP, contrôle à distance d'OBS, multistream, équipes et régies. Sans engagement.",
  alternates: { canonical: "/tarifs" },
};

// Les limites reprennent plans.ts : ne rien annoncer ici qui ne soit pas appliqué par le serveur.
// Pas de paiement sur le site pour l'instant : le bouton de chaque formule est « Demander l'accès ».
type Tier = { id: string; name: string; price: string; pitch: string; highlight?: boolean; includes?: string; items: string[] };
const tiers: Tier[] = [
  {
    id: "essentiel",
    name: "Essentiel",
    price: "4,99",
    pitch: "Le point de départ d'un direct maîtrisé, de n'importe où.",
    items: ["1 serveur dédié, en SRTLA ou RTMP", "1 direct à la fois", "Contrôle à distance d'OBS", "Santé du flux en temps réel", "Écran de secours automatique", "Garde audio du micro", "Clés de diffusion privées"],
  },
  {
    id: "signature",
    name: "Signature",
    price: "9,99",
    pitch: "Pour les créateurs qui diffusent régulièrement et veulent tout.",
    highlight: true,
    includes: "Tout Essentiel, plus :",
    items: ["10 serveurs, 5 par protocole", "3 directs en même temps", "3 invités pour piloter ton OBS", "1 espace partagé pour ton équipe", "Statistiques détaillées et historique des directs", "Sauvegardes de scènes et Multichat", "Autogérance du drone et des prises", "Régie IA jusqu'à 3 caméras"],
  },
  {
    id: "prestige",
    name: "Prestige",
    price: "19,99",
    pitch: "Pour les régies et les équipes qui exigent le meilleur.",
    includes: "Tout Signature, plus :",
    items: ["Serveurs illimités", "10 directs en même temps", "5 espaces partagés pour tes régies", "5 invités pour piloter ton OBS", "Régie IA jusqu'à 6 caméras", "Accès anticipé aux nouveautés"],
  },
];

export default function TarifsPage() {
  return (
    <>
      <Glow />
      <section className="relative -mt-[4.0625rem] overflow-hidden border-b border-line pb-16 pt-[9rem] text-center sm:pb-24 sm:pt-[10.5rem]">
        <GridBackground />
        <Container className="relative">
          <h1 className="h-serif mx-auto max-w-3xl text-[clamp(2.75rem,7vw,4.75rem)]">Des tarifs <em>simples.</em></h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Trois formules, à partir de <strong>4,99 € par mois</strong>. Sans engagement : tu changes ou tu arrêtes quand tu veux.
          </p>
          <p className="mx-auto mt-2 text-sm text-muted">TVA non applicable, article 293 B du CGI.</p>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {tiers.map((t) => (
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
                <Link href="/acces" className={`btn mt-6 w-full ${t.highlight ? "btn-primary" : "btn-secondary"}`}>
                  Demander l&apos;accès
                </Link>
                <div className="mt-7 border-t border-line pt-6">
                  {t.includes && <p className="mb-4 text-sm font-medium">{t.includes}</p>}
                  <ul className="space-y-3">
                    {t.items.map((i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-foreground" aria-hidden="true" />
                        {i}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-line py-16 sm:py-20">
        <Container className="max-w-4xl">
          <div className="bento-cell flex flex-col items-start justify-between gap-6 p-7 sm:flex-row sm:items-center sm:p-9">
            <div>
              <h2 className="h-section">Une régie, une <em>équipe ?</em></h2>
              <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted">Les espaces partagés réunissent plusieurs OBS et plusieurs personnes, chacune avec son compte et son rôle.</p>
            </div>
            <Link href="/espaces-partages" className="btn btn-primary shrink-0">Découvrir les espaces partagés</Link>
          </div>
        </Container>
      </section>
    </>
  );
}
