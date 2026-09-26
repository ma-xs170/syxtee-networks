import { useId } from "react";
import a from "./anim.module.css";
import { Illustration } from "./iso";

// Paysage de plage filaire animé (soleil, mer, vagues, palmier, oiseaux) : ce que filme le téléphone.
// `BeachScene` se dessine dans un rectangle (0, 0, w, h) ; à placer dans un écran (téléphone, aperçu OBS…).

export function BeachScene({ w, h }: { w: number; h: number }) {
  const id = useId();
  const sea = h * 0.56;
  const k = Math.min(w, h * 1.8) / 180; // échelle des détails
  const wave = (y: number, amp: number) => {
    let d = `M${-60} ${y}`;
    for (let x = -60; x < w + 60; x += 30) d += `q15 ${-amp} 30 0`;
    return d;
  };
  return (
    <g>
      <defs>
        <clipPath id={`${id}clip`}>
          <rect x={0} y={0} width={w} height={h} rx={Math.min(w, h) * 0.04} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}clip)`} strokeWidth={1}>
        {/* Soleil */}
        <circle cx={w * 0.72} cy={sea - 4 * k} r={11 * k} fill="currentColor" fillOpacity={0.08} />
        {[0, 1, 2, 3, 4].map((i) => {
          const ang = Math.PI * (1.1 + i * 0.2);
          const r0 = 15 * k;
          const r1 = 20 * k;
          const cx = w * 0.72;
          const cy = sea - 4 * k;
          return <path key={i} d={`M${cx + r0 * Math.cos(ang)} ${cy + r0 * Math.sin(ang)}L${cx + r1 * Math.cos(ang)} ${cy + r1 * Math.sin(ang)}`} opacity={0.6} />;
        })}
        {/* Oiseaux */}
        <g className={a.glide} style={{ ["--dx" as string]: `${w * 0.5}px` }} opacity={0.7}>
          <path d={`M${w * 0.18} ${h * 0.2}q${3 * k} ${-3 * k} ${6 * k} 0q${3 * k} ${-3 * k} ${6 * k} 0`} />
          <path d={`M${w * 0.3} ${h * 0.28}q${2 * k} ${-2 * k} ${4 * k} 0q${2 * k} ${-2 * k} ${4 * k} 0`} />
        </g>
        {/* Mer : horizon + vagues qui défilent */}
        <path d={`M0 ${sea}H${w}`} />
        <g className={a.wave}>
          <path d={wave(sea + h * 0.1, 3 * k)} opacity={0.55} />
          <path d={wave(sea + h * 0.2, 4 * k)} opacity={0.35} strokeDasharray="4 6" />
        </g>
        {/* Plage */}
        <path d={`M0 ${h * 0.86}Q${w * 0.45} ${h * 0.74} ${w} ${h * 0.84}`} fill="currentColor" fillOpacity={0.05} />
        <path d={`M${w * 0.55} ${h * 0.9}h${4 * k}M${w * 0.68} ${h * 0.94}h${3 * k}M${w * 0.8} ${h * 0.9}h${5 * k}`} opacity={0.5} />
        {/* Palmier qui se balance */}
        <g className={a.sway}>
          <path d={`M${w * 0.16} ${h * 0.88}Q${w * 0.14} ${h * 0.6} ${w * 0.22} ${h * 0.34}`} strokeWidth={1.25} />
          {[
            [-16, 4],
            [-10, -6],
            [4, -8],
            [14, -2],
            [16, 8],
          ].map(([dx, dy], i) => (
            <path
              key={i}
              d={`M${w * 0.22} ${h * 0.34}q${(dx * k) / 2} ${dy * k - 6 * k} ${dx * k} ${dy * k + 4 * k}`}
            />
          ))}
        </g>
      </g>
      <rect x={0} y={0} width={w} height={h} rx={Math.min(w, h) * 0.04} strokeWidth={1} opacity={0.4} />
    </g>
  );
}

export default function BeachView({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <Illustration viewBox="-4 -4 328 188" className={className} animated={animated}>
      <BeachScene w={320} h={180} />
    </Illustration>
  );
}
