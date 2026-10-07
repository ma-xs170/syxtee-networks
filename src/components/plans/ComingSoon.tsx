import Link from "next/link";
import type { ReactNode } from "react";
import Particles from "../home/Particles";

// Contenu pas encore ouvert : flouté, désactivé, avec des particules par-dessus et la mention « À venir ».
// `full` : encart au centre avec le message et le bouton ; sinon seulement la mention, pour un long tableau.
export default function ComingSoon({ children, full = false }: { children: ReactNode; full?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div inert aria-hidden="true" className="pointer-events-none select-none opacity-80 blur-[5px] saturate-50">
        {children}
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-background/20" />
      <Particles density={1.4} />
      <div className={`absolute inset-0 grid place-items-center px-4 ${full ? "max-lg:content-start max-lg:pt-16" : "content-start pt-16"}`}>
        {full ? (
          <div role="status" className="max-w-md rounded-2xl border border-line-strong bg-background/85 p-8 text-center shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-md">
            <p className="inline-flex h-7 items-center rounded-full border border-line-strong px-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">À venir</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">Les tarifs arrivent bientôt.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">Trois formules, dévoilées à l&apos;ouverture au public. En attendant, l&apos;accès se fait sur demande.</p>
            <Link href="/acces" className="btn btn-primary mt-6">
              Demander l&apos;accès
            </Link>
          </div>
        ) : (
          <p role="status" className="inline-flex h-9 items-center rounded-full border border-line-strong bg-background/85 px-5 font-mono text-xs uppercase tracking-[0.14em] text-muted backdrop-blur-md">
            À venir
          </p>
        )}
      </div>
    </div>
  );
}
