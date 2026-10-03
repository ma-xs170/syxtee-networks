// Le multiview de SYXTEE MIX en filaire : aperçu et programme en grand, huit scènes dessous, horloge, tallys.
// Trait fin, aucune couleur sauf le rouge « à l'antenne » (état live) sur la case programme.

export default function StudioWire({ className = "h-full w-full", animated = true }: { className?: string; animated?: boolean }) {
  const small = Array.from({ length: 8 }, (_, i) => ({ x: 20 + (i % 4) * 90, y: 164 + Math.floor(i / 4) * 46 }));
  return (
    <svg viewBox="0 0 400 270" fill="none" className={`text-foreground ${animated ? "" : "illu-still"} ${className}`} role="img" aria-label="Multiview de SYXTEE MIX : aperçu, programme et huit scènes">
      <g className="svg-hairline" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round">
        <rect x={10} y={10} width={380} height={250} rx={10} fill="currentColor" fillOpacity={0.03} />
        {/* Horloge */}
        <text x={20} y={34} stroke="none" fill="currentColor" fontSize={16} className="font-mono" letterSpacing="0.06em">
          19:36:12
        </text>
        <text x={270} y={32} stroke="none" fill="var(--muted)" fontSize={8} className="font-mono" letterSpacing="0.12em">
          1280X720 · 30P
        </text>
        {/* Aperçu */}
        <rect x={20} y={46} width={176} height={110} rx={4} />
        <path d="M20 46l8 0M20 46l0 8" strokeOpacity={0.5} />
        <circle cx={108} cy={101} r={22} strokeOpacity={0.7} />
        <path d="M108 101l14-9" strokeOpacity={0.7} />
        <text x={28} y={62} stroke="none" fill="var(--muted)" fontSize={7} className="font-mono" letterSpacing="0.12em">
          APERÇU
        </text>
        {/* Programme : tally rouge */}
        <rect x={204} y={46} width={176} height={110} rx={4} stroke="var(--live)" strokeWidth={2} />
        <rect x={236} y={72} width={112} height={62} rx={3} strokeOpacity={0.7} />
        <path d="M236 134l32-26 22 18 20-14 38 22" strokeOpacity={0.7} />
        <text x={212} y={62} stroke="none" fill="var(--live)" fontSize={7} className="font-mono" letterSpacing="0.12em">
          PROGRAMME
        </text>
        <circle cx={370} cy={58} r={3} fill="var(--live)" stroke="none" className={animated ? "led-blink" : ""} />
        {/* Niveaux audio */}
        {[0, 1, 2].map((i) => (
          <rect key={i} x={364 - i * 7} y={90 + i * 6} width={3} height={52 - i * 6} rx={1} strokeOpacity={0.6} />
        ))}
        {/* Scènes */}
        {small.map((s, i) => (
          <g key={i}>
            <rect x={s.x} y={s.y} width={82} height={40} rx={3} strokeOpacity={i === 1 ? 1 : 0.55} />
            {i < 6 && <path d={`M${s.x + 10} ${s.y + 30}l16-14 12 9 12-7 20 12`} strokeOpacity={0.35} />}
          </g>
        ))}
      </g>
    </svg>
  );
}
