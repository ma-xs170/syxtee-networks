// Schéma qui explique le service d'un coup d'œil : le téléphone envoie la vidéo par plusieurs connexions à la fois,
// SYXTEE les réunit en un seul flux stable, qui part vers la plateforme. Le texte voisin dit la même chose.

const LINKS = ["4G", "5G", "Wi-Fi", "Starlink"];

export default function BondingDiagram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 340" role="img" aria-label="Ton téléphone envoie la vidéo par plusieurs connexions, SYXTEE les réunit en un seul flux stable vers ta plateforme" className={`h-auto w-full text-foreground ${className}`} fill="none">
      <g strokeLinecap="round" strokeLinejoin="round">
        {/* Téléphone */}
        <rect x="14" y="110" width="92" height="120" rx="16" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05" />
        <rect x="24" y="124" width="72" height="80" rx="6" stroke="currentColor" strokeOpacity="0.5" />
        <circle cx="60" cy="216" r="5" stroke="currentColor" strokeOpacity="0.6" />
        <circle cx="60" cy="150" r="5" fill="var(--live)" />
        <text x="60" y="256" textAnchor="middle" fontSize="13" fill="currentColor" className="font-sans">Ton téléphone</text>

        {/* Connexions */}
        {LINKS.map((l, i) => {
          const y = 62 + i * 72;
          return (
            <g key={l}>
              <path d={`M106 170 C 190 170, 190 ${y}, 262 ${y}`} stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" />
              <path d={`M106 170 C 190 170, 190 ${y}, 262 ${y}`} stroke="currentColor" strokeWidth="1.5" className="bond-dash" />
              <rect x="262" y={y - 15} width="80" height="30" rx="15" stroke="currentColor" strokeOpacity="0.55" fill="var(--background)" />
              <text x="302" y={y + 5} textAnchor="middle" fontSize="13" fill="currentColor" className="font-mono">{l}</text>
              <path d={`M342 ${y} C 400 ${y}, 400 170, 452 170`} stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" />
              <path d={`M342 ${y} C 400 ${y}, 400 170, 452 170`} stroke="currentColor" strokeWidth="1.5" className="bond-dash" />
            </g>
          );
        })}

        {/* SYXTEE : réunit tout */}
        <circle cx="486" cy="170" r="34" stroke="currentColor" strokeWidth="1.5" fill="var(--background)" />
        <path d="M494 152l-16 22h13l-5 16 17-24h-13l4-14Z" fill="currentColor" fillOpacity="0.9" stroke="none" />
        <text x="486" y="226" textAnchor="middle" fontSize="13" fill="currentColor" className="font-sans">Un seul flux stable</text>

        {/* Plateforme */}
        <path d="M520 170H562" stroke="currentColor" strokeWidth="1.5" className="bond-dash" />
        <rect x="562" y="130" width="68" height="80" rx="10" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05" />
        <path d="M584 156v28l24-14-24-14Z" stroke="currentColor" strokeWidth="1.5" />
        <text x="596" y="232" textAnchor="middle" fontSize="13" fill="currentColor" className="font-sans">Twitch, YouTube…</text>
      </g>
    </svg>
  );
}
