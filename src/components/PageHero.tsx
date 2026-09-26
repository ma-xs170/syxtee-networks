import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "./ui";

export default function PageHero({
  kicker,
  title,
  crumb,
  actions,
  children,
}: {
  kicker: string;
  title: ReactNode;
  crumb: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <Container className="relative py-16 sm:py-24">
        <nav aria-label="Fil d'Ariane" className="font-mono text-xs text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-foreground">Accueil</Link>
            </li>
            <li aria-hidden="true" className="text-white/20">/</li>
            <li aria-current="page" className="text-foreground">{crumb}</li>
          </ol>
        </nav>

        <p className="mt-10 font-mono text-xs uppercase tracking-[0.2em] text-muted">{kicker}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">{title}</h1>
        {children && <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{children}</p>}
        {actions && <div className="mt-10 flex flex-col gap-3 sm:flex-row">{actions}</div>}
      </Container>
    </section>
  );
}
