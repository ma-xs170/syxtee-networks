const links = [
  { label: "4G", y: 40 },
  { label: "5G", y: 120 },
  { label: "Wi-Fi", y: 200 },
];

// 3 connexions qui convergent vers le relais : le principe du bonding.
export default function BondingDiagram() {
  return (
    <figure className="rounded-2xl border border-line bg-white/[0.02] p-6 sm:p-8">
      <svg viewBox="0 0 420 240" className="h-auto w-full" role="img" aria-labelledby="bonding-title">
        <title id="bonding-title">Les connexions 4G, 5G et Wi-Fi convergent vers le relais SYXTEE, qui sort un seul flux SRT.</title>
        {links.map((l) => {
          const d = `M 84 ${l.y} C 170 ${l.y}, 170 120, 250 120`;
          return (
            <g key={l.label}>
              <rect x="4" y={l.y - 16} width="80" height="32" rx="16" fill="#000" stroke="var(--line)" />
              <text x="44" y={l.y + 4} textAnchor="middle" fontSize="12" fill="var(--foreground)" className="font-mono">
                {l.label}
              </text>
              <path d={d} fill="none" stroke="var(--line)" strokeWidth="1.5" />
              <path d={d} fill="none" stroke="#fff" strokeWidth="1.5" className="bond-dash" />
            </g>
          );
        })}
        <rect x="250" y="96" width="96" height="48" rx="10" fill="#fff" />
        <text x="298" y="117" textAnchor="middle" fontSize="11" fontWeight="600" fill="#000">RELAIS</text>
        <text x="298" y="132" textAnchor="middle" fontSize="9" fill="#525252" className="font-mono">SYXTEE</text>
        <path d="M 346 120 L 404 120" stroke="var(--line)" strokeWidth="1.5" />
        <path d="M 346 120 L 404 120" stroke="#fff" strokeWidth="1.5" className="bond-dash" />
        <path d="M 398 114 L 406 120 L 398 126" fill="none" stroke="#fff" strokeWidth="1.5" />
        <text x="376" y="108" textAnchor="middle" fontSize="10" fill="var(--muted)" className="font-mono">SRT</text>
      </svg>
      <figcaption className="mt-4 font-mono text-xs text-muted">
        Les paquets partent sur les 3 réseaux en même temps. Le relais les remet dans l&apos;ordre.
      </figcaption>
    </figure>
  );
}
