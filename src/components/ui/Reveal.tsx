import type { ReactNode } from "react";

// Bloc de page : affiché d'emblée (plus d'animation d'apparition, pour un site statique et rapide). `delay` gardé pour les appelants.
export default function Reveal({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "article" | "section" }) {
  return <Tag className={className}>{children}</Tag>;
}
