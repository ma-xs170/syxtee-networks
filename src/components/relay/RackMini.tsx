// Petite baie filaire vue de face pour les cartes de la grille des relais.
// En ligne : LED rouges « live » qui clignotent. Bientôt : LED éteintes.
export default function RackMini({ online, className = "h-16 w-14" }: { online: boolean; className?: string }) {
  const units = [0, 1, 2, 3];
  return (
    <svg viewBox="0 0 56 68" className={`text-foreground ${className}`} fill="none" aria-hidden="true">
      <g className="svg-hairline" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round">
        <rect x={6} y={2} width={44} height={60} rx={3} />
        <path d="M10 66h8M38 66h8" strokeWidth={1} strokeOpacity={0.5} />
        {units.map((i) => (
          <g key={i}>
            <rect x={10} y={8 + i * 13} width={36} height={10} rx={1.5} strokeWidth={1} />
            <path d={`M14 ${13 + i * 13}h14`} strokeWidth={1} strokeDasharray="1 2.5" strokeOpacity={0.6} />
            <circle
              cx={40}
              cy={13 + i * 13}
              r={1.8}
              stroke="none"
              fill={online ? "var(--live)" : "currentColor"}
              fillOpacity={online ? 1 : 0.2}
              className={online ? "led-blink" : undefined}
              style={online ? { animationDelay: `${i * 0.35}s` } : undefined}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
