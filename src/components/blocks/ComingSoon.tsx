import type { ReactNode } from "react";
import { DiscordButton } from "../ui";

const features = ["Relais SRTLA, SRT, RTMP et RIST", "Enregistrement des directs jusqu'à 10 Go", "SYXTEE COMMUTATEUR en direct", "Compatible Moblin, IRL Pro, BELABOX", "Support Discord"];

// Bloc « Accès sur invitation » (accueil et /offres) : pas d'abonnement, pas de prix. Nom de fichier conservé pour ses imports.
export default function ComingSoon({ children }: { children?: ReactNode }) {
  return (
    <div className="panel-lg relative overflow-hidden px-6 py-16 text-center sm:px-16">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Accès</p>
        <h2 className="mt-4 h-section">Ouverture bientôt.</h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted">
          <strong>On arrive bientôt.</strong> Les premières formules ouvrent très prochainement, à TVA non applicable (article 293 B du CGI). En attendant, l&apos;accès aux relais et au Commutateur en direct est réservé aux <strong>partenaires</strong> : demande le tien sur le Discord.
        </p>

        <ul className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-2">
          {features.map((f) => (
            <li key={f} className="rounded-full border border-line bg-background px-4 py-2 text-sm text-muted">{f}</li>
          ))}
        </ul>

        <div className="mt-10">
          <DiscordButton>Demander une invitation</DiscordButton>
        </div>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </div>
  );
}
