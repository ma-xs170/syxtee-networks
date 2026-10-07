// L'encodeur SYXTEE : un sac à dos de stream (antennes intégrées, bloc 4G / 5G / Starlink sous la poche) relié par câble à une
// caméra de cinéma compacte de type FX3 sur trépied. Dessin en volumes, éclairage unique venu du haut à gauche, matières mates
// (tissu technique, magnésium, verre), même registre sombre que les maquettes d'écrans du site. Seule la LED rouge clignote.

export default function BackpackEncoder({ className = "h-full w-full", animated = true }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 520 340" fill="none" className={`text-foreground ${animated ? "" : "illu-still"} ${className}`} role="img" aria-label="Sac à dos de stream avec antennes et bloc de connexions mobiles, relié par câble à une caméra de cinéma sur trépied">
      <defs>
        <radialGradient id="bk-glow" cx="0.5" cy="0.55" r="0.55">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bk-fabric" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor="#3b3e44" />
          <stop offset="0.4" stopColor="#202226" />
          <stop offset="1" stopColor="#0f1013" />
        </linearGradient>
        <linearGradient id="bk-front" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2c2e33" />
          <stop offset="1" stopColor="#141518" />
        </linearGradient>
        <linearGradient id="bk-strap" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0b0c0e" />
          <stop offset="1" stopColor="#25272b" />
        </linearGradient>
        <linearGradient id="bk-rod" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6c7078" />
          <stop offset="1" stopColor="#16171a" />
        </linearGradient>
        <linearGradient id="fx-body" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#4c4f56" />
          <stop offset="0.3" stopColor="#2a2c31" />
          <stop offset="1" stopColor="#111214" />
        </linearGradient>
        <linearGradient id="fx-grip" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#202226" />
          <stop offset="1" stopColor="#0c0d0f" />
        </linearGradient>
        <linearGradient id="fx-mount" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9dbe0" />
          <stop offset="0.5" stopColor="#7d8189" />
          <stop offset="1" stopColor="#b7bac1" />
        </linearGradient>
        <radialGradient id="fx-barrel" cx="0.36" cy="0.32" r="0.9">
          <stop offset="0" stopColor="#3f4248" />
          <stop offset="0.6" stopColor="#17181b" />
          <stop offset="1" stopColor="#08090a" />
        </radialGradient>
        <radialGradient id="fx-glass" cx="0.36" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#7e9ccb" />
          <stop offset="0.28" stopColor="#2a4070" />
          <stop offset="0.7" stopColor="#0b1224" />
          <stop offset="1" stopColor="#030509" />
        </radialGradient>
      </defs>

      {/* Lumière ambiante et sol */}
      <ellipse cx={260} cy={190} rx={250} ry={150} fill="url(#bk-glow)" />
      <ellipse cx={180} cy={306} rx={112} ry={8} fill="#000" fillOpacity={0.4} />
      <ellipse cx={410} cy={322} rx={60} ry={5} fill="#000" fillOpacity={0.35} />

      {/* ───── Sac à dos ───── */}
      {/* Bretelles vues par le côté */}
      <path d="M116 120 C98 168 100 236 120 280" stroke="url(#bk-strap)" strokeWidth={16} strokeLinecap="round" />
      <path d="M262 120 C282 168 280 236 260 280" stroke="url(#bk-strap)" strokeWidth={16} strokeLinecap="round" />

      {/* Antennes intégrées : deux fouets fins, bases caoutchouc */}
      <path d="M148 60 L124 14" stroke="url(#bk-rod)" strokeWidth={3} strokeLinecap="round" />
      <path d="M232 60 L256 14" stroke="url(#bk-rod)" strokeWidth={3} strokeLinecap="round" />
      <circle cx={123.5} cy={13} r={2.6} fill="#8d9199" />
      <circle cx={256.5} cy={13} r={2.6} fill="#8d9199" />
      <rect x={141} y={55} width={14} height={11} rx={3.5} fill="#0b0c0e" stroke="#30333a" />
      <rect x={225} y={55} width={14} height={11} rx={3.5} fill="#0b0c0e" stroke="#30333a" />
      <g stroke="currentColor" strokeOpacity={0.3} strokeWidth={1.2} strokeLinecap="round">
        <path d="M270 22a18 18 0 0 1 0 20M279 16a28 28 0 0 1 0 32M288 10a38 38 0 0 1 0 44" />
        <path d="M110 22a18 18 0 0 0 0 20M101 16a28 28 0 0 0 0 32M92 10a38 38 0 0 0 0 44" />
      </g>

      {/* Poignée */}
      <path d="M168 50 C168 30 212 30 212 50" stroke="#0b0c0e" strokeWidth={9} strokeLinecap="round" />
      <path d="M168 50 C168 32 212 32 212 50" stroke="#3c3f46" strokeWidth={2} strokeLinecap="round" />

      {/* Corps */}
      <path d="M118 100 C118 66 148 50 190 50 C232 50 262 66 262 100 L272 262 C272 288 258 300 236 300 H144 C122 300 108 288 108 262 Z" fill="url(#bk-fabric)" stroke="#07080a" strokeWidth={1.5} />
      <path d="M124 104 C126 76 150 58 190 58" stroke="#fff" strokeOpacity={0.16} strokeWidth={1.4} strokeLinecap="round" />
      <path d="M262 110 L271 262" stroke="#fff" strokeOpacity={0.05} strokeWidth={2} />
      {/* Coutures matelassées */}
      <path d="M130 112 C160 124 220 124 250 112" stroke="#fff" strokeOpacity={0.07} />
      {/* Poche haute zippée */}
      <path d="M126 128 C156 142 224 142 254 128" stroke="#07080a" strokeWidth={2.2} />
      <path d="M126 131 C156 145 224 145 254 131" stroke="#fff" strokeOpacity={0.09} />
      <rect x={172} y={136} width={9} height={13} rx={3} fill="#0b0c0e" stroke="#4a4d54" />

      {/* Panneau d'état sous le rabat */}
      <rect x={156} y={70} width={68} height={28} rx={8} fill="#08090b" stroke="#3f4249" />
      <circle cx={168} cy={84} r={3.2} fill="var(--live)" className={animated ? "led-blink" : ""} />
      <text x={177} y={81} fill="#9aa0a8" fontSize={5.6} className="font-mono" letterSpacing="0.1em">
        BONDING
      </text>
      <text x={177} y={91} fill="#e6e8ec" fontSize={7} className="font-mono" letterSpacing="0.06em">
        4 LIENS
      </text>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={207 + i * 4} y={92 - 3 - i * 2.2} width={2.6} height={3 + i * 2.2} rx={0.8} fill="#d9dce1" />
      ))}

      {/* Poche avant */}
      <rect x={130} y={158} width={120} height={124} rx={18} fill="url(#bk-front)" stroke="#07080a" strokeWidth={1.5} />
      <path d="M140 176 H240" stroke="#555962" strokeWidth={1.5} strokeDasharray="1.6 2.6" strokeLinecap="round" />
      <rect x={226} y={169} width={11} height={14} rx={3} fill="#0b0c0e" stroke="#4a4d54" />
      <path d="M136 164 C140 160 244 160 244 164" stroke="#fff" strokeOpacity={0.08} />
      {/* Bloc connexions encastré */}
      <rect x={146} y={192} width={88} height={54} rx={9} fill="#07080a" stroke="#43464d" />
      <rect x={150} y={196} width={80} height={46} rx={6} fill="#0b0d11" />
      <text x={190} y={212} textAnchor="middle" fill="#e6e8ec" fontSize={11} className="font-mono" letterSpacing="0.1em">
        4G · 5G
      </text>
      <path d="M160 222h60" stroke="#2d3036" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={164 + i * 11} y={238 - 4 - i * 2.6} width={6} height={4 + i * 2.6} rx={1.4} fill={i < 4 ? "#d4d7dc" : "#3d4047"} />
      ))}
      <circle cx={222} cy={233} r={2.8} stroke="#8b8f97" strokeWidth={1.3} />
      {/* Sangles de compression et boucles */}
      <path d="M130 258 H250 M130 268 H250" stroke="#0b0c0e" strokeWidth={5} />
      <path d="M130 258 H250 M130 268 H250" stroke="#32353b" strokeWidth={1} />
      <rect x={226} y={254} width={13} height={18} rx={3} fill="#15161a" stroke="#4a4d54" />

      {/* Poches latérales avec gourde */}
      <path d="M110 214 C92 218 92 268 114 272 L116 214 Z" fill="#131417" stroke="#07080a" />
      <path d="M270 214 C288 218 288 268 266 272 L264 214 Z" fill="#131417" stroke="#07080a" />
      <path d="M100 236 C99 252 102 264 112 268" stroke="#fff" strokeOpacity={0.1} />

      {/* Câble vers la caméra */}
      <path d="M270 240 C302 244 318 262 342 254" stroke="#08090a" strokeWidth={6} strokeLinecap="round" />
      <path d="M270 240 C302 244 318 262 342 254" stroke="#3f4249" strokeWidth={1.2} strokeLinecap="round" />

      {/* ───── Caméra de cinéma compacte ───── */}
      {/* Trépied */}
      <path d="M412 268 L384 318 M412 268 L440 318 M412 268 L412 322" stroke="#17181b" strokeWidth={5.5} strokeLinecap="round" />
      <path d="M412 268 L384 318 M412 268 L440 318 M412 268 L412 322" stroke="#3f4249" strokeWidth={1} strokeLinecap="round" strokeOpacity={0.7} />
      <rect x={394} y={258} width={36} height={10} rx={3} fill="#101113" stroke="#3a3d43" />

      {/* Écran latéral */}
      <path d="M346 190 L320 198 L320 246 L346 252 Z" fill="#0b0c0e" stroke="#444850" strokeWidth={1.1} />
      <path d="M342 195 L325 201 L325 242 L342 247 Z" fill="#101b2b" />
      <path d="M329 208 L338 205 M329 216 L338 213 M329 224 L336 222" stroke="#6f8fc4" strokeOpacity={0.5} strokeLinecap="round" />
      <circle cx={346} cy={221} r={2.4} fill="#1b1d21" stroke="#4a4d54" />

      {/* Poignée XLR et bouton REC */}
      <rect x={370} y={148} width={96} height={22} rx={6.5} fill="#18191c" stroke="#07080a" />
      <path d="M380 156h76" stroke="#4a4d54" strokeOpacity={0.7} strokeLinecap="round" />
      <path d="M380 163h76" stroke="#fff" strokeOpacity={0.06} />
      <circle cx={458} cy={159} r={4.4} fill="#d92f27" />
      <rect x={384} y={168} width={9} height={6} rx={1.5} fill="#0b0c0e" />
      <rect x={444} y={168} width={9} height={6} rx={1.5} fill="#0b0c0e" />

      {/* Corps et prise en main */}
      <path d="M478 176 C497 178 503 204 499 252 C497 264 487 264 478 264 Z" fill="url(#fx-grip)" stroke="#07080a" strokeWidth={1.2} />
      <path d="M489 192 V250 M494 194 V248" stroke="#2f3237" strokeWidth={1.2} strokeLinecap="round" />
      <rect x={346} y={170} width={134} height={94} rx={10} fill="url(#fx-body)" stroke="#07080a" strokeWidth={1.5} />
      <path d="M354 172.5 H472" stroke="#fff" strokeOpacity={0.2} strokeWidth={1.2} strokeLinecap="round" />
      <circle cx={358} cy={183} r={2.6} fill="#d92f27" className={animated ? "led-blink" : ""} />
      <text x={448} y={196} fill="#9fa4ac" fontSize={8} className="font-mono" letterSpacing="0.16em">
        FX3
      </text>
      <circle cx={358} cy={253} r={3.6} fill="#0b0c0e" stroke="#444850" />
      <circle cx={468} cy={253} r={3.6} fill="#0b0c0e" stroke="#444850" />

      {/* Monture et optique */}
      <circle cx={413} cy={224} r={43} fill="url(#fx-mount)" />
      <circle cx={413} cy={224} r={38.5} fill="url(#fx-barrel)" stroke="#040506" strokeWidth={1.5} />
      <circle cx={413} cy={224} r={33} stroke="#2a2c31" strokeWidth={5.5} strokeDasharray="1.8 2.6" />
      <circle cx={413} cy={224} r={26.5} fill="#08090b" stroke="#25272b" strokeWidth={2.5} />
      <circle cx={413} cy={224} r={19.5} fill="url(#fx-glass)" stroke="#030405" strokeWidth={1.5} />
      <ellipse cx={405.5} cy={215.5} rx={6.5} ry={4} fill="#fff" fillOpacity={0.42} transform="rotate(-28 405.5 215.5)" />
      <circle cx={421} cy={232} r={2.6} fill="#9db6e6" fillOpacity={0.4} />
      <path d="M392 206 A30 30 0 0 1 404 196" stroke="#fff" strokeOpacity={0.22} strokeWidth={1.5} strokeLinecap="round" />

      <text x={260} y={335} textAnchor="middle" fill="currentColor" fillOpacity={0.5} fontSize={8.5} className="font-mono" letterSpacing="0.16em">
        BONDING · STARLINK · WI-FI
      </text>
    </svg>
  );
}
