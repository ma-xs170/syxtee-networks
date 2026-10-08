import type { ReactNode } from "react";

// Symbole au trait avant un titre. Au survol de la carte parente (.group) : un anneau part du symbole et le symbole joue un petit geste
// (l'œil cligne, l'avion décolle, le curseur clique, l'éclair claque, l'étoile tourne, la silhouette salue). Voir globals.css (.ic-*).
export type FxKind = "eye" | "send" | "click" | "user" | "bolt" | "star";

export default function FxIcon({ kind, children, size = 20 }: { kind: FxKind; children: ReactNode; size?: number }) {
  return (
    <span className="ic-fx text-foreground/80" aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={`ic-${kind}`}>
        {children}
      </svg>
    </span>
  );
}
