import type { ReactNode } from "react";
import { DiscordButton } from "../ui";

const features = ["Relais SRTLA / SRT", "Compatible Moblin, IRL Pro, BELABOX", "Sans engagement", "Support Discord"];

// Bloc « Bientôt disponible » des offres, partagé entre l'accueil et /offres.
export default function ComingSoon({ children }: { children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-line px-6 py-16 text-center sm:px-16">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Offres</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Bientôt disponible.</h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted">
          Les tarifs seront dévoilés à l&apos;ouverture. Objectif : le relais IRL le plus accessible du marché.
          Rejoins le Discord pour être prévenu en premier.
        </p>

        <ul className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-2">
          {features.map((f) => (
            <li key={f} className="rounded-full border border-line bg-black px-4 py-2 text-sm text-muted">{f}</li>
          ))}
        </ul>

        <div className="mt-10">
          <DiscordButton>Être prévenu sur Discord</DiscordButton>
        </div>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </div>
  );
}
