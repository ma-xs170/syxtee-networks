// Ondes qui partent d'une source (Wi-Fi, 4G/5G…) : arcs en pointillés qui s'élargissent (.wave-out).

/** Arc d'onde centré sur (cx, cy), orienté vers `angle` (degrés), d'ouverture ±spread. */
export function waveArc(cx: number, cy: number, r: number, angle: number, spread: number) {
  const a0 = ((angle - spread) * Math.PI) / 180;
  const a1 = ((angle + spread) * Math.PI) / 180;
  const f = (n: number) => n.toFixed(1);
  return `M${f(cx + r * Math.cos(a0))} ${f(cy + r * Math.sin(a0))}A${r} ${r} 0 0 1 ${f(cx + r * Math.cos(a1))} ${f(cy + r * Math.sin(a1))}`;
}

/** Angle (degrés) de la source (x0, y0) vers la cible (x1, y1). */
export const aim = (x0: number, y0: number, x1: number, y1: number) => (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;

export default function WifiWaves({
  cx,
  cy,
  radii,
  angle,
  spread,
  dash = "3 4",
}: {
  cx: number;
  cy: number;
  radii: readonly number[];
  angle: number;
  spread: number;
  dash?: string;
}) {
  return (
    <>
      {radii.map((r, i) => {
        const d = waveArc(cx, cy, r, angle, spread);
        return (
          <path
            key={d}
            d={d}
            className="wave-out"
            strokeDasharray={dash}
            style={{ transformOrigin: `${cx}px ${cy}px`, animationDelay: `${i * 0.8}s` }}
          />
        );
      })}
    </>
  );
}
