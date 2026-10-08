// Objet abstrait du hero : trois plaques de verre empilées et un signal qui les traverse (SVG + dégradés, aucune image).
export default function HeroObject() {
  return (
    <svg viewBox="0 0 480 420" role="img" aria-label="Trois connexions réunies en un seul flux" className="h-auto w-full max-w-[480px]">
      <defs>
        <linearGradient id="ho-plate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--foreground)" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="var(--foreground)" stopOpacity="0.05" />
          <stop offset="1" stopColor="var(--foreground)" stopOpacity="0.12" />
        </linearGradient>
        <radialGradient id="ho-glow" cx="50%" cy="45%" r="50%">
          <stop offset="0" stopColor="var(--foreground)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--foreground)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ho-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--foreground)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--foreground)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--foreground)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="240" cy="210" rx="220" ry="180" fill="url(#ho-glow)" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${i * 28} ${i * -46})`}>
          <rect x="70" y="190" width="250" height="150" rx="28" transform="skewX(-14)" fill="url(#ho-plate)" stroke="var(--foreground)" strokeOpacity={0.28 - i * 0.05} />
          <rect x="86" y="206" width="70" height="8" rx="4" transform="skewX(-14)" fill="var(--foreground)" fillOpacity="0.35" />
          <rect x="86" y="224" width="110" height="6" rx="3" transform="skewX(-14)" fill="var(--foreground)" fillOpacity="0.15" />
        </g>
      ))}
      <rect x="60" y="205" width="360" height="2" fill="url(#ho-beam)" className="flow-line" />
      <circle cx="396" cy="206" r="5" fill="var(--ok)" />
    </svg>
  );
}
