import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// Briques de l'espace client (styles dans app/dashboard.css) : carte, boutons, toggle, badge, ligne, onglets, tableau.
// Sans état ni "use client" : utilisables côté serveur comme côté client.

export function Card({ children, className = "", as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={`dk-card ${className}`}>{children}</Tag>;
}

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="dk-h1">{title}</h1>
        {sub && <p className="mt-2 text-[14px] text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

type Tone = "primary" | "secondary" | "danger";
const cls = (tone: Tone, icon: boolean, extra: string) => `dk-btn dk-btn-${tone}${icon ? " dk-btn-icon" : ""} ${extra}`;

export function DkButton({ tone = "secondary", icon = false, className = "", ...rest }: { tone?: Tone; icon?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...rest} className={cls(tone, icon, className)} />;
}

export function DkLink({ href, tone = "secondary", icon = false, className = "", children, ...rest }: { href: string; tone?: Tone; icon?: boolean; className?: string; children: ReactNode; "aria-label"?: string }) {
  return (
    <Link href={href} {...rest} className={cls(tone, icon, className)}>
      {children}
    </Link>
  );
}

/** Interrupteur (bleu quand actif). `label` obligatoire pour les lecteurs d'écran. */
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange?: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange?.(!checked)} className="dk-toggle" />;
}

export type BadgeTone = "neutral" | "ok" | "warn" | "bad";
export function StatusBadge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className="dk-badge" data-tone={tone}>
      <i aria-hidden="true" />
      {children}
    </span>
  );
}

/** Ligne de liste : icône/logo, texte principal + secondaire, action à droite. Les lignes se séparent par un filet. */
export function ListRow({ lead, title, sub, trailing, href }: { lead?: ReactNode; title: ReactNode; sub?: ReactNode; trailing?: ReactNode; href?: string }) {
  const body = (
    <>
      {lead && <span className="flex-none">{lead}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-foreground">{title}</span>
        {sub && <span className="dk-label block truncate">{sub}</span>}
      </span>
      {trailing}
    </>
  );
  return href ? (
    <Link href={href} className="dk-row hover:bg-foreground/[0.03]">
      {body}
    </Link>
  ) : (
    <div className="dk-row">{body}</div>
  );
}

/** Onglets-liens (une adresse par onglet). Pour des onglets locaux, voir DkTabButtons. */
export function DkTabs({ tabs, current, label }: { tabs: { label: string; href: string }[]; current: string; label: string }) {
  return (
    <nav aria-label={label} className="dk-tabs">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className="dk-tab" aria-current={t.href === current ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function DkTabButtons<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="dk-tabs">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === value} onClick={() => onChange(t.id)} className="dk-tab">
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function DkTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="dk-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Colonne centrale des pages du tableau de bord. */
export function Column({ children, max = 1200 }: { children: ReactNode; max?: 720 | 1200 }) {
  return <div className="mx-auto w-full px-4 pb-20 pt-8 sm:px-6 sm:pt-12" style={{ maxWidth: max }}>{children}</div>;
}

/** Section d'une page de réglages : titre, phrase, contenu ; séparée de la précédente par un trait fin. `danger` : titre en rouge. */
export function Section({ title, text, danger = false, children, id }: { title: string; text?: string; danger?: boolean; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="border-t border-line py-8 first:border-t-0 first:pt-0">
      <h2 className="text-[16px]" style={{ color: danger ? "var(--dk-red)" : undefined }}>{title}</h2>
      {text && <p className="mt-1 max-w-[60ch] text-[14px] leading-relaxed text-muted">{text}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
