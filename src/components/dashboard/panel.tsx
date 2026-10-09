"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Briques d'une page de service, façon console d'hébergeur, dans le thème SYXTEE : onglets soulignés, cartes à rubriques titrées,
// lignes « libellé, valeur, menu ⋮ », pastilles d'état. Les pages s'en servent pour tout ranger sur une seule page par onglet.

export function TabsNav({ tabs, current, label = "Sections" }: { tabs: { id: string; label: string; href: string }[]; current: string; label?: string }) {
  return (
    <nav aria-label={label} className="mb-8 flex gap-8 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <Link key={t.id} href={t.href} aria-current={t.id === current ? "page" : undefined} className={`-mb-px whitespace-nowrap border-b-2 pb-3.5 text-[15px] transition-colors ${t.id === current ? "border-foreground font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={`rounded-2xl border border-line bg-surface ${className}`}>
      <h2 className="border-b border-line px-6 py-5 text-lg font-semibold tracking-tight">{title}</h2>
      <div className="divide-y divide-line px-6">{children}</div>
    </section>
  );
}

type Tone = "ok" | "warn" | "bad" | "live" | "idle";
const TONES: Record<Tone, string> = {
  ok: "bg-ok/15 text-ok",
  warn: "bg-warn/15 text-warn",
  bad: "bg-bad/15 text-bad",
  live: "bg-live/15 text-live",
  idle: "bg-foreground/10 text-muted",
};
export function Pill({ tone = "idle", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium ${TONES[tone]}`}>{children}</span>;
}

/** Menu ⋮ d'une ligne : une liste de liens. */
export type MenuItem = { label: string; href?: string; /** Action de serveur (relay-action) : ouvre une fenêtre de confirmation de la page. */ action?: { id: string; action: string }; danger?: boolean; /** Action locale (page cliente) : appelée au clic. */ onSelect?: () => void };

export function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label={label} className="grid size-10 place-items-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:bg-foreground/[0.06] hover:text-foreground">
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" /></svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 min-w-48 overflow-hidden rounded-xl border border-line-strong bg-[var(--surface-2)] py-1 shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
          {items.map((i) =>
            i.action || i.onSelect ? (
              <button
                key={i.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  if (i.onSelect) i.onSelect();
                  else window.dispatchEvent(new CustomEvent("relay-action", { detail: i.action }));
                }}
                className={`block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-foreground/[0.08] ${i.danger ? "text-red-300" : ""}`}
              >
                {i.label}
              </button>
            ) : (
              <Link key={i.href + i.label} role="menuitem" href={i.href ?? "#"} onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm transition-colors hover:bg-foreground/[0.08]">
                {i.label}
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/** Ligne : libellé en gras, valeur dessous, menu ⋮ à droite. */
export function Item({ label, hint, children, menu }: { label: string; hint?: string; children: ReactNode; menu?: { label: string; items: MenuItem[] } }) {
  return (
    <div className="flex items-start justify-between gap-4 py-5">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        <div className="mt-2 text-[15px] text-muted [&_strong]:font-medium [&_strong]:text-foreground">{children}</div>
      </div>
      {menu && <RowMenu label={menu.label} items={menu.items} />}
    </div>
  );
}

/** Bouton d'une ligne de réglage : déclenche une action du serveur (fenêtre de confirmation de la page) ou ouvre un lien. */
export function ActionButton({ children, action, href, danger = false }: { children: ReactNode; action?: { id: string; action: string }; href?: string; danger?: boolean }) {
  const cls = `inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors ${danger ? "border-red-400/40 text-red-300 hover:bg-red-400/10" : "border-line-strong hover:bg-foreground/[0.08]"}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button type="button" className={cls} onClick={() => window.dispatchEvent(new CustomEvent("relay-action", { detail: action }))}>
      {children}
    </button>
  );
}

/** Ligne de réglage : libellé et explication à gauche, valeur au milieu, bouton à droite. */
export function Setting({ label, help, value, button }: { label: string; help?: string; value?: ReactNode; button?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-5">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-[15px] font-semibold">{label}</p>
        {help && <p className="mt-0.5 text-xs leading-relaxed text-muted">{help}</p>}
      </div>
      {value && <div className="text-[15px]">{value}</div>}
      {button}
    </div>
  );
}

/** Ligne de synthèse : libellé en gris à gauche, valeur à droite. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 text-[15px]">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}
