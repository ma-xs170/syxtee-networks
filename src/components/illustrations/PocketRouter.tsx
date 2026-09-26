import { Illustration, IsoBox, IsoShadow, Label, Led, Screw, Waves, iso } from "./iso";
import { ChipGlyph } from "./PhoneAndroid";

// Routeur 4G de poche avec SIM ou eSIM, qui partage sa connexion en Wi-Fi.
const W = 110;
const D = 70;
const H = 20;

export default function PocketRouter({ className, animated = true }: { className?: string; animated?: boolean }) {
  const [cx, cy] = iso(W / 2, D / 2, H + 8);
  return (
    <Illustration viewBox="-90 -110 210 190" className={className} animated={animated}>
      <IsoShadow at={[-12, -12, 0]} size={[W + 24, D + 24]} />
      <g className="illu-float">
        <IsoBox
          at={[0, 0, 0]}
          size={[W, D, H]}
          r={10}
          top={
            <g strokeWidth={1}>
              <rect x={10} y={10} width={W - 20} height={D - 20} rx={8} opacity={0.5} />
              <ChipGlyph x={20} y={18} s={1} />
              <text x={56} y={40} fontSize={12} stroke="none" fill="var(--foreground)" className="font-mono">
                4G
              </text>
              <Screw x={W - 16} y={16} r={1.6} />
              <Screw x={W - 16} y={D - 16} r={1.6} />
            </g>
          }
          front={
            <g strokeWidth={1}>
              {[0, 1, 2].map((k) => (
                <circle key={k} cx={16 + k * 8} cy={-H / 2} r={1.4} fill="currentColor" />
              ))}
              <Led x={42} y={-H / 2} r={1.5} />
              <rect x={W - 30} y={-H / 2 - 2.5} width={14} height={5} rx={2.5} />
            </g>
          }
          side={<path d={`M10 -${H / 2}H${D - 10}`} strokeWidth={1} strokeDasharray="1 3" />}
        />
        <g strokeWidth={1}>
          <Waves cx={cx} cy={cy} angle={-90} radii={[16, 30, 44]} spread={24} />
        </g>
        <Label x={cx} y={cy - 52} anchor="middle">
          Wi-Fi
        </Label>
      </g>
    </Illustration>
  );
}
