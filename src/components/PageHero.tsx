import Link from "next/link";
import type { ReactNode } from "react";
import { glow } from "@/lib/glow";
import { Container } from "./ui";

export default function PageHero({
  title,
  crumb,
  actions,
  children,
}: {
  /** Gardé pour les appels existants : l'étiquette n'est plus affichée. */
  kicker?: string;
  title: ReactNode;
  crumb: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section data-hero className="bg-field relative isolate overflow-hidden border-b border-line">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={glow("var(--bad)", "0% 0%", 70, 100, 30)} />
      <Container className="relative pb-16 pt-[calc(3rem+65px)] sm:pb-24 sm:pt-[calc(4rem+65px)]">
        <nav aria-label="Fil d'Ariane" className="font-mono text-xs text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-foreground">Accueil</Link>
            </li>
            <li aria-hidden="true" className="text-foreground/20">/</li>
            <li aria-current="page" className="text-foreground">{crumb}</li>
          </ol>
        </nav>

        <h1 className="rise h-hero mt-10 max-w-4xl" style={{ "--i": 1 } as React.CSSProperties}>
          {title}
        </h1>
        {children && (
          <p className="rise mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg" style={{ "--i": 2 } as React.CSSProperties}>
            {children}
          </p>
        )}
        {actions && (
          <div className="rise mt-10 flex flex-col gap-3 sm:flex-row" style={{ "--i": 3 } as React.CSSProperties}>
            {actions}
          </div>
        )}
      </Container>
    </section>
  );
}
