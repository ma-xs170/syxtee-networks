import { Illustration, IsoBox, IsoShadow, Led, Screw, Waves, iso, wavy } from "./iso";

// Baie serveur du relais SYXTEE (New York) : unités rackées, LED d'activité, aérations, vis.
const W = 120;
const D = 90;
const H = 190;
const units = [0, 1, 2, 3];

function RackUnit({ i }: { i: number }) {
  const y = -(18 + i * 38) - 30; // haut de l'unité (repère de la face avant)
  return (
    <g>
      <rect x={8} y={y} width={W - 16} height={30} rx={2} />
      <Screw x={14} y={y + 7} r={1.6} />
      <Screw x={14} y={y + 23} r={1.6} />
      <Screw x={W - 14} y={y + 7} r={1.6} />
      <Screw x={W - 14} y={y + 23} r={1.6} />
      {/* Grille d'aération */}
      {[0, 1, 2, 3].map((k) => (
        <path key={k} d={`M24 ${y + 8 + k * 5}H62`} strokeWidth={1} strokeDasharray="1 3" />
      ))}
      <rect x={70} y={y + 11} width={16} height={8} rx={1.5} strokeWidth={1} />
      <circle cx={94} cy={y + 15} r={1.8} strokeWidth={1} />
      <Led x={100} y={y + 15} r={1.8} delay={i * 0.35} />
    </g>
  );
}

export default function RelayServer({ className, animated = true }: { className?: string; animated?: boolean }) {
  const [wx, wy] = iso(W / 2, D / 2, H + 10);
  return (
    <Illustration viewBox="-140 -275 280 340" className={className} animated={animated}>
      <IsoShadow at={[-W / 2 - 16, -D / 2 - 16, 0]} size={[W + 32, D + 32]} />

      {/* Câbles qui ondulent vers le réseau */}
      <path d={wavy(iso(W / 2, 0, 24), [118, 40], 3, 5)} strokeWidth={1} opacity={0.7} />
      <path d={wavy(iso(W / 2, -20, 40), [122, 18], 3, 4)} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />

      <g className="illu-float">
        <IsoBox
          at={[-W / 2, -D / 2, 0]}
          size={[W, D, H]}
          r={4}
          top={
            <g strokeWidth={1}>
              {[0, 1, 2, 3, 4, 5].map((k) => (
                <path key={k} d={`M20 ${18 + k * 10}H${W - 20}`} strokeDasharray="1 3" />
              ))}
            </g>
          }
          front={
            <g>
              {units.map((i) => (
                <RackUnit key={i} i={i} />
              ))}
              {/* Plaque d'identification */}
              <rect x={8} y={-H + 8} width={W - 16} height={18} rx={2} strokeWidth={1} />
              <text x={W / 2} y={-H + 20.5} textAnchor="middle" fontSize={9} stroke="none" fill="var(--foreground)" className="font-mono" letterSpacing="0.08em">
                SYXTEE · NYC
              </text>
            </g>
          }
          side={
            <g strokeWidth={1}>
              {[0, 1, 2, 3, 4, 5, 6].map((k) => (
                <path key={k} d={`M${16 + k * 9} -30V-${H - 30}`} strokeDasharray="2 4" opacity={0.6} />
              ))}
            </g>
          }
        />
        <g strokeWidth={1}>
          <Waves cx={wx} cy={wy} angle={-90} radii={[16, 30, 44]} spread={30} />
        </g>
      </g>
    </Illustration>
  );
}
