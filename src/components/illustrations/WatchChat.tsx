import { Illustration, Led } from "./iso";

// Apple Watch en filaire, légèrement inclinée : bracelet, couronne, et le chat du live qui défile sur l'écran.
const MSGS: [string, number][] = [
  ["gg", 18],
  ["trop fort", 34],
  ["quel spot !", 28],
  ["❤", 10],
];

export default function WatchChat({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <Illustration viewBox="0 0 160 220" className={className} animated={animated}>
      <g className="illu-float">
        <g transform="rotate(-12 80 110)">
          {/* Bracelet */}
          <path d="M52 56 L56 8 H104 L108 56" fill="currentColor" fillOpacity={0.04} />
          <path d="M52 164 L56 212 H104 L108 164" fill="currentColor" fillOpacity={0.04} />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={80} cy={22 + i * 11} r={1.6} strokeOpacity={0.5} />
          ))}
          {/* Boîtier, couronne et bouton */}
          <rect x={42} y={52} width={76} height={116} rx={22} fill="currentColor" fillOpacity={0.06} />
          <rect x={47} y={57} width={66} height={106} rx={17} />
          <rect x={118} y={84} width={6} height={18} rx={3} />
          <rect x={118} y={112} width={4} height={12} rx={2} strokeOpacity={0.6} />
          {/* Écran : heure, LIVE, messages */}
          <text x={54} y={76} fontSize={7} stroke="none" fill="var(--muted)" className="font-mono">12:13</text>
          <Led x={96} y={73.5} r={2} />
          <text x={100} y={76} fontSize={6} stroke="none" fill="var(--foreground)" className="font-mono">LIVE</text>
          {MSGS.map(([t, w], i) => (
            <g key={t}>
              <rect x={54} y={86 + i * 17} width={4} height={10} rx={1} fill="currentColor" fillOpacity={0.35} stroke="none" />
              <path d={`M62 ${91 + i * 17}H${62 + w * 1.4}`} strokeWidth={2} strokeOpacity={0.55} />
              <text x={62} y={99 + i * 17} fontSize={5} stroke="none" fill="var(--muted)" className="font-mono">{t}</text>
            </g>
          ))}
        </g>
      </g>
    </Illustration>
  );
}
