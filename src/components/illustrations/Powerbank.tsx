import { Illustration, IsoBox, IsoShadow, Led, iso, wavy } from "./iso";
import { FlatMini } from "./StarlinkMiniBag";

// Powerbank USB-C PD 100 W reliée au Mini par un câble qui ondule.
const W = 120;
const D = 70;
const H = 26;

export default function Powerbank({ className, animated = true }: { className?: string; animated?: boolean }) {
  // Port USB-C sur la face avant, et prise du Mini
  const [ux, uy] = iso(22, D - 10, H / 2);
  const [mx, my] = iso(150, 0, 3);
  return (
    <Illustration viewBox="-60 -110 350 290" className={className} animated={animated}>
      <IsoShadow at={[-16, -16, 0]} size={[W + 32, D + 32]} />
      <FlatMini at={[150, -70, 0]} w={96} d={84} />

      {/* Câble USB-C → Mini */}
      <path d={wavy([ux, uy + 6], [mx, my], 3, 7)} strokeWidth={1} />
      <path d={`M${ux} ${uy}v6`} strokeWidth={3} />

      <g className="illu-float">
        <IsoBox
          at={[0, 0, 0]}
          size={[W, D, H]}
          r={8}
          top={
            <g strokeWidth={1}>
              <rect x={8} y={8} width={W - 16} height={D - 16} rx={6} opacity={0.5} />
              <path d="M40 18l-10 16h11l-10 16" strokeWidth={1.25} />
              <text x={54} y={40} fontSize={15} stroke="none" fill="var(--foreground)" className="font-mono" letterSpacing="0.04em">
                100 W
              </text>
            </g>
          }
          front={
            <g strokeWidth={1}>
              <rect x={14} y={-H / 2 - 3} width={16} height={6} rx={3} />
              <text x={36} y={-H / 2 + 2.5} fontSize={6} stroke="none" fill="var(--muted)" className="font-mono">
                USB-C PD
              </text>
              {[0, 1, 2].map((k) => (
                <circle key={k} cx={W - 36 + k * 7} cy={-H / 2} r={1.4} fill="currentColor" />
              ))}
              <Led x={W - 12} y={-H / 2} r={1.6} />
            </g>
          }
          side={<path d={`M10 -${H / 2}H${D - 10}`} strokeWidth={1} strokeDasharray="1 3" />}
        />
      </g>
    </Illustration>
  );
}
