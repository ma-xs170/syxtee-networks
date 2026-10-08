import type { ReactNode } from "react";

/** Icône « verre » : carré arrondi sombre, dégradé, reflet et filet clair (CSS pur, aucune image). */
export default function GlassIcon({ children, size = 56 }: { children: ReactNode; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="glass-icon relative inline-flex shrink-0 items-center justify-center rounded-2xl text-foreground [&>svg]:h-1/2 [&>svg]:w-1/2"
    >
      {children}
    </span>
  );
}
