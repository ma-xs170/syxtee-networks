import type { ComponentType } from "react";
import ObsScreen from "../illustrations/ObsScreen";
import RelayServer from "../illustrations/RelayServer";
import Streamer from "../illustrations/Streamer";

const chain: { label: string; sub: string; Art: ComponentType<{ className?: string }> }[] = [
  { label: "Toi, en IRL", sub: "Moblin · IRL Pro · SRTLA", Art: Streamer },
  { label: "Relais SYXTEE", sub: "SRTLA → SRT", Art: RelayServer },
  { label: "Ton OBS", sub: "→ Twitch · Kick · YouTube", Art: ObsScreen },
];

// Schéma illustré Streamer → Relais → OBS, reliés par des .flow-line. `large` pour la page Fonctionnement.
export default function FlowDiagram({ large = false }: { large?: boolean }) {
  return (
    <figure className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
      {chain.map(({ label, sub, Art }, i) => (
        <div key={label} className="flex flex-1 flex-col items-stretch gap-3 lg:flex-row lg:items-center">
          <div
            className={`flex-1 rounded-2xl border bg-gradient-to-b from-white/[0.06] to-transparent text-center ${
              i === 1 ? "border-white/40" : "border-line"
            } ${large ? "p-6 sm:p-8" : "p-5"}`}
          >
            <div className={`mx-auto ${large ? "h-44 sm:h-52" : "h-36"}`}>
              <Art className="h-full w-full" />
            </div>
            <p className={`mt-4 font-semibold ${large ? "text-base sm:text-lg" : "text-sm"}`}>{label}</p>
            <p className="mt-1 font-mono text-xs text-muted">{sub}</p>
          </div>
          {i < chain.length - 1 && (
            <div className={`mx-auto w-px bg-line lg:h-px lg:flex-none ${large ? "h-10 lg:w-14" : "h-8 lg:w-10"}`} aria-hidden="true">
              <div className="flow-line h-full w-full" />
            </div>
          )}
        </div>
      ))}
      <figcaption className="sr-only">
        Ton téléphone envoie la vidéo en SRTLA au relais SYXTEE, qui la transmet en SRT à ton OBS, qui diffuse sur Twitch,
        Kick ou YouTube.
      </figcaption>
    </figure>
  );
}
