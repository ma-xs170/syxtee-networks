// Schéma qui explique le service d'un coup d'œil : le téléphone envoie la vidéo par plusieurs connexions à la fois,
// SYXTEE les réunit en un seul flux stable, qui part vers la plateforme. Le texte voisin dit la même chose.
// Pictogrammes : vrais emoji (rendus dans le style Apple sur Mac et iPhone), logo SYXTEE au centre.

const LINKS = [
  { emoji: "📶", label: "4G" },
  { emoji: "📶", label: "5G" },
  { emoji: "🛜", label: "Wi-Fi" },
  { emoji: "🛰️", label: "Starlink" },
];

export default function BondingDiagram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 340" role="img" aria-label="Ton téléphone envoie la vidéo par plusieurs connexions, SYXTEE les réunit en un seul flux stable vers ta plateforme" className={`h-auto w-full text-foreground ${className}`} fill="none">
      <g strokeLinecap="round" strokeLinejoin="round">
        {/* Téléphone */}
        <text x="58" y="198" textAnchor="middle" fontSize="84" fill="currentColor" aria-hidden="true">📱</text>
        <text x="58" y="250" textAnchor="middle" fontSize="13" fill="currentColor" className="font-sans">Ton téléphone</text>

        {/* Connexions */}
        {LINKS.map((l, i) => {
          const y = 62 + i * 72;
          return (
            <g key={l.label}>
              <path d={`M104 170 C 186 170, 186 ${y}, 244 ${y}`} stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" />
              <path d={`M104 170 C 186 170, 186 ${y}, 244 ${y}`} stroke="currentColor" strokeWidth="1.5" className="bond-dash" />
              <rect x="244" y={y - 17} width="116" height="34" rx="17" stroke="currentColor" strokeOpacity="0.6" fill="var(--background)" />
              <text x="262" y={y + 7} fontSize="18" fill="currentColor" aria-hidden="true">{l.emoji}</text>
              <text x="288" y={y + 5} fontSize="13" fill="currentColor" className="font-mono">{l.label}</text>
              <path d={`M360 ${y} C 410 ${y}, 410 170, 452 170`} stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" />
              <path d={`M360 ${y} C 410 ${y}, 410 170, 452 170`} stroke="currentColor" strokeWidth="1.5" className="bond-dash" />
            </g>
          );
        })}

        {/* SYXTEE : réunit tout */}
        <circle cx="486" cy="170" r="34" stroke="currentColor" strokeWidth="1.5" fill="var(--background)" />
        <image href="/logo-400.png" x="474" y="153" width="24" height="34" preserveAspectRatio="xMidYMid meet" className="ink-img" />
        <text x="486" y="226" textAnchor="middle" fontSize="13" fill="currentColor" className="font-sans">Un seul flux stable</text>

        {/* Plateforme */}
        <path d="M520 170H562" stroke="currentColor" strokeWidth="1.5" className="bond-dash" />
        <text x="584" y="198" textAnchor="middle" fontSize="64" fill="currentColor" aria-hidden="true">📺</text>
        <text x="584" y="232" textAnchor="middle" fontSize="13" fill="currentColor" className="font-sans">Twitch, YouTube</text>
      </g>
    </svg>
  );
}
