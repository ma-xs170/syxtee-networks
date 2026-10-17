import type { ReactNode } from "react";

// Émoticône décorative, statique (plus d'animation : pas de bibliothèque de mouvement dans les formulaires).
export default function AnimatedEmoji({ children, className = "" }: { children: string; kind?: string; className?: string }): ReactNode {
  return (
    <span aria-hidden="true" className={`inline-block select-none ${className}`}>
      {children}
    </span>
  );
}
