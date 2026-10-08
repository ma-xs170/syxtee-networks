import type { ReactNode } from "react";
import GlassBadge from "./GlassBadge";

/** État vide : icône verre, titre « Aucun X pour l'instant », phrase, bouton. */
export default function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      <GlassBadge size={64}>{icon}</GlassBadge>
      <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
      {text && <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-muted">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
