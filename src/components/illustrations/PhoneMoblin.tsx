import { Illustration, IsoBox, Label, Led, Waves, iso } from "./iso";

// iPhone sur perche avec une interface de live simplifiée (LIVE, bitrate) et 3 ondes : 4G, 5G, Wi-Fi.
const W = 70;
const D = 8;
const H = 140;
const Z = 150; // bas du téléphone

export default function PhoneMoblin({
  className,
  animated = true,
  waves = true,
}: {
  className?: string;
  animated?: boolean;
  waves?: boolean;
}) {
  const [cx, cy] = iso(W / 2, D / 2, Z + H + 6);
  return (
    <Illustration viewBox="-115 -365 250 320" className={className} animated={animated}>
      <g className="illu-float">
        {/* Perche télescopique, pince derrière le téléphone */}
        <path d={`M${iso(W / 2, -6, Z + 40).join(" ")}L${iso(W / 2, -6, 70).join(" ")}`} />
        <path d={`M${iso(W / 2, -6, 110).join(" ")}L${iso(W / 2, -6, 70).join(" ")}`} strokeWidth={3} />
        <IsoBox at={[W / 2 - 10, -14, Z + 30]} size={[20, 8, 50]} r={2} />

        <IsoBox
          at={[0, 0, Z]}
          size={[W, D, H]}
          r={9}
          front={
            <g strokeWidth={1}>
              <rect x={4} y={-H + 4} width={W - 8} height={H - 8} rx={7} />
              <rect x={W / 2 - 10} y={-H + 8} width={20} height={5} rx={2.5} fill="currentColor" fillOpacity={0.15} />
              {/* En-tête : LIVE + bitrate */}
              <Led x={11} y={-H + 22} r={1.8} />
              <text x={15} y={-H + 24.5} fontSize={6.5} stroke="none" fill="var(--foreground)" className="font-mono">
                LIVE
              </text>
              <text x={W - 9} y={-H + 24.5} textAnchor="end" fontSize={6} stroke="none" fill="var(--muted)" className="font-mono">
                6,0 Mb/s
              </text>
              {/* Aperçu caméra */}
              <path d={`M8 ${-H + 70}L22 ${-H + 54}L32 ${-H + 62}L46 ${-H + 44}L62 ${-H + 64}`} />
              <circle cx={50} cy={-H + 38} r={3.5} />
              {/* Débit par connexion */}
              {[
                ["4G", 30],
                ["5G", 44],
                ["WI", 22],
              ].map(([l, w], i) => (
                <g key={l}>
                  <text x={9} y={-44 + i * 9} fontSize={5.5} stroke="none" fill="var(--muted)" className="font-mono">
                    {l}
                  </text>
                  <path d={`M20 ${-46 + i * 9}H${20 + Number(w)}`} strokeWidth={2} />
                </g>
              ))}
              {/* Bouton */}
              <circle cx={W / 2} cy={-15} r={6} />
              <circle cx={W / 2} cy={-15} r={3} fill="var(--live)" stroke="none" />
            </g>
          }
          side={<path d="M2 -100v-14M2 -80v-8" strokeWidth={1.5} />}
        />

        {waves && (
          <g strokeWidth={1}>
            <Waves cx={cx} cy={cy} angle={-145} radii={[22, 40, 58]} spread={15} />
            <Waves cx={cx} cy={cy} angle={-90} radii={[22, 40, 58]} spread={15} delay={0.3} />
            <Waves cx={cx} cy={cy} angle={-35} radii={[22, 40, 58]} spread={15} delay={0.6} />
            <Label x={cx - 62} y={cy - 40} anchor="middle">4G</Label>
            <Label x={cx} y={cy - 68} anchor="middle">5G</Label>
            <Label x={cx + 62} y={cy - 40} anchor="middle">Wi-Fi</Label>
          </g>
        )}
      </g>
    </Illustration>
  );
}
