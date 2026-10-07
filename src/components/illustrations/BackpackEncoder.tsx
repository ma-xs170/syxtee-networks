// L'encodeur SYXTEE : un sac à dos de stream (antennes, bloc 4G / 5G / Starlink dans la poche avant) relié par câble à une caméra
// de cinéma type FX3 (corps compact, poignée XLR, grande optique, écran latéral) sur trépied. Dessin en volumes (dégradés sombres),
// lisible sur fond clair comme sombre ; seule la LED rouge « en direct » clignote.

export default function BackpackEncoder({ className = "h-full w-full", animated = true }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 520 340" fill="none" className={`text-foreground ${animated ? "" : "illu-still"} ${className}`} role="img" aria-label="Sac à dos de stream avec antennes et bloc de connexions mobiles, relié par câble à une caméra de cinéma sur trépied">
      <defs>
        <linearGradient id="bk-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a3d43" />
          <stop offset="0.45" stopColor="#222428" />
          <stop offset="1" stopColor="#15161a" />
        </linearGradient>
        <linearGradient id="bk-pocket" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2d2f34" />
          <stop offset="1" stopColor="#17181b" />
        </linearGradient>
        <linearGradient id="bk-strap" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0d0e10" />
          <stop offset="1" stopColor="#2a2c31" />
        </linearGradient>
        <linearGradient id="fx-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4d54" />
          <stop offset="0.35" stopColor="#2b2d32" />
          <stop offset="1" stopColor="#141517" />
        </linearGradient>
        <linearGradient id="fx-grip" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#25272b" />
          <stop offset="1" stopColor="#0f1012" />
        </linearGradient>
        <linearGradient id="fx-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3e5e9" />
          <stop offset="0.5" stopColor="#8b8f97" />
          <stop offset="1" stopColor="#c9ccd2" />
        </linearGradient>
        <radialGradient id="fx-glass" cx="0.38" cy="0.34" r="0.8">
          <stop offset="0" stopColor="#6f8fc4" />
          <stop offset="0.35" stopColor="#23365d" />
          <stop offset="0.75" stopColor="#0a0f1d" />
          <stop offset="1" stopColor="#04060b" />
        </radialGradient>
        <radialGradient id="fx-barrel" cx="0.4" cy="0.35" r="0.85">
          <stop offset="0" stopColor="#3b3e44" />
          <stop offset="1" stopColor="#0c0d0f" />
        </radialGradient>
      </defs>

      {/* Sol */}
      <ellipse cx={190} cy={304} rx={120} ry={9} fill="#000" fillOpacity={0.28} />
      <ellipse cx={410} cy={322} rx={64} ry={6} fill="#000" fillOpacity={0.22} />

      {/* ───── Sac à dos ───── */}
      {/* Bretelles (derrière) */}
      <path d="M118 128 C100 172 102 232 120 276" stroke="url(#bk-strap)" strokeWidth={15} strokeLinecap="round" />
      <path d="M262 128 C280 172 278 232 260 276" stroke="url(#bk-strap)" strokeWidth={15} strokeLinecap="round" />
      <path d="M118 128 C100 172 102 232 120 276" stroke="#4a4d54" strokeOpacity={0.5} strokeWidth={1} strokeLinecap="round" strokeDasharray="3 4" />

      {/* Poignée */}
      <path d="M166 52 C166 28 214 28 214 52" stroke="#0e0f11" strokeWidth={10} strokeLinecap="round" />
      <path d="M166 52 C166 31 214 31 214 52" stroke="#454850" strokeWidth={2.5} strokeLinecap="round" />

      {/* Antennes */}
      <path d="M142 62 L112 12" stroke="currentColor" strokeOpacity={0.85} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M238 62 L268 12" stroke="currentColor" strokeOpacity={0.85} strokeWidth={2.6} strokeLinecap="round" />
      <circle cx={111} cy={10} r={4.2} fill="currentColor" />
      <circle cx={269} cy={10} r={4.2} fill="currentColor" />
      <rect x={136} y={58} width={12} height={9} rx={2.5} fill="#0e0f11" />
      <rect x={232} y={58} width={12} height={9} rx={2.5} fill="#0e0f11" />
      <g stroke="currentColor" strokeOpacity={0.5} strokeWidth={1.4} strokeLinecap="round">
        <path d="M284 20a20 20 0 0 1 0 22M294 14a30 30 0 0 1 0 34M304 8a40 40 0 0 1 0 46" />
        <path d="M96 20a20 20 0 0 0 0 22M86 14a30 30 0 0 0 0 34" strokeOpacity={0.32} />
      </g>

      {/* Corps */}
      <path d="M120 98 C120 64 150 48 190 48 C230 48 260 64 260 98 L271 262 C271 286 257 298 236 298 H144 C123 298 109 286 109 262 Z" fill="url(#bk-body)" stroke="#0a0b0c" strokeWidth={1.5} />
      <path d="M126 100 C128 74 152 56 190 56" stroke="#fff" strokeOpacity={0.13} strokeWidth={1.5} strokeLinecap="round" />
      {/* Rabat et sa fermeture */}
      <path d="M121 124 C150 140 230 140 259 124" stroke="#08090a" strokeWidth={2} />
      <path d="M121 127 C150 143 230 143 259 127" stroke="#fff" strokeOpacity={0.08} strokeWidth={1} />
      {/* Panneau d'état */}
      <rect x={160} y={72} width={60} height={24} rx={7} fill="#090a0c" stroke="#43464d" />
      <circle cx={172} cy={84} r={3.4} fill="var(--live)" className={animated ? "led-blink" : ""} />
      <rect x={181} y={82} width={30} height={4} rx={2} fill="#4a4d54" />

      {/* Poche avant */}
      <rect x={131} y={158} width={118} height={122} rx={17} fill="url(#bk-pocket)" stroke="#0a0b0c" strokeWidth={1.5} />
      <path d="M143 176 H237" stroke="#5a5d65" strokeWidth={1.6} strokeDasharray="2 3" strokeLinecap="round" />
      <rect x={229} y={170} width={10} height={14} rx={3} fill="#0b0c0e" stroke="#5a5d65" />
      {/* Bloc connexions */}
      <rect x={148} y={192} width={84} height={52} rx={8} fill="#08090b" stroke="#4a4d54" />
      <text x={190} y={212} textAnchor="middle" fill="#e4e6ea" fontSize={12} className="font-mono" letterSpacing="0.08em">
        4G · 5G
      </text>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={166 + i * 10} y={236 - 4 - i * 3} width={5} height={4 + i * 3} rx={1.5} fill={i < 4 ? "#d9dce1" : "#43464d"} />
      ))}
      <circle cx={222} cy={229} r={3} stroke="#8b8f97" strokeWidth={1.4} />
      {/* Sangles MOLLE */}
      {[252, 260, 268].map((y) => (
        <rect key={y} x={146} y={y} width={88} height={3.4} rx={1.7} fill="#3a3d43" />
      ))}

      {/* Poches latérales */}
      <path d="M111 214 C93 216 93 266 114 270 L116 214 Z" fill="#141518" stroke="#0a0b0c" />
      <path d="M269 214 C287 216 287 266 266 270 L264 214 Z" fill="#141518" stroke="#0a0b0c" />
      <path d="M98 232 C97 250 100 262 112 266" stroke="#fff" strokeOpacity={0.1} />

      {/* Câble vers la caméra */}
      <path d="M268 238 C300 244 314 262 338 252" stroke="#0b0c0e" strokeWidth={5.5} strokeLinecap="round" />
      <path d="M268 238 C300 244 314 262 338 252" stroke="#4a4d54" strokeWidth={1.4} strokeLinecap="round" />

      {/* ───── Caméra de cinéma (FX3) ───── */}
      {/* Trépied */}
      <path d="M410 272 L376 316 M410 272 L444 316 M410 272 L410 320" stroke="#202226" strokeWidth={5} strokeLinecap="round" />
      <path d="M410 272 L376 316 M410 272 L444 316 M410 272 L410 320" stroke="#4a4d54" strokeWidth={1} strokeLinecap="round" strokeOpacity={0.6} />
      <rect x={388} y={262} width={44} height={9} rx={3} fill="#131416" stroke="#3a3d43" />

      {/* Écran latéral déployé */}
      <path d="M342 186 L317 196 L317 248 L342 252 Z" fill="#0d0e10" stroke="#4a4d54" strokeWidth={1.2} />
      <path d="M338 192 L322 199 L322 243 L338 246 Z" fill="#162030" />
      <path d="M326 205 L334 202 M326 213 L334 210" stroke="#6f8fc4" strokeOpacity={0.55} strokeLinecap="round" />

      {/* Poignée XLR et bouton REC */}
      <rect x={366} y={146} width={104} height={24} rx={7} fill="#1d1e21" stroke="#0a0b0c" />
      <path d="M376 158h84" stroke="#4a4d54" strokeOpacity={0.7} strokeLinecap="round" />
      <path d="M376 151h84M376 165h84" stroke="#fff" strokeOpacity={0.06} />
      <circle cx={462} cy={158} r={5} fill="#e0332a" />
      <rect x={380} y={168} width={10} height={6} rx={1.5} fill="#0c0d0f" />
      <rect x={446} y={168} width={10} height={6} rx={1.5} fill="#0c0d0f" />

      {/* Corps et poignée de prise en main */}
      <path d="M481 176 C500 178 506 204 502 252 C500 264 490 264 481 264 Z" fill="url(#fx-grip)" stroke="#0a0b0c" strokeWidth={1.2} />
      <path d="M492 190 L492 250 M497 192 L497 248" stroke="#3a3d43" strokeWidth={1.2} strokeLinecap="round" />
      <rect x={342} y={170} width={140} height={94} rx={10} fill="url(#fx-body)" stroke="#0a0b0c" strokeWidth={1.5} />
      <path d="M350 172 H474" stroke="#fff" strokeOpacity={0.18} strokeWidth={1.2} strokeLinecap="round" />
      <circle cx={354} cy={183} r={3} fill="#e0332a" className={animated ? "led-blink" : ""} />
      <text x={452} y={196} fill="#aeb2ba" fontSize={9} className="font-mono" letterSpacing="0.14em">
        FX3
      </text>
      <circle cx={354} cy={252} r={4} fill="#0c0d0f" stroke="#4a4d54" />
      <circle cx={468} cy={252} r={4} fill="#0c0d0f" stroke="#4a4d54" />

      {/* Monture et objectif */}
      <circle cx={411} cy={223} r={47} fill="url(#fx-ring)" />
      <circle cx={411} cy={223} r={42} fill="url(#fx-barrel)" stroke="#050607" strokeWidth={1.5} />
      <circle cx={411} cy={223} r={36} stroke="#2e3035" strokeWidth={5} strokeDasharray="2.2 3" />
      <circle cx={411} cy={223} r={29} fill="#0b0c0e" stroke="#2a2c31" strokeWidth={3} />
      <circle cx={411} cy={223} r={21} fill="url(#fx-glass)" stroke="#05070b" strokeWidth={1.5} />
      <ellipse cx={403} cy={214} rx={7} ry={4.5} fill="#fff" fillOpacity={0.5} transform="rotate(-28 403 214)" />
      <circle cx={420} cy={232} r={3} fill="#9db6e6" fillOpacity={0.55} />

      <text x={260} y={334} textAnchor="middle" fill="currentColor" fillOpacity={0.55} fontSize={9} className="font-mono" letterSpacing="0.14em">
        BONDING · STARLINK · WI-FI
      </text>
    </svg>
  );
}
