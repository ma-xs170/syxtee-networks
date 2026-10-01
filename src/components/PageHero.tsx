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
    <section className="bg-field overflow-hidden border-b border-line">
            <Container className="relative pb-16 pt-12 sm:pb-24 sm:pt-16">
        <nav aria-label="Fil d'Ariane" className="font-mono text-xs text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-foreground">Accueil</Link>
            </li>
            <li aria-hidden="true" className="text-foreground/20">/</li>
            <li aria-current="page" className="text-foreground">{crumb}</li>
          </ol>
        </nav>

        <p className="label-mono mt-10 inline-flex rounded-full border border-line bg-accent/[0.08] px-3 py-1">{kicker}</p>
        <h1 className="h-hero mt-5 max-w-4xl">{title}</h1>
        {children && <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{children}</p>}
        {actions && <div className="mt-10 flex flex-col gap-3 sm:flex-row">{actions}</div>}
      </Container>
    </section>
  );
}
