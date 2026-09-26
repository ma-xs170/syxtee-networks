import a from "./anim.module.css";
import { Illustration, IsoBox, Led, faces, iso } from "./iso";

// Data center filaire à New York : le bâtiment (avec skyline au loin) et le couloir de racks en perspective.

/** Skyline filaire au loin, posée sur la ligne `y`. */
export function Skyline({ y, x0 = -100, x1 = 700 }: { y: number; x0?: number; x1?: number }) {
  const blocks: [number, number, number][] = [];
  let x = x0;
  let i = 0;
  while (x < x1) {
    const w = 18 + ((i * 29) % 26);
    const h = 30 + ((i * 53) % 90) + (i % 7 === 3 ? 70 : 0);
    blocks.push([x, w, h]);
    x += w + 3;
    i++;
  }
  return (
    <g strokeWidth={1} opacity={0.5}>
      {blocks.map(([bx, w, h], k) => (
        <g key={k}>
          <path d={`M${bx} ${y}V${y - h}H${bx + w}V${y}`} />
          {k % 7 === 3 && <path d={`M${bx + w / 2} ${y - h}v-18`} />}
          {k % 3 === 0 && <path d={`M${bx + 5} ${y - h + 10}h${w - 10}M${bx + 5} ${y - h + 20}h${w - 10}`} strokeDasharray="2 3" opacity={0.6} />}
        </g>
      ))}
      <path d={`M${x0} ${y}H${x1}`} opacity={0.8} />
    </g>
  );
}

/** Bâtiment du data center (isométrique) avec climatiseurs sur le toit, LED et enseigne. Origine : coin au sol. */
export function DataCenterBuilding() {
  const W = 220;
  const D = 120;
  const H = 110;
  const m = faces(0, 0, 0, W, D, H);
  return (
    <g>
      <IsoBox
        at={[0, 0, 0]}
        size={[W, D, H]}
        front={
          <g strokeWidth={1}>
            {[0, 1, 2, 3, 4, 5, 6].map((k) => (
              <path key={k} d={`M${14 + k * 30} -18V-${H - 22}`} opacity={0.35} />
            ))}
            <rect x={W / 2 - 18} y={-40} width={36} height={40} />
            <path d={`M${W / 2} -40V0`} />
            {[0, 1, 2, 3].map((k) => (
              <Led key={k} x={24 + k * 54} y={-H + 12} r={1.8} delay={k * 0.4} />
            ))}
          </g>
        }
        side={
          <g strokeWidth={1}>
            {[0, 1, 2, 3].map((k) => (
              <path key={k} d={`M${14 + k * 28} -20V-${H - 20}`} strokeDasharray="1 4" opacity={0.5} />
            ))}
          </g>
        }
      />
      {/* Climatiseurs sur le toit */}
      {[20, 80, 140].map((x) => (
        <IsoBox
          key={x}
          at={[x, 30, H]}
          size={[44, 44, 16]}
          r={2}
          top={
            <g strokeWidth={1}>
              <circle cx={22} cy={22} r={14} />
              <g className={a.spin}>
                <path d="M22 10V34M10 22H34" />
              </g>
            </g>
          }
        />
      ))}
      <g transform={m.front}>
        <text x={W / 2} y={-H - 8} textAnchor="middle" stroke="none" fill="var(--foreground)" fontSize={10} className="font-mono" letterSpacing="0.1em">
          DATA CENTER · NYC
        </text>
      </g>
    </g>
  );
}

/** Couloir de racks en perspective (point de fuite en (vx, vy)). `advance` (0 → 1) : on avance dans le couloir. */
export function RackCorridor({ vx = 300, vy = 290, advance = 0 }: { vx?: number; vy?: number; advance?: number }) {
  const s = 1 + advance * 1.6; // zoom vers le point de fuite
  const rows = [0, 1, 2, 3, 4, 5];
  // Profondeur z : 1 (devant) → 0 (fond). Racks entre 0,1 et 1.
  const P = (x: number, y: number, z: number): [number, number] => [vx + (x - vx) * z, vy + (y - vy) * z];
  const L = 40;
  const R = 560;
  const TOP = 60;
  const BOT = 560;
  const seg = (p: [number, number], q: [number, number]) => `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
  return (
    <g transform={`translate(${vx} ${vy}) scale(${s.toFixed(3)}) translate(${-vx} ${-vy})`}>
      {/* Sol, plafond, chemins de câbles */}
      <path d={seg(P(L, BOT, 1), P(L, BOT, 0.08)) + seg(P(R, BOT, 1), P(R, BOT, 0.08))} strokeWidth={1} opacity={0.5} />
      {[0.35, 0.5, 0.65].map((k) => (
        <g key={k} strokeWidth={1}>
          <path d={seg(P(L + (R - L) * k, TOP, 1), P(L + (R - L) * k, TOP, 0.08))} opacity={0.5} />
          <path d={seg(P(L + (R - L) * k, TOP + 8, 1), P(L + (R - L) * k, TOP + 8, 0.08))} strokeDasharray="3 5" opacity={0.4} />
        </g>
      ))}
      {rows.map((i) => {
        const z0 = 1 - i * 0.15;
        const z1 = z0 - 0.12;
        const racks = [
          [L, L + 120],
          [R - 120, R],
        ];
        return racks.map(([x0, x1], side) => {
          const outer = side === 0 ? x0 : x1;
          const inner = side === 0 ? x1 : x0;
          const a0 = P(inner, TOP + 30, z0);
          const b0 = P(inner, BOT, z0);
          const a1 = P(inner, TOP + 30, z1);
          const b1 = P(inner, BOT, z1);
          const o0 = P(outer, TOP + 30, z0);
          return (
            <g key={`${i}-${side}`} strokeWidth={1} opacity={0.35 + z0 * 0.65}>
              <path d={`${seg(a0, b0)}${seg(a0, a1)}${seg(b0, b1)}${seg(a1, b1)}${seg(o0, a0)}`} fill="currentColor" fillOpacity={0.03} />
              {[0.2, 0.4, 0.6, 0.8].map((k) => {
                const p = P(inner, TOP + 30 + (BOT - TOP - 30) * k, z0);
                const q = P(inner, TOP + 30 + (BOT - TOP - 30) * k, z1);
                return <path key={k} d={seg(p, q)} opacity={0.6} />;
              })}
              {[0.3, 0.55, 0.75].map((k, j) => {
                const [lx, ly] = P(inner, TOP + 30 + (BOT - TOP - 30) * k, z0 - 0.02);
                return (
                  <circle
                    key={k}
                    cx={lx}
                    cy={ly}
                    r={1.6 * z0 + 0.4}
                    fill={j === 1 ? "var(--live)" : "currentColor"}
                    stroke="none"
                    className="led-blink"
                    style={{ animationDelay: `${(i + j + side) * 0.23}s` }}
                  />
                );
              })}
            </g>
          );
        });
      })}
    </g>
  );
}

export default function DataCenter({ className, animated = true }: { className?: string; animated?: boolean }) {
  const [bx, by] = iso(0, 0, 0);
  return (
    <Illustration viewBox="0 60 600 480" className={className} animated={animated}>
      <Skyline y={330} />
      <g transform={`translate(${170 - bx} ${400 - by})`}>
        <DataCenterBuilding />
      </g>
    </Illustration>
  );
}
