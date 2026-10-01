import a from "./anim.module.css";
import { Illustration } from "./iso";

// Câble sous-marin en fibre optique, vue en coupe de l'océan (repère 600 × 600).
// `section` (0 → 1) : zoom sur la coupe transversale du câble. `fish` : nombre de poissons (moins sur mobile).

const SEABED = "M-40 470 L40 452 L110 468 L170 440 L240 462 L300 455 L370 478 L430 446 L500 466 L560 450 L640 470";
export const CABLE = "M-40 486 C80 470 160 488 260 474 S460 484 640 470";

function Fish({ y, s = 1, delay = 0, dx = 900 }: { y: number; s?: number; delay?: number; dx?: number }) {
  return (
    <g className={a.swim} style={{ animationDelay: `${delay}s`, ["--dx" as string]: `${dx}px` }}>
      <g transform={`translate(0 ${y}) scale(${s})`} strokeWidth={1}>
        <path d="M0 0c8 -9 22 -9 30 0c-8 9 -22 9 -30 0Z" fill="currentColor" fillOpacity={0.05} />
        <path d="M0 0l-9 -7v14Z" />
        <circle cx={23} cy={-1.5} r={1.2} fill="currentColor" stroke="none" />
      </g>
    </g>
  );
}

function Ray({ y, delay = 0 }: { y: number; delay?: number }) {
  return (
    <g className={a.swim} style={{ animationDuration: "34s", animationDelay: `${delay}s`, ["--dx" as string]: "900px" }}>
      <g transform={`translate(0 ${y})`} strokeWidth={1}>
        <path d="M0 0c14 -4 26 -22 44 -24c-4 12 2 20 14 24c-12 4 -18 12 -14 24c-18 -2 -30 -20 -44 -24Z" fill="currentColor" fillOpacity={0.04} />
        <path d="M0 0c-16 1 -30 4 -44 10" strokeDasharray="2 3" />
      </g>
    </g>
  );
}

/** Coupe transversale : gaine, armure, fibres optiques avec impulsions de lumière. */
export function CableSection({ cx, cy, r, labels = true }: { cx: number; cy: number; r: number; labels?: boolean }) {
  const armor = 22;
  const fibers = [0, 1, 2, 3, 4, 5, 6, 7];
  const label = (x2: number, y2: number, ax: number, ay: number, text: string, anchor: "start" | "end") => (
    <g>
      <path d={`M${ax} ${ay}L${x2} ${y2}H${x2 + (anchor === "start" ? 16 : -16)}`} strokeWidth={1} strokeDasharray="2 3" opacity={0.7} />
      <text
        x={x2 + (anchor === "start" ? 22 : -22)}
        y={y2 + 4}
        textAnchor={anchor}
        stroke="none"
        fill="var(--foreground)"
        className="font-mono text-[16px] lg:text-[12px]"
        letterSpacing="0.06em"
      >
        {text}
      </text>
    </g>
  );
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="var(--background)" />
      <circle cx={cx} cy={cy} r={r} fill="currentColor" fillOpacity={0.04} />
      <circle cx={cx} cy={cy} r={r * 0.86} strokeWidth={1} />
      {Array.from({ length: armor }, (_, i) => {
        const ang = (i / armor) * Math.PI * 2;
        return <circle key={i} cx={cx + r * 0.72 * Math.cos(ang)} cy={cy + r * 0.72 * Math.sin(ang)} r={r * 0.09} strokeWidth={1} />;
      })}
      <circle cx={cx} cy={cy} r={r * 0.56} strokeWidth={1} />
      <circle cx={cx} cy={cy} r={r * 0.34} strokeWidth={1} fill="currentColor" fillOpacity={0.05} />
      {fibers.map((i) => {
        const ang = (i / fibers.length) * Math.PI * 2;
        const fx = cx + r * 0.2 * Math.cos(ang);
        const fy = cy + r * 0.2 * Math.sin(ang);
        return (
          <circle
            key={i}
            cx={fx}
            cy={fy}
            r={r * 0.05}
            fill="currentColor"
            className={a.blink}
            style={{ animationDelay: `${i * 0.11}s`, animationDuration: "0.5s" }}
            stroke="none"
          />
        );
      })}
      {labels && (
        <g>
          {label(cx + r * 1.15, cy - r * 0.95, cx + r * 0.62, cy - r * 0.62, "GAINE", "start")}
          {label(cx + r * 1.15, cy + r * 0.9, cx + r * 0.52, cy + r * 0.5, "ARMURE", "start")}
          {label(cx - r * 1.15, cy + r * 0.95, cx - r * 0.14, cy + r * 0.14, "FIBRES OPTIQUES", "end")}
        </g>
      )}
    </g>
  );
}

/** L'océan en coupe : ligne d'eau (en haut à `surface`), fond, câble avec impulsions, faune, échelle de profondeur. */
export function OceanScene({ surface = 60, fish = 4, bubbles = 6 }: { surface?: number; fish?: number; bubbles?: number }) {
  const depth = (
    <defs>
      <radialGradient id="depth-light" cx="0.5" cy="0" r="1">
        <stop offset="0" stopColor="var(--foreground)" stopOpacity="0.05" />
        <stop offset="0.7" stopColor="var(--foreground)" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
  const wave = () => {
    let d = `M-60 ${surface}`;
    for (let x = -60; x < 700; x += 30) d += "q15 -6 30 0";
    return d;
  };
  return (
    <g>
      {depth}
      {/* Lumière qui décroît avec la profondeur */}
      <ellipse cx={300} cy={surface} rx={520} ry={300} fill="url(#depth-light)" stroke="none" />
      <g className={a.wave}>
        <path d={wave()} strokeWidth={1.25} />
        <path d={wave().replace(`M-60 ${surface}`, `M-45 ${surface + 8}`)} strokeWidth={1} opacity={0.35} strokeDasharray="3 6" />
      </g>

      {/* Échelle de profondeur */}
      <g strokeWidth={1} opacity={0.7}>
        <path d={`M24 ${surface + 30}V440`} strokeDasharray="1 5" />
        {[
          [200, "-1 000 m"],
          [400, "-3 000 m"],
        ].map(([y, l]) => (
          <g key={String(l)}>
            <path d={`M20 ${y}h8`} />
            <text x={34} y={Number(y) + 4} stroke="none" fill="var(--muted)" className="font-mono text-[14px] lg:text-[10px]">
              {l}
            </text>
          </g>
        ))}
      </g>

      {/* Faune */}
      {Array.from({ length: fish }, (_, i) => (
        <Fish key={i} y={150 + ((i * 97) % 220)} s={0.7 + ((i * 37) % 5) / 10} delay={-i * 5.5} dx={820} />
      ))}
      <Ray y={330} delay={-8} />
      {Array.from({ length: bubbles }, (_, i) => (
        <circle
          key={i}
          cx={90 + ((i * 131) % 440)}
          cy={430}
          r={1.5 + (i % 3)}
          strokeWidth={1}
          className={a.bubble}
          style={{ animationDelay: `${-i * 1.1}s` }}
        />
      ))}

      {/* Fond marin et câble */}
      <path d={SEABED} strokeWidth={1} opacity={0.7} />
      <path d={CABLE} strokeWidth={3} />
      <path d={CABLE} strokeWidth={1.5} stroke="currentColor" className={a.pulse} />
    </g>
  );
}

export default function SubseaCable({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <Illustration viewBox="0 40 600 520" className={className} animated={animated}>
      <OceanScene />
      <CableSection cx={330} cy={250} r={70} />
    </Illustration>
  );
}
