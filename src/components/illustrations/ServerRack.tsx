import { Illustration, IsoBox, Led, Screw, SyxteeLogo, iso } from "./iso";

// Le rack du relais SYXTEE : vue de face (plaque lumineuse + logo) et vue éclatée (carte réseau, processeur,
// mémoire tampon, sortie SRT).

/** Rack vu de face, coin haut-gauche en (x, y). `glow` (0 → 1) : la plaque s'illumine. */
export function RackFront({ x, y, w = 200, h = 330, glow = 1 }: { x: number; y: number; w?: number; h?: number; glow?: number }) {
  const units = 6;
  const uh = (h - 110) / units;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={6} fill="currentColor" fillOpacity={0.03} />
      <rect x={8} y={8} width={w - 16} height={h - 16} rx={3} strokeWidth={1} opacity={0.6} />
      {/* Plaque lumineuse */}
      <rect x={16} y={18} width={w - 32} height={62} rx={4} fill="currentColor" fillOpacity={0.05 + glow * 0.12} />
      {glow > 0 && <rect x={10} y={12} width={w - 20} height={74} rx={8} fill="url(#plate-glow)" stroke="none" opacity={glow} />}
      <SyxteeLogo x={28} y={30} w={24} h={34} />
      <text x={62} y={44} stroke="none" fill="var(--foreground)" fontSize={11} className="font-mono" letterSpacing="0.08em">
        SYXTEE NETWORKS
      </text>
      <text x={62} y={62} stroke="none" fill="var(--muted)" fontSize={10} className="font-mono" letterSpacing="0.08em">
        RELAIS NYC
      </text>
      {Array.from({ length: units }, (_, i) => {
        const uy = 94 + i * uh;
        return (
          <g key={i} strokeWidth={1}>
            <rect x={16} y={uy} width={w - 32} height={uh - 6} rx={2} />
            <Screw x={24} y={uy + (uh - 6) / 2} r={1.6} />
            <Screw x={w - 24} y={uy + (uh - 6) / 2} r={1.6} />
            <path d={`M36 ${uy + 8}h${w * 0.35}M36 ${uy + 14}h${w * 0.35}`} strokeDasharray="1 3" />
            <circle cx={w - 50} cy={uy + (uh - 6) / 2} r={1.8} fill="currentColor" stroke="none" className="led-blink" style={{ animationDelay: `${i * 0.3}s` }} />
            <Led x={w - 40} y={uy + (uh - 6) / 2} r={1.8} delay={i * 0.17} />
          </g>
        );
      })}
    </g>
  );
}

export const RACK_LAYERS = ["CARTE RÉSEAU", "PROCESSEUR", "MÉMOIRE TAMPON", "SORTIE SRT"] as const;

/** Vue éclatée iso des composants du serveur. `explode` (0 → 1). Origine : centre au sol. */
export function RackExploded({ explode = 1, labelX = 170 }: { explode?: number; labelX?: number }) {
  const W = 180;
  const D = 110;
  const H = 12;
  const gap = 18 + explode * 62;
  const layers = RACK_LAYERS.map((name, i) => ({ name, z: (RACK_LAYERS.length - 1 - i) * gap }));
  return (
    <g>
      {layers
        .slice()
        .reverse()
        .map(({ name, z }) => {
          const [ax, ay] = iso(W / 2, D, z + H / 2);
          return (
            <g key={name}>
              <IsoBox
                at={[-W / 2, -D / 2, z]}
                size={[W, D, H]}
                r={3}
                top={
                  <g strokeWidth={1}>
                    {name === "CARTE RÉSEAU" && [0, 1, 2, 3].map((k) => <rect key={k} x={16 + k * 30} y={D - 26} width={20} height={12} rx={2} />)}
                    {name === "PROCESSEUR" && (
                      <g>
                        <rect x={W / 2 - 24} y={D / 2 - 24} width={48} height={48} rx={3} fill="currentColor" fillOpacity={0.08} />
                        <path d={`M${W / 2 - 16} ${D / 2 - 16}h32v32h-32Z`} strokeDasharray="2 3" />
                        {[0, 1, 2, 3, 4].map((k) => (
                          <path key={k} d={`M${W / 2 - 20 + k * 10} ${D / 2 - 24}v-6M${W / 2 - 20 + k * 10} ${D / 2 + 24}v6`} />
                        ))}
                      </g>
                    )}
                    {name === "MÉMOIRE TAMPON" && [0, 1, 2, 3, 4, 5].map((k) => <rect key={k} x={20 + k * 24} y={14} width={10} height={D - 28} rx={2} />)}
                    {name === "SORTIE SRT" && (
                      <g>
                        <rect x={W - 50} y={D / 2 - 12} width={30} height={24} rx={4} />
                        <path d={`M20 ${D / 2}H${W - 50}`} strokeDasharray="6 4" />
                      </g>
                    )}
                  </g>
                }
              />
              <g opacity={explode}>
                <path d={`M${ax + 6} ${ay}L${labelX - 8} ${ay}`} strokeWidth={1} strokeDasharray="2 4" opacity={0.6} />
                <text x={labelX} y={ay + 4} stroke="none" fill="var(--foreground)" className="font-mono text-[15px] lg:text-[11px]" letterSpacing="0.06em">
                  {name}
                </text>
              </g>
            </g>
          );
        })}
    </g>
  );
}

export default function ServerRack({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <Illustration viewBox="-10 -10 240 370" className={className} animated={animated}>
      <defs>
        <radialGradient id="plate-glow">
          <stop offset="0" stopColor="var(--foreground)" stopOpacity="0.18" />
          <stop offset="1" stopColor="var(--foreground)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <RackFront x={10} y={10} />
    </Illustration>
  );
}
