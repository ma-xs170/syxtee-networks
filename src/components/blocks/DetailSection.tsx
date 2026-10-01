import type { ReactNode } from "react";
import { Container } from "../ui";

// Section de page détaillée : texte d'un côté, visuel de l'autre. `reverse` inverse les côtés sur desktop.
export default function DetailSection({
  n,
  title,
  visual,
  reverse = false,
  id,
  children,
}: {
  n: string;
  title: ReactNode;
  visual?: ReactNode;
  reverse?: boolean;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="border-b border-line py-20 sm:py-24">
      <Container className={`grid items-center gap-12 ${visual ? "lg:grid-cols-2 lg:gap-16" : ""}`}>
        <div className={visual ? (reverse ? "lg:order-2" : undefined) : "max-w-3xl"}>
          <p className="font-mono text-sm text-muted">{n}</p>
          <h2 className="mt-4 h-section">{title}</h2>
          <div className="mt-8 space-y-8">{children}</div>
        </div>
        {visual && <div className={`min-w-0 ${reverse ? "lg:order-1" : ""}`}>{visual}</div>}
      </Container>
    </section>
  );
}

// Sous-bloc « kicker mono + paragraphe(s) ».
export function Point({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-muted [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </div>
  );
}

// Cadre d'une illustration filaire dans une DetailSection.
export function IllustrationCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="rounded-3xl border border-line bg-gradient-to-b from-accent/[0.06] to-transparent p-6 sm:p-10">
      <div className="mx-auto aspect-[4/3] max-w-md">{children}</div>
      <figcaption className="mt-4 text-center font-mono text-xs text-muted">{label}</figcaption>
    </figure>
  );
}
