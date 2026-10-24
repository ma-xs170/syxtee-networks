import type { ReactNode } from "react";

// Ancien surlignage de mots de titre : supprimé (décision du 2026-10-24). Le composant reste pour ne pas toucher aux appels : il n'affiche plus que le texte.
export default function Highlight({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
