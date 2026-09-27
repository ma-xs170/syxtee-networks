import type { ReactNode } from "react";

// Lieux filaires du SYXTEE PRO (défilé de la scène « Partout » et version statique). Repère 200 × 130 par lieu.

function Place({ label, children, fluid = false }: { label: string; children: ReactNode; fluid?: boolean }) {
  return (
    <figure className={`flex flex-col items-center gap-3 ${fluid ? "w-full max-w-[200px]" : "w-[200px] shrink-0"}`}>
      <svg
        viewBox="0 0 200 130"
        className="svg-hairline h-auto w-full text-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
        <path d="M6 124H194" opacity={0.3} />
      </svg>
      <figcaption className="font-mono text-[10px] tracking-[0.14em] text-muted">{label}</figcaption>
    </figure>
  );
}

export const places = [
  {
    label: "VILLE",
    art: (
      <>
        <path d="M14 124V64H44V124M44 124V34H78V124M78 124V78H104V124M104 124V50H138V124M138 124V70H160V124M160 124V42H186V124" />
        {[48, 60, 72, 84, 96, 108].map((y) => (
          <path key={y} d={`M52 ${y}H58M64 ${y}H70M112 ${y}H118M124 ${y}H130M166 ${y}H172M176 ${y}H180`} opacity={0.45} />
        ))}
        <path d="M61 34V20" />
      </>
    ),
  },
  {
    label: "MONTAGNE",
    art: (
      <>
        <path d="M8 124L70 36L104 84L130 52L192 124" />
        <path d="M58 53L70 36L82 53L74 50L66 56Z" />
        <path d="M122 62L130 52L140 64" />
        <path d="M30 124L56 96L72 112" opacity={0.4} />
      </>
    ),
  },
  {
    label: "EN MER",
    art: (
      <>
        <path d="M44 88H156L142 108H58Z" />
        <path d="M70 88V70H112V88M84 70V58H100V70" />
        <path d="M100 58V38" />
        <path d="M8 116Q24 108 40 116T72 116T104 116T136 116T168 116T200 116" opacity={0.6} />
        <path d="M20 124Q36 118 52 124T84 124" opacity={0.35} />
      </>
    ),
  },
  {
    label: "FESTIVAL",
    art: (
      <>
        <path d="M30 124V30H170V124M30 30L170 30M30 44H170" />
        <path d="M30 30L44 44L58 30L72 44L86 30L100 44L114 30L128 44L142 30L156 44L170 30" opacity={0.4} />
        <path d="M60 44L40 110M100 44V110M140 44L160 110" opacity={0.3} strokeDasharray="2 4" />
        {[40, 56, 72, 88, 104, 120, 136, 152].map((x, i) => (
          <circle key={x} cx={x} cy={116 - (i % 2) * 4} r={4} />
        ))}
      </>
    ),
  },
  {
    label: "DÉSERT",
    art: (
      <>
        <circle cx={150} cy={40} r={16} />
        <path d="M6 110Q50 82 96 104T194 96" />
        <path d="M6 124Q70 100 120 118T194 114" opacity={0.5} />
        <path d="M54 100V62M54 78H44V66M54 72H64V60" />
      </>
    ),
  },
  {
    label: "HÉLICOPTÈRE*",
    art: (
      <>
        <path d="M24 32H176" />
        <path d="M100 32V44" />
        <path d="M60 60Q64 44 100 44H116Q138 44 140 66Q140 84 116 84H78Q60 84 60 60Z" />
        <path d="M118 48Q134 52 136 64H118Z" opacity={0.6} />
        <path d="M60 64H18L12 54" />
        <path d="M10 48V60" />
        <path d="M76 84V96M120 84V96M62 96H136" />
      </>
    ),
  },
];

export function PlacesRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex gap-10 ${className}`}>
      {places.map((pl) => (
        <Place key={pl.label} label={pl.label}>
          {pl.art}
        </Place>
      ))}
    </div>
  );
}

/** Grille statique (prefers-reduced-motion). */
export function PlacesGrid() {
  return (
    <div className="grid h-full grid-cols-2 content-center justify-items-center gap-6 sm:grid-cols-3">
      {places.map((pl) => (
        <Place key={pl.label} label={pl.label} fluid>
          {pl.art}
        </Place>
      ))}
    </div>
  );
}
