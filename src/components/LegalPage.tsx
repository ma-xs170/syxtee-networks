import type { ReactNode } from "react";
import { Container } from "./ui";

// Mise en page des pages légales (/mentions-legales, /cgu, /confidentialite).
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <section className="py-20">
      <Container className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-muted">Dernière mise à jour : {updated}</p>
        <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted">{children}</div>
      </Container>
    </section>
  );
}

export function LegalBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}
