// Animations de fond des cartes de /multistream : yeux, envoi, clic. Traits en couleur d'encre, invisibles au repos,
// elles apparaissent et s'animent au survol de la carte (parent .group). prefers-reduced-motion : figées.

const svg = "pointer-events-none absolute -bottom-2 right-3 h-32 w-44 text-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-35 group-focus-within:opacity-35";
const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

/** Des yeux qui regardent à gauche et à droite et clignent : le public. */
export function EyesArt() {
  return (
    <svg viewBox="0 0 176 128" className={svg} {...common}>
      {[[44, 76], [88, 52], [132, 80]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g className="hv-blink" style={{ animationDelay: `${i * 0.5}s` }}>
            <path d="M-26 0C-16 -15 16 -15 26 0C16 15 -16 15 -26 0Z" />
            <circle className="hv-look" style={{ animationDelay: `${i * 0.4}s` }} r="7" fill="currentColor" stroke="none" />
          </g>
        </g>
      ))}
    </svg>
  );
}

/** Un envoi qui part vers plusieurs destinations : traits qui avancent, destinations qui s'allument. */
export function SendArt() {
  return (
    <svg viewBox="0 0 176 128" className={svg} {...common}>
      <rect x="8" y="50" width="30" height="28" rx="6" />
      {[[140, 22], [140, 64], [140, 106]].map(([x, y], i) => (
        <g key={i}>
          <path d={`M38 64C80 64 90 ${y} ${x - 8} ${y}`} strokeDasharray="4 6" className="hv-flow" style={{ animationDelay: `${i * 0.25}s` }} />
          <rect className="hv-pulse" style={{ animationDelay: `${i * 0.25}s` }} x={x - 8} y={y - 12} width="24" height="24" rx="6" />
        </g>
      ))}
    </svg>
  );
}

/** Un curseur qui vient cliquer sur un bouton : onde au moment du clic. */
export function ClickArt() {
  return (
    <svg viewBox="0 0 176 128" className={svg} {...common}>
      <rect x="40" y="62" width="96" height="36" rx="18" />
      <circle className="hv-ripple" cx="88" cy="80" r="14" />
      <path className="hv-cursor" d="M0 0l0 22l6 -6l5 12l5 -2l-5 -12l8 0z" fill="currentColor" />
    </svg>
  );
}
