import { DiscordButton } from "@/components/ui";
import { ProDrawing } from "./ProExploded";

// SYXTEE PRO en pause (FEATURE_PRO=false) : page « À venir » sobre sur /pro. Le reste du code produit reste en place.

export default function ProSoon() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col items-center justify-center gap-8 px-4 py-16 text-center sm:px-6">
        <svg viewBox="150 70 300 390" className="h-56 w-auto text-foreground sm:h-72" fill="none" role="img" aria-label="Le sac encodeur SYXTEE PRO, dessin filaire">
          <ProDrawing closed />
        </svg>
        <div className="flex flex-col items-center">
          <p className="rounded-full border border-line px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">À venir</p>
          <h1 className="mt-5 text-5xl font-semibold leading-none tracking-tight sm:text-7xl">SYXTEE PRO</h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">Notre sac encodeur IRL est en préparation.</p>
          <div className="mt-8">
            <DiscordButton>Être prévenu sur Discord</DiscordButton>
          </div>
        </div>
      </div>
    </section>
  );
}
