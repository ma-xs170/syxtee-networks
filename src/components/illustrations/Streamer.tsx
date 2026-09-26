// Streamer IRL en marche, perche levée avec le téléphone. Silhouette filaire.
// `StreamerFigure` est réutilisé tel quel dans la scène 3 du scrollytelling Starlink.

// Origine : entre les pieds. Centre du téléphone, relatif à l'origine.
export const STREAMER_PHONE = { x: -58, y: -270 };

export function StreamerFigure() {
  return (
    <g stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" fill="none">
      {/* Perche + téléphone */}
      <path d="M-32 -110L-55 -255" />
      <path d="M-50 -226l-7 2" strokeWidth={1} />
      <rect x={-66} y={-284} width={16} height={28} rx={3.5} fill="currentColor" fillOpacity={0.06} />
      <path d="M-62 -262h8" strokeWidth={1} />
      <circle cx={-61} cy={-279} r={1.6} className="led-blink" fill="var(--live)" stroke="none" />

      {/* Tête, casquette */}
      <circle cx={4} cy={-150} r={11} />
      <path d="M-8 -154c2 -9 20 -12 24 -2M-8 -154l-9 2" strokeWidth={1} />

      {/* Corps */}
      <path d="M3 -139L0 -70" />
      {/* Bras qui tient la perche */}
      <path d="M2 -126L-18 -104L-32 -110" />
      {/* Bras libre, en balancier */}
      <path d="M2 -126L16 -100L20 -80" />
      {/* Jambes en marche */}
      <path d="M0 -70L-16 -36L-24 0H-12" />
      <path d="M0 -70L10 -35L22 -4l8 3" />

      {/* Sac à dos : bretelle, poche, aération */}
      <rect x={7} y={-134} width={17} height={42} rx={5} fill="currentColor" fillOpacity={0.05} />
      <path d="M5 -130L-2 -98" strokeWidth={1} />
      <path d="M10 -110h11M10 -104h11" strokeWidth={1} strokeDasharray="1 3" />
      {/* Câble qui ondule du sac vers la perche */}
      <path d="M8 -96c-6 8 -14 -2 -20 6s-10 4 -14 -6" strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
    </g>
  );
}

export default function Streamer({ className = "h-full w-full", animated = true }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="-110 -300 180 320" className={`text-foreground ${animated ? "" : "illu-still"} ${className}`} fill="none" aria-hidden="true">
      <g className="illu-float svg-hairline">
        <StreamerFigure />
      </g>
      <path d="M-90 4H50" stroke="currentColor" strokeOpacity={0.25} strokeDasharray="2 5" strokeLinecap="round" />
    </svg>
  );
}
