import type { ReactNode } from "react";
import { Illustration, IsoBox, Label, Led, Waves, iso } from "./iso";

// 2e téléphone (Android) dédié au bonding, avec une eSIM data.
// `screen` : ce qu'affiche l'écran — l'app Moblink connectée, l'app eSIM (forfait), les données mobiles, ou la puce eSIM.
const W = 70;
const D = 8;
const H = 140;
const Z = 0;

export type AndroidScreen = "moblink" | "plan" | "data" | "esim";

/** Puce eSIM filaire (coin coupé, contacts), dessinée dans le plan d'une face. `lit` : elle s'illumine. */
export function ChipGlyph({ x, y, s = 1, lit = true }: { x: number; y: number; s?: number; lit?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={1}>
      {lit && <rect x={-3} y={-3} width={30} height={36} rx={6} fill="currentColor" className="wifi-pulse" fillOpacity={0.18} stroke="none" />}
      <path d="M0 0h16l8 8v22H0Z" fill="currentColor" fillOpacity={lit ? 0.12 : 0.04} />
      <rect x={4} y={10} width={16} height={14} rx={2} />
      <path d="M12 10v14M4 17h16" />
    </g>
  );
}

function Screen({ screen, lit }: { screen: AndroidScreen; lit: boolean }) {
  const t = (x: number, y: number, s: string, strong = false, size = 5.5): ReactNode => (
    <text x={x} y={y} fontSize={size} stroke="none" fill={strong ? "var(--foreground)" : "var(--muted)"} className="font-mono">
      {s}
    </text>
  );
  switch (screen) {
    case "moblink":
      return (
        <g>
          {t(9, -H + 26, "MOBLINK", true, 6.5)}
          <circle cx={W / 2} cy={-H + 58} r={14} />
          <path d={`M${W / 2 - 7} ${-H + 58}l5 5l9 -10`} strokeWidth={1.5} />
          {t(10, -H + 86, "Connected", true)}
          {t(10, -H + 94, "to streamer")}
          <ChipGlyph x={9} y={-38} s={0.7} lit={lit} />
          {t(30, -24, "eSIM")}
          <Led x={W - 12} y={-29} r={1.6} />
        </g>
      );
    case "plan":
      return (
        <g>
          {t(9, -H + 26, "eSIM DATA", true, 6.5)}
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={8} y={-H + 34 + i * 18} width={W - 16} height={13} rx={3} fill="currentColor" fillOpacity={i === 1 ? 0.14 : 0} />
              <circle cx={15} cy={-H + 40.5 + i * 18} r={2.5} />
              <path d={`M22 ${-H + 40.5 + i * 18}h${16 + ((i * 7) % 12)}`} />
            </g>
          ))}
          <rect x={10} y={-30} width={W - 20} height={14} rx={7} fill="currentColor" fillOpacity={0.12} />
          {t(W / 2 - 11, -21, "Choisir", true)}
        </g>
      );
    case "data":
      return (
        <g>
          {t(9, -H + 26, "RÉSEAU", true, 6.5)}
          {[
            ["Données", true],
            ["eSIM data", true],
            ["Itinérance", false],
          ].map(([l, on], i) => (
            <g key={String(l)}>
              {t(9, -H + 48 + i * 20, String(l))}
              <rect x={W - 24} y={-H + 43 + i * 20} width={14} height={8} rx={4} fill="currentColor" fillOpacity={on ? 0.3 : 0} />
              <circle cx={on ? W - 14 : W - 20} cy={-H + 47 + i * 20} r={2.6} fill="currentColor" />
            </g>
          ))}
          <path d="M14 -30h4v-4M22 -30v-8M26 -30v-12M30 -30v-16" strokeWidth={1.5} />
          {t(38, -30, "4G", true)}
        </g>
      );
    case "esim":
      return (
        <g>
          {t(9, -H + 26, "eSIM", true, 6.5)}
          <ChipGlyph x={W / 2 - 18} y={-H + 44} s={1.5} lit={lit} />
          {t(12, -30, "Compatible ?")}
        </g>
      );
  }
}

/** Le dessin seul (<g>), dans le repère de l'illustration (viewBox "-100 -215 210 250"). `lit` : la puce eSIM s'illumine. */
export function AndroidDrawing({ screen = "moblink", waves = false, lit = true }: { screen?: AndroidScreen; waves?: boolean; lit?: boolean }) {
  const [cx, cy] = iso(W / 2, D / 2, Z + H + 6);
  return (
    <g>
        <IsoBox
          at={[0, 0, Z]}
          size={[W, D, H]}
          r={7}
          front={
            <g strokeWidth={1}>
              <rect x={4} y={-H + 4} width={W - 8} height={H - 8} rx={5} />
              <circle cx={W / 2} cy={-H + 10} r={2} />
              <Screen screen={screen} lit={lit} />
              <path d={`M${W / 2 - 10} -8h20`} opacity={0.6} />
            </g>
          }
          side={<path d="M2 -110v-16M2 -92v-8" strokeWidth={1.5} />}
        />
        {waves && (
          <g strokeWidth={1}>
            <Waves cx={cx} cy={cy} angle={-90} radii={[18, 32, 46]} spread={18} />
            <Label x={cx} y={cy - 54} anchor="middle">
              4G · eSIM
            </Label>
          </g>
        )}
    </g>
  );
}

export default function PhoneAndroid({
  className,
  animated = true,
  screen = "moblink",
  waves = false,
}: {
  className?: string;
  animated?: boolean;
  screen?: AndroidScreen;
  waves?: boolean;
}) {
  return (
    <Illustration viewBox="-100 -215 210 250" className={className} animated={animated}>
      <g className="illu-float">
        <AndroidDrawing screen={screen} waves={waves} />
      </g>
    </Illustration>
  );
}
