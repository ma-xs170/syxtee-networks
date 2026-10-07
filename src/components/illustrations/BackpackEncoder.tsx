// L'encodeur SYXTEE en filaire : un sac à dos de stream. Antennes sur le dessus, poche avant pour le bloc 4G / 5G / Starlink,
// câble vers la caméra. Trait fin, aucune couleur sauf la LED rouge d'activité (état « en direct »).

export default function BackpackEncoder({ className = "h-full w-full", animated = true }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 440 320" fill="none" className={`text-foreground ${animated ? "" : "illu-still"} ${className}`} role="img" aria-label="Sac à dos de stream avec antennes, bloc de connexions mobiles et câble vers la caméra">
      <g className="svg-hairline" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round">
        {/* Sol */}
        <ellipse cx={200} cy={288} rx={110} ry={9} strokeOpacity={0.25} strokeDasharray="2 5" fill="currentColor" fillOpacity={0.03} />

        {/* Antennes et ondes */}
        <path d="M150 74 L118 18" />
        <circle cx={118} cy={16} r={3} />
        <path d="M250 74 L282 18" />
        <circle cx={282} cy={16} r={3} />
        <path d="M296 28a22 22 0 0 1 0 22M306 22a32 32 0 0 1 0 34M316 16a42 42 0 0 1 0 46" strokeOpacity={0.55} />
        <path d="M104 28a22 22 0 0 0 0 22M94 22a32 32 0 0 0 0 34" strokeOpacity={0.35} />

        {/* Poignée */}
        <path d="M172 62 Q172 38 200 38 Q228 38 228 62" />

        {/* Bretelles */}
        <path d="M130 128 Q96 160 108 252" strokeOpacity={0.7} />
        <path d="M270 128 Q304 160 292 252" strokeOpacity={0.7} />

        {/* Corps du sac */}
        <path d="M138 84 Q138 60 200 60 Q262 60 262 84 L276 248 Q276 274 250 274 H150 Q124 274 124 248 Z" fill="currentColor" fillOpacity={0.04} />

        {/* Compartiment haut : panneau de statut */}
        <path d="M146 112 Q200 126 254 112" strokeOpacity={0.6} />
        <rect x={166} y={78} width={68} height={22} rx={5} />
        <circle cx={180} cy={89} r={3} fill="var(--live)" stroke="none" className={animated ? "led-blink" : ""} />
        <path d="M194 89h30" strokeOpacity={0.55} />

        {/* Poche avant : bloc connexions */}
        <rect x={150} y={134} width={100} height={104} rx={14} />
        <path d="M150 156H250" strokeDasharray="1 4" />
        <path d="M232 156l8 6" />
        <rect x={164} y={170} width={72} height={52} rx={6} strokeOpacity={0.85} />
        <text x={200} y={192} textAnchor="middle" stroke="none" fill="currentColor" fontSize={11} className="font-mono" letterSpacing="0.08em">
          4G · 5G
        </text>
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M${178 + i * 9} 212v-${4 + i * 3}`} strokeWidth={2.5} strokeOpacity={0.7} />
        ))}
        <circle cx={222} cy={207} r={3.5} strokeOpacity={0.7} />

        {/* Poches latérales */}
        <path d="M124 196 Q104 200 106 232 Q108 250 128 248" strokeOpacity={0.8} />
        <path d="M276 196 Q296 200 294 232 Q292 250 272 248" strokeOpacity={0.8} />

        {/* Câble vers la caméra */}
        <path d="M290 214 Q320 220 322 190 T346 168" strokeDasharray="2 4" />

        {/* Caméra */}
        <rect x={340} y={138} width={74} height={50} rx={7} />
        <circle cx={376} cy={163} r={15} />
        <circle cx={376} cy={163} r={6} strokeOpacity={0.6} />
        <rect x={352} y={128} width={22} height={10} rx={3} />
        <circle cx={402} cy={148} r={2} fill="var(--live)" stroke="none" className={animated ? "led-blink" : ""} />
        <path d="M376 188v16M360 204h32" strokeOpacity={0.7} />

        <text x={200} y={304} textAnchor="middle" stroke="none" fill="var(--muted)" fontSize={9} className="font-mono" letterSpacing="0.14em">
          BONDING · STARLINK · WI-FI
        </text>
      </g>
    </svg>
  );
}
