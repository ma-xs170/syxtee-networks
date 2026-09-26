const chain = [
  { label: "Ton téléphone", sub: "Moblin · IRL Pro" },
  { label: "Relais SYXTEE", sub: "SRTLA → SRT" },
  { label: "Ton OBS", sub: "Scènes & overlays" },
  { label: "Plateformes", sub: "Twitch · Kick · YouTube" },
];

// Schéma Téléphone → Relais → OBS → Plateformes. `large` pour la page Fonctionnement.
export default function FlowDiagram({ large = false }: { large?: boolean }) {
  return (
    <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
      {chain.map((c, i) => (
        <div key={c.label} className="flex flex-1 flex-col items-stretch gap-3 lg:flex-row lg:items-center">
          <div
            className={`flex-1 rounded-xl border text-center ${large ? "flex flex-col justify-center p-6 sm:p-8 lg:min-h-44 lg:px-4" : "p-5"} ${
              i === 1 ? "border-white/40 bg-white text-black" : "border-line bg-white/[0.02]"
            }`}
          >
            {large && <p className={`font-mono text-xs ${i === 1 ? "text-neutral-600" : "text-muted"}`}>0{i + 1}</p>}
            <p className={`font-semibold ${large ? "mt-2 text-base sm:text-lg" : "text-sm"}`}>{c.label}</p>
            <p className={`mt-1 font-mono text-xs ${i === 1 ? "text-neutral-600" : "text-muted"}`}>{c.sub}</p>
          </div>
          {i < chain.length - 1 && (
            <div className={`mx-auto w-px bg-line lg:h-px lg:flex-none ${large ? "h-8 lg:w-12" : "h-6 lg:w-10"}`}>
              <div className="flow-line h-full w-full" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
