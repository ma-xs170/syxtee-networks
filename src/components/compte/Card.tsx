import type { ReactNode } from "react";

// Carte d'une section de Mon compte : titre, explication, contenu.
export default function Card({ title, text, children, danger = false }: { title: string; text?: string; children: ReactNode; danger?: boolean }) {
  return (
    <section className={`rounded-2xl border bg-surface p-5 sm:p-7 ${danger ? "border-red-400/30" : "border-line"}`}>
      <h2 className={`text-lg font-semibold tracking-tight ${danger ? "text-red-300" : ""}`}>{title}</h2>
      {text && <p className="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-muted">{text}</p>}
      <div className="mt-6 max-w-xl">{children}</div>
    </section>
  );
}
