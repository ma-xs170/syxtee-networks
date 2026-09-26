import { Illustration, IsoBox, IsoShadow, Led, isoPath } from "./iso";

// Écran d'ordinateur avec une interface type OBS : aperçu, liste de scènes, point LIVE, vumètre.
const W = 220;
const D = 12;
const H = 140;
const Z = 70; // hauteur du bas de l'écran (pied)
const scenes = ["IRL", "BRB", "Pause", "Fin"];

export default function ObsScreen({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <Illustration viewBox="-25 -235 300 335" className={className} animated={animated}>
      <IsoShadow at={[40, -30, 0]} size={[140, 70]} />
      <g className="illu-float">
        {/* Pied */}
        <IsoBox at={[70, -14, 0]} size={[80, 40, 4]} r={3} />
        <path d={isoPath([[104, 4, 4], [104, 4, Z], [116, 4, Z], [116, 4, 4]])} fill="currentColor" fillOpacity={0.04} />
        <IsoBox
          at={[0, -D / 2, Z]}
          size={[W, D, H]}
          r={6}
          front={
            <g strokeWidth={1}>
              {/* Dalle */}
              <rect x={8} y={-H + 8} width={W - 16} height={H - 16} rx={3} />
              {/* Aperçu : montagnes + streamer */}
              <rect x={16} y={-H + 16} width={134} height={76} rx={2} />
              <path d={`M16 ${-H + 78}L46 ${-H + 56}L66 ${-H + 70}L92 ${-H + 44}L124 ${-H + 72}L150 ${-H + 60}`} />
              <circle cx={112} cy={-H + 40} r={4} />
              <path d={`M112 ${-H + 44}V${-H + 58}M112 ${-H + 48}L102 ${-H + 38}`} />
              <Led x={24} y={-H + 23} r={2} />
              <text x={30} y={-H + 26} fontSize={7} stroke="none" fill="var(--foreground)" className="font-mono" letterSpacing="0.08em">
                LIVE
              </text>
              {/* Scènes */}
              <text x={158} y={-H + 22} fontSize={6.5} stroke="none" fill="var(--muted)" className="font-mono" letterSpacing="0.08em">
                SCÈNES
              </text>
              {scenes.map((s, i) => (
                <g key={s}>
                  <rect x={158} y={-H + 27 + i * 14} width={46} height={11} rx={1.5} fill="currentColor" fillOpacity={i === 0 ? 0.12 : 0} />
                  <text x={162} y={-H + 34.5 + i * 14} fontSize={6.5} stroke="none" fill={i === 0 ? "var(--foreground)" : "var(--muted)"} className="font-mono">
                    {s}
                  </text>
                </g>
              ))}
              {/* Vumètre + bouton */}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => (
                <path key={k} d={`M${18 + k * 7} -34V${-26 - (k < 7 ? 0 : 0)}`} opacity={k < 7 ? 1 : 0.3} />
              ))}
              <rect x={100} y={-38} width={50} height={14} rx={7} />
              <text x={125} y={-28.5} textAnchor="middle" fontSize={6.5} stroke="none" fill="var(--foreground)" className="font-mono">
                SRT
              </text>
              <rect x={158} y={-38} width={46} height={14} rx={7} fill="currentColor" fillOpacity={0.12} />
            </g>
          }
          side={<path d={`M4 ${-H + 20}V-20`} strokeWidth={1} strokeDasharray="1 3" />}
        />
      </g>
    </Illustration>
  );
}
