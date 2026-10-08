import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import EncoderDashboardDemo from "@/components/encoder/EncoderDashboardDemo";
import Glow from "@/components/landing/Glow";
import { ButtonLink } from "@/components/ui/Button";
import GridBackground from "@/components/ui/GridBackground";
import StatusPill from "@/components/ui/StatusPill";
import WordsReveal from "@/components/ui/WordsReveal";
import { ctaLabel, product } from "@/config/product";
import { deviceImage } from "@/lib/device-images";

// Espace démo de l'Encodeur : page à part (sous-domaine encodeur.<domaine> ou /demo-encodeur), ouverte à tous les comptes et sans compte.
export const metadata: Metadata = {
  title: "Démo de l'Encodeur",
  description: "Essaie le tableau de bord de l'Encodeur : connexions, caméra, audio, température. Tout est simulé.",
  robots: { index: false },
};

const tries = [
  "Coupe une connexion : le débit et la latence réagissent tout de suite.",
  "Passe en 1080p60 et regarde la charge du processeur et de la carte graphique.",
  "Débranche la caméra pour voir l'état « aucun signal ».",
  "Lance une mise à jour et suis la progression.",
];

export default function DemoEncodeurPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <Glow />
      <GridBackground />
      <header className="relative z-10 border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="SYXTEE NETWORKS, accueil">
            <Image src="/logo-400.png" alt="" width={20} height={28} style={{ width: 20, height: "auto" }} className="ink-img" priority />
            <span className="text-[15px] font-semibold tracking-[0.04em]">SYXTEE<span className="font-normal text-muted"> NETWORKS</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <StatusPill variant="dev" label="DÉMO" className="hidden sm:inline-flex" />
            <Link href="/dashboard/appareils" className="inline-flex h-9 items-center rounded-full border border-line-strong bg-surface-2 px-4 text-sm font-medium">Mon espace</Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="h-serif text-[clamp(2.75rem,7vw,5rem)]">
            <WordsReveal text="Le tableau de bord de l'Encodeur." em={["l'Encodeur."]} />
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] text-base leading-relaxed text-muted">Une simulation complète : tout réagit à tes clics, rien n&apos;est installé. {product.tagline}</p>
        </div>
        <div className="mt-14">
          <EncoderDashboardDemo images={{ laptop: deviceImage("laptop"), phone: deviceImage("phone") }} />
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="bento-cell p-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">À essayer</p>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              {tries.map((t) => (
                <li key={t} className="flex gap-3"><span aria-hidden="true" className="text-foreground">+</span>{t}</li>
              ))}
            </ul>
          </div>
          <div className="bento-cell flex flex-col justify-between p-7">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">SYXTEE Encodeur</p>
              <p className="mt-2 font-mono text-3xl tabular-nums">{product.priceLabel(product.price)}</p>
              <p className="mt-2 text-sm text-muted">{product.bonusMonths} mois de l&apos;abonnement le plus élevé offerts à l&apos;activation.</p>
            </div>
            <div className="mt-6 grid gap-2">
              <ButtonLink href="/boutique#encodeur" className="w-full">{ctaLabel(product.availability)}</ButtonLink>
              <ButtonLink href="/encodeur" variant="secondary" className="w-full">En savoir plus</ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
