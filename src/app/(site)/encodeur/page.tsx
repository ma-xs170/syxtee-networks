import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Encodeur",
  description: "Un encodeur portable pour diffuser en mobilité, qui se glisse dans un sac. En développement.",
  alternates: { canonical: "/encodeur" },
};

export default function EncodeurPage() {
  return (
    <section className="py-24 sm:py-32">
      <Container className="max-w-3xl text-center">
        <p className="mx-auto inline-flex rounded-full border border-line-strong px-3 py-1 text-xs uppercase tracking-[0.12em] text-muted">En développement</p>
        <h1 className="h-hero mt-6">L&apos;encodeur SYXTEE.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Nous développons un encodeur pour caméra portable, assez compact pour se glisser dans un sac. Il regroupe plusieurs connexions
          mobiles et envoie ton direct de façon stable, où que tu sois. <strong>Une petite révolution, à un prix accessible.</strong>
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Pas de matériel à plusieurs milliers d&apos;euros : le même niveau de fiabilité, pensé pour les créateurs qui bougent.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/acces" className="btn btn-primary">Être prévenu à la sortie</Link>
          <Link href="/relais" className="btn btn-secondary">Découvrir les flux</Link>
        </div>
      </Container>
    </section>
  );
}
