import type { ReactNode } from "react";

// Carte d'interface isolée, sans cadre d'appareil : pour ce qui n'a pas d'écran propre (fiabilité, débit). Léger flottement (illu-float,
// coupé en mouvement réduit). Se pose en superposition d'un visuel avec `className` (position absolue).
export default function FloatingCard({ children, className = "", label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <div role="group" aria-label={label} className={`illu-float rounded-2xl border border-line-strong bg-surface/90 p-4 shadow-[0_30px_60px_-25px_var(--shadow-pop)] backdrop-blur-md ${className}`}>
      {children}
    </div>
  );
}
