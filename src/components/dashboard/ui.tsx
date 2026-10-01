import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "../NavTools";
import Highlight from "../ui/Highlight";
import DashArt from "./DashArt";
import type { DashIcon, SectionTab } from "@/lib/dashboard-nav";

// Briques communes des pages du dashboard : en-tête de page, tuile, libellé mono, page « bientôt ».

export function DashPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 pb-20 pt-10 sm:px-6 sm:pt-12 ${className}`}>{children}</div>;
}

/** Onglets d'une section (Statistiques, Scanner) : une page par onglet, adresse inchangée. */
export function SectionTabs({ tabs, current, label, className = "mb-8" }: { tabs: SectionTab[]; current: string; label: string; className?: string }) {
  return (
    <nav aria-label={label} className={`overflow-x-auto ${className}`}>
      <ul className="flex w-max gap-1 rounded-full border border-line p-1">
        {tabs.map((t) => {
          const on = t.href === current;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${on ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Titre de page : `lead` en clair, `hl` surligné (mot-clé). */
export function DashHeader({ lead, hl, sub, children }: { lead: string; hl: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="h-section">
          {lead}
          {hl && (
            <>
              {" "}
              <Highlight>{hl}</Highlight>
            </>
          )}
        </h1>
        {sub && <p className="mt-2 max-w-[65ch] text-base text-muted">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function Tile({ children, className = "", as: As = "section", ...rest }: { children: ReactNode; className?: string; as?: "section" | "div"; id?: string; "aria-labelledby"?: string }) {
  return (
    <As className={`rounded-2xl border border-line bg-background p-5 sm:p-6 ${className}`} {...rest}>
      {children}
    </As>
  );
}

/** Libellé technique de tuile (mono, capitales). */
export function TileLabel({ id, children, right }: { id?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 id={id} className="font-mono text-xs uppercase tracking-[0.15em] text-foreground">
        {children}
      </h2>
      {right}
    </div>
  );
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-muted transition-colors hover:text-foreground">
      {children}
      <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
        →
      </span>
    </Link>
  );
}

/** Page d'une fonction pas encore prête. */
export function ComingSoonPage({ icon, lead, hl, text, points }: { icon: DashIcon; lead: string; hl: string; text: string; points: string[] }) {
  return (
    <DashPage>
      <DashHeader lead={lead} hl={hl} />
      <Tile className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <Badge>Bientôt</Badge>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted">{text}</p>
          <ul className="mt-6 space-y-2 text-sm text-foreground">
            {points.map((p) => (
              <li key={p} className="flex gap-3">
                <span aria-hidden="true" className="text-muted">
                  +
                </span>
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted">
            On annonce chaque nouveauté sur le Discord.{" "}
            <Link href="/dashboard" className="text-foreground underline-offset-4 hover:underline">
              Retour à la vue d&apos;ensemble
            </Link>
          </p>
        </div>
        <div className="mx-auto h-48 w-full max-w-[280px]">
          <DashArt icon={icon} />
        </div>
      </Tile>
    </DashPage>
  );
}
