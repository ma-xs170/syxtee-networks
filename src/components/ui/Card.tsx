import type { ReactNode } from "react";

// Carte du design system : bordure fine, rayon 16 px, léger halo radial en haut. Aucune ombre lourde.
export function Card({ title, right, children, className = "", id }: { title?: ReactNode; right?: ReactNode; children?: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`card ${className}`}>
      {(title || right) && (
        <header className="mb-5 flex items-center justify-between gap-4">
          {title && <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>}
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

/** Pied de carte séparé par une ligne pleine largeur (boutons d'enregistrement). */
export function CardFooter({ children }: { children: ReactNode }) {
  return <div className="-mx-6 mt-6 flex items-center justify-end gap-3 border-t border-line px-6 pt-5">{children}</div>;
}
