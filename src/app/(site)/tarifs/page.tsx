import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "Les tarifs de SYXTEE arrivent bientôt : trois formules, sans engagement. En attendant, l'accès se fait sur demande.",
  alternates: { canonical: "/tarifs" },
};

// Les tarifs ne sont pas encore ouverts : ni prix ni contenu des formules dans la page (rien de lisible, pas même dans le code).
// Les vraies limites sont dans plans.ts et seront affichées ici à l'ouverture au public.
const tiers = [
  { id: "basique", name: "Basique", lines: [72, 88, 64, 80, 58, 70] },
  { id: "premium", name: "Premium", lines: [66, 84, 76, 60, 90, 68], highlight: true },
  { id: "extra", name: "Extra", lines: [80, 62, 86, 70, 56, 74] },
];

/** Lignes grises à la place du texte : la forme d'une formule, sans rien de lisible. */
function Skeleton({ widths, gap = "space-y-3" }: { widths: number[]; gap?: string }) {
  return (
    <div className={gap} aria-hidden="true">
      {widths.map((w, i) => (
        <div key={i} className="h-3 rounded-full bg-foreground/15" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

export default function TarifsPage() {
  return (
    <>
      <section className="border-b border-line py-20 text-center sm:py-24">
        <Container>
          <h1 className="h-hero mx-auto max-w-3xl">Des tarifs simples.</h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Les formules et leurs prix arrivent bientôt.
          </p>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {tiers.map((t) => (
              <article key={t.id} className={`flex flex-col rounded-2xl border p-7 ${t.highlight ? "border-foreground/40 bg-surface" : "border-line"}`}>
                <h2 className="text-lg font-semibold">{t.name}</h2>
                <div className="mt-6"><Skeleton widths={[85, 55]} /></div>
                <p className="mt-6 text-5xl font-semibold tracking-tight">À venir</p>
                <span aria-disabled="true" className="btn btn-secondary mt-6 w-full cursor-default opacity-50">À venir</span>
                <div className="mt-7 border-t border-line pt-6">
                  <Skeleton widths={t.lines} gap="space-y-4" />
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-line py-16 sm:py-20">
        <Container className="max-w-4xl">
          <h2 className="h-section">Comparer les formules</h2>
          <div className="mt-10">
            <div className="relative rounded-2xl border border-line">
              <p role="status" className="absolute left-1/2 top-1/2 z-10 inline-flex h-9 -translate-x-1/2 -translate-y-1/2 items-center rounded-full border border-line-strong bg-background px-5 font-mono text-xs uppercase tracking-[0.14em] text-muted">
                À venir
              </p>
              <div className="grid gap-6 p-6" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5].map((r) => (
                  <div key={r} className="grid grid-cols-[1fr_5rem_5rem_5rem] items-center gap-4 border-b border-line pb-5">
                    <div className="h-3 rounded-full bg-foreground/15" style={{ width: `${48 + ((r * 13) % 40)}%` }} />
                    {[0, 1, 2].map((c) => (
                      <div key={c} className="mx-auto h-3 w-8 rounded-full bg-foreground/15" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-8 text-sm text-muted">
            L&apos;ouverture au public arrive bientôt : en attendant, l&apos;accès se fait sur demande. <Link href="/acces" className="text-foreground underline underline-offset-4">Demander l&apos;accès</Link>.
          </p>
        </Container>
      </section>
    </>
  );
}
