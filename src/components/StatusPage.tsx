import type { ReactNode } from "react";

// Page d'état plein écran (404, erreur) : illustration filaire en encre, titre, phrase, actions.
// Serveur et client compatibles : aucun hook. Couleurs par tokens, donc valable dans les trois modes.
export default function StatusPage({ code, title, children, actions }: { code: string; title: ReactNode; children: ReactNode; actions: ReactNode }) {
  return (
    <section className="bg-field grid min-h-dvh flex-1 place-items-center px-4 py-16 sm:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col items-start">
        <svg viewBox="0 0 240 90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-auto w-56 text-foreground sm:w-72">
          <rect x="6" y="28" width="62" height="34" rx="6" />
          <path d="M68 38h14M68 52h14" />
          <path d="M172 38h14M172 52h14" />
          <rect x="186" y="28" width="48" height="34" rx="6" />
          <path d="M82 45h20l8-10 10 22 8-12h14" strokeDasharray="3 6" />
          <path d="M120 14l-6 14M130 76l6-14" className="text-muted" />
        </svg>
        <p className="font-mono mt-8 text-sm text-muted">{code}</p>
        <h1 className="h-hero mt-3 max-w-xl text-balance">{title}</h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-muted text-pretty sm:text-lg">{children}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>
      </div>
    </section>
  );
}
