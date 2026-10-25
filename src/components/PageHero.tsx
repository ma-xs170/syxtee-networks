import type { ReactNode } from "react";
import { glow } from "@/lib/glow";
import { Container } from "./ui";

export default function PageHero({
  title,
  actions,
  children,
}: {
  /** Gardé pour les appels existants : l'étiquette n'est plus affichée. */
  kicker?: string;
  title: ReactNode;
  /** Gardé pour les appels existants : le fil d'Ariane n'est plus affiché. */
  crumb?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section data-hero className="bg-field relative isolate overflow-hidden border-b border-line">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={glow("var(--bad)", "50% 0%", 70, 100, 26)} />
      <Container className="relative pb-16 pt-[calc(4rem+65px)] text-center sm:pb-24 sm:pt-[calc(5rem+65px)]">
        <h1 className="rise h-hero mx-auto max-w-4xl" style={{ "--i": 0 } as React.CSSProperties}>
          {title}
        </h1>
        {children && (
          <p className="rise mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg" style={{ "--i": 1 } as React.CSSProperties}>
            {children}
          </p>
        )}
        {actions && (
          <div className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ "--i": 2 } as React.CSSProperties}>
            {actions}
          </div>
        )}
      </Container>
    </section>
  );
}
