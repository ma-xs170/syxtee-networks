import Link from "next/link";
import type { ReactNode } from "react";
import type { SectionTab } from "@/lib/dashboard-nav";

// Briques de l'espace admin (direction éditoriale, styles dans app/(admin)/admin/admin.css).
// Mêmes noms que components/dashboard/ui : les pages admin changent seulement l'import. Sans état : serveur comme client.

export function DashPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1280px] px-4 pb-20 pt-8 sm:px-8 sm:pb-28 sm:pt-14 ${className}`}>{children}</div>;
}

/** Titre de page : `lead` estompé, `hl` plein (mot-clé). `kicker` : petite ligne mono au-dessus. */
export function DashHeader({ lead, hl, sub, children, kicker }: { lead: string; hl?: string; sub?: ReactNode; children?: ReactNode; highlight?: boolean; kicker?: string }) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-5 sm:mb-14">
      <div className="min-w-0">
        {kicker && <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{kicker}</p>}
        <h1 className="h-page">
          <span className={hl ? "text-foreground/45" : ""}>{lead}</span>
          {hl && <> {hl}</>}
        </h1>
        {sub && <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  );
}

export function Tile({ children, className = "", as: As = "section", ...rest }: { children: ReactNode; className?: string; as?: "section" | "div"; id?: string; "aria-labelledby"?: string }) {
  return (
    <As className={`tile p-5 sm:p-7 ${className}`} {...rest}>
      {children}
    </As>
  );
}

export function TileLabel({ id, children, right }: { id?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 id={id} className="text-[17px] font-semibold tracking-tight text-foreground">
        {children}
      </h2>
      {right}
    </div>
  );
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap text-sm text-muted transition-colors hover:text-foreground">
      {children}
      <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
        →
      </span>
    </Link>
  );
}

/** Onglets d'une page : soulignés, une adresse par onglet. */
export function SectionTabs({ tabs, current, label, className = "mb-10" }: { tabs: SectionTab[]; current: string; label: string; className?: string }) {
  return (
    <nav aria-label={label} className={`overflow-x-auto ${className}`}>
      <ul className="flex w-max gap-8">
        {tabs.map((t) => {
          const on = t.href === current;
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={on ? "page" : undefined} className={`-mb-px block whitespace-nowrap border-b-2 pb-3 text-sm transition-colors ${on ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground"}`}>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Grand chiffre éditorial : valeur énorme, libellé mono au-dessus, précision dessous. */
export function Figure({ label, value, hint, href }: { label: string; value: string; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="adm-figure mt-4 text-[clamp(2.75rem,5.5vw,4.5rem)]">{value}</p>
      {hint && <p className="mt-3 text-sm leading-snug text-muted">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl p-1 transition-colors hover:text-foreground">
      {body}
    </Link>
  ) : (
    <div className="p-1">{body}</div>
  );
}

/** Pastille d'état. `tone` : ok (vert), bad (rouge), live (point d'antenne), none (neutre). */
export function Chip({ children, tone = "none" }: { children: ReactNode; tone?: "none" | "ok" | "bad" | "warn" | "live" }) {
  const color = tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-muted";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-foreground/[0.07] px-2.5 py-1 text-xs font-medium ${color}`}>
      {tone === "live" && <span className="live-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Pastille d'initiales ou photo. */
export function Avatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  const initials = name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
  const box = { width: size, height: size, fontSize: Math.round(size * 0.36) };
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={box} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span aria-hidden="true" style={box} className="grid shrink-0 place-items-center rounded-full bg-foreground/10 font-mono font-semibold">
      {initials}
    </span>
  );
}
