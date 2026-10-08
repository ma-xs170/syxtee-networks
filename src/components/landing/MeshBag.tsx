// Sac Mesh SYXTEE en SVG : sac à dos noir avec panneau rigide ouvert vers le ciel (pour un terminal satellite compact), poche en mesh,
// rabat brodé, liseré clair et voyant qui respire. Dessiné à partir de la même charte que le boîtier (noir mat, liserés, voyants verts).
export default function MeshBag({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 460" role="img" aria-label="Sac Mesh SYXTEE avec panneau rigide ouvert" className={`h-auto w-full ${className}`}>
      <defs>
        <linearGradient id="mb-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2c2d31" />
          <stop offset="1" stopColor="#101113" />
        </linearGradient>
        <linearGradient id="mb-panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#35363b" />
          <stop offset="1" stopColor="#18191c" />
        </linearGradient>
        <pattern id="mb-mesh" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0H8M0 0V8" stroke="#fff" strokeOpacity="0.12" strokeWidth="1" />
        </pattern>
        <radialGradient id="mb-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#000" stopOpacity="0.6" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="210" cy="438" rx="150" ry="14" fill="url(#mb-shadow)" />
      {/* panneau rigide ouvert, qui respire doucement */}
      <g className="bag-panel" style={{ transformOrigin: "120px 118px" }}>
        <path d="M96 112 L330 76 L346 112 L112 150 Z" fill="url(#mb-panel)" stroke="#fff" strokeOpacity="0.2" />
        <path d="M96 112 L330 76" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" />
        <rect x="150" y="104" width="52" height="10" rx="3" transform="rotate(-9 150 104)" fill="#fff" fillOpacity="0.1" />
      </g>
      {/* corps du sac */}
      <path d="M112 150 H330 L346 112 V392 Q346 420 318 420 H124 Q96 420 96 392 V112 Z" fill="url(#mb-body)" stroke="#fff" strokeOpacity="0.16" />
      <path d="M96 112 L112 150" stroke="#fff" strokeOpacity="0.2" />
      {/* rabat brodé */}
      <path d="M118 152 H324 V252 Q324 266 310 266 H132 Q118 266 118 252 Z" fill="#1d1e21" stroke="#fff" strokeOpacity="0.16" />
      <text x="221" y="205" textAnchor="middle" fill="#fff" fillOpacity="0.8" fontSize="22" fontWeight="700" letterSpacing="4" fontFamily="var(--font-geist-sans), system-ui, sans-serif">SYXTEE</text>
      <text x="221" y="228" textAnchor="middle" fill="#fff" fillOpacity="0.45" fontSize="11" letterSpacing="6" fontFamily="var(--font-geist-sans), system-ui, sans-serif">NETWORKS</text>
      <path d="M130 244 H312" stroke="#fff" strokeOpacity="0.12" strokeDasharray="3 4" />
      {/* poche mesh ventilée */}
      <rect x="128" y="282" width="186" height="104" rx="16" fill="#0b0b0c" stroke="#fff" strokeOpacity="0.14" />
      <rect x="128" y="282" width="186" height="104" rx="16" fill="url(#mb-mesh)" />
      <path d="M142 282 V386" stroke="#fff" strokeOpacity="0.1" />
      {/* fermeture et voyant */}
      <path d="M128 272 H314" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
      <rect x="296" y="266" width="14" height="12" rx="3" fill="#fff" fillOpacity="0.5" />
      <circle cx="152" cy="300" r="4" fill="var(--ok)" className="live-led" />
      {/* bretelles */}
      <path d="M96 190 Q70 230 80 340" fill="none" stroke="#1a1b1e" strokeWidth="16" strokeLinecap="round" />
      <path d="M346 190 Q372 230 362 340" fill="none" stroke="#1a1b1e" strokeWidth="16" strokeLinecap="round" />
      <path d="M96 190 Q70 230 80 340M346 190 Q372 230 362 340" fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="1" />
    </svg>
  );
}
