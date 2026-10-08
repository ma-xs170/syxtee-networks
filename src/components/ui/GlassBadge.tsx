import type { ReactNode } from "react";

/** Tuile verre pour un glyphe Phosphor (états vides, listes) : carré arrondi sombre, dégradé, reflet et filet clair. Pour les icônes de produit, voir GlassIcon. */
export default function GlassBadge({ children, size = 56 }: { children: ReactNode; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="glass-icon relative inline-flex shrink-0 items-center justify-center rounded-[22%] text-foreground [&>svg]:h-1/2 [&>svg]:w-1/2"
    >
      {children}
    </span>
  );
}
