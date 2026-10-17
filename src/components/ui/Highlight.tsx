import type { ReactNode } from "react";

// Surlignage d'une partie de titre (un seul par titre, jamais dans un paragraphe). Statique : fond plein, texte inversé.
export default function Highlight({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-[2px] bg-fill px-1 text-on-accent [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
      {children}
    </span>
  );
}
