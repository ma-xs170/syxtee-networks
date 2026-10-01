import { Illustration, Led } from "./iso";

// Bulle de chat avec l'icône Discord en filaire, une réponse qui s'écrit, une notification.
const discord =
  "M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.2a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.4C.6 9 -.3 13.5.1 18a19.9 19.9 0 0 0 6 3l1.3-2.1c-.7-.3-1.4-.6-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.9-9.7-3.6-13.6ZM8 15.3c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.5 8 10.5s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z";

// Bulle en légère perspective 3/4 : face avant cisaillée + épaisseur.
const skew = "matrix(1 0.18 0 1 0 0)";

export default function DiscordChat({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <Illustration viewBox="-10 -10 300 250" className={className} animated={animated}>
      <ellipse cx={140} cy={226} rx={110} ry={9} fill="currentColor" fillOpacity={0.04} strokeOpacity={0.25} strokeDasharray="2 5" />

      {/* Réponse de l'équipe, derrière */}
      <g transform={skew} opacity={0.55}>
        <path d="M150 12h110a14 14 0 0 1 14 14v44a14 14 0 0 1-14 14h-30l-14 16v-16h-66a14 14 0 0 1-14-14V26a14 14 0 0 1 14-14Z" />
        {[0, 1, 2].map((k) => (
          <circle key={k} cx={190 + k * 14} cy={48} r={3} className="wifi-pulse" style={{ animationDelay: `${k * 0.2}s` }} fill="currentColor" />
        ))}
      </g>

      <g className="illu-float">
        <g transform={skew}>
          {/* Épaisseur */}
          <path d="M26 66h150a18 18 0 0 1 18 18v74a18 18 0 0 1-18 18H86l-26 26v-26H26a18 18 0 0 1-18-18V84a18 18 0 0 1 18-18Z" transform="translate(7 7)" opacity={0.35} />
          {/* Bulle */}
          <path
            d="M26 66h150a18 18 0 0 1 18 18v74a18 18 0 0 1-18 18H86l-26 26v-26H26a18 18 0 0 1-18-18V84a18 18 0 0 1 18-18Z"
            fill="currentColor"
            fillOpacity={0.05}
          />
          {/* Icône Discord filaire */}
          <g transform="translate(26 88) scale(2.4)" strokeWidth={1}>
            <path d={discord} />
          </g>
          {/* Lignes du message */}
          <path d="M100 94h72M100 110h56M100 126h64" strokeWidth={1} />
          <path d="M100 150h36" strokeWidth={1} strokeDasharray="1 3" />
          {/* Notification */}
          <circle cx={190} cy={70} r={9} fill="var(--background)" />
          <Led x={190} y={70} r={5.5} />
        </g>
      </g>
    </Illustration>
  );
}
