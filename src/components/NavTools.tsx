"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import DataCenter from "./illustrations/DataCenter";
import DiscordChat from "./illustrations/DiscordChat";
import ObsScreen from "./illustrations/ObsScreen";
import PhoneAndroid from "./illustrations/PhoneAndroid";
import PhoneMoblin from "./illustrations/PhoneMoblin";
import RelayServer from "./illustrations/RelayServer";
import StarlinkMini from "./illustrations/StarlinkMini";
import Streamer from "./illustrations/Streamer";
import StudioWire from "./illustrations/StudioWire";
import Wordmark from "./Wordmark";
import { ProDrawing } from "./pro/ProExploded";
import DashArt from "./dashboard/DashArt";
import type { DashIcon, DashItem, DashMenu, DashTool } from "@/lib/dashboard-nav";
import type { NavItem, NavMenu, NavTool, ToolIcon } from "@/lib/site";
import { LockIcon } from "./plans/Locked";

// Même composant pour la nav du site et celle du dashboard (autres entrées, autres illustrations).
type AnyMenu = NavMenu | DashMenu;
type AnyItem = NavItem | DashItem;
const isAnyMenu = (item: AnyItem): item is AnyMenu => "children" in item;
const DASH_ICONS = new Set<string>(["relays", "urls", "health", "preview", "control", "stats", "lives", "map", "mire", "scan", "cam", "security", "profile", "plan", "settings"]);

function ItemArt({ icon }: { icon: ToolIcon | DashIcon }) {
  return DASH_ICONS.has(icon) ? <DashArt icon={icon as DashIcon} /> : <ToolArt icon={icon as ToolIcon} />;
}

// Menus de la nav (Produits, Outils, Ressources) : méga-menus sur desktop (survol + clic, clavier, Échap, clic
// extérieur, un seul ouvert à la fois), accordéons dans le burger. Chaque entrée a sa mini-illustration filaire.

export function ToolArt({ icon, className = "h-full w-full" }: { icon: ToolIcon; className?: string }) {
  switch (icon) {
    case "bag":
      return (
        <svg viewBox="150 70 300 390" className={`${className} text-foreground`} fill="none" aria-hidden="true">
          <ProDrawing closed />
        </svg>
      );
    case "rack":
      return <RelayServer animated={false} className={className} />;
    case "phone":
      return <PhoneMoblin waves={false} animated={false} className={className} />;
    case "dish":
      return <StarlinkMini animated={false} className={className} />;
    case "esim":
      return <PhoneAndroid screen="esim" animated={false} className={className} />;
    case "route":
      return <Streamer animated={false} className={className} />;
    case "services":
      return <DataCenter animated={false} className={className} />;
    case "docs":
      return <ObsScreen animated={false} className={className} />;
    case "faq":
      return <DiscordChat animated={false} className={className} />;
    case "studio":
      return <StudioWire animated={false} className={className} />;
    case "map":
      // Carte de couverture filaire : fond de carte, hexagones mesurés et repère
      return (
        <svg viewBox="0 0 120 90" className={`${className} text-foreground`} fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 22l30-8 32 10 30-9v52l-30 9-32-10-30 8z" />
          <path d="M44 14v52M76 24v52" opacity={0.5} />
          <path d="M26 40l6-3.5 6 3.5v7l-6 3.5-6-3.5zM54 52l6-3.5 6 3.5v7l-6 3.5-6-3.5zM84 36l6-3.5 6 3.5v7l-6 3.5-6-3.5z" opacity={0.7} />
          <path d="M60 18a8 8 0 0 1 8 8c0 6-8 14-8 14s-8-8-8-14a8 8 0 0 1 8-8z" fill="currentColor" fillOpacity={0.12} />
          <circle cx="60" cy="26" r="2.5" />
        </svg>
      );
    case "tower":
      // Antenne relais filaire (carte /antennes)
      return (
        <svg viewBox="0 0 120 90" className={`${className} text-foreground`} fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M60 22L46 82M60 22L74 82M50 64H70M53 50H67M56 36H64M40 82H80" />
          <rect x="56" y="14" width="8" height="10" rx="1" />
          <path d="M44 16a18 18 0 0 0 0 16M76 16a18 18 0 0 1 0 16M36 10a28 28 0 0 0 0 28M84 10a28 28 0 0 1 0 28" opacity={0.6} />
        </svg>
      );
  }
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 12 12" className={`h-3 w-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M3 4.5l3 3l3 -3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Badge({ children }: { children: string }) {
  return <span className="whitespace-nowrap rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{children}</span>;
}

/** Point rouge de nouveauté (pas de badge texte dans la barre). */
function NewDot() {
  return (
    <>
      <span className="h-1.5 w-1.5 rounded-full bg-live" aria-hidden="true" />
      <span className="sr-only">(nouveauté)</span>
    </>
  );
}

type Open = { label: string; pinned: boolean } | null;

/** Desktop : les menus déroulants et les liens simples, centrés dans la barre. */
export function DesktopMenus({ items, isActive }: { items: AnyItem[]; isActive: (href: string) => boolean }) {
  const [open, setOpen] = useState<Open>(null);
  const wrap = useRef<HTMLElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clic à l'extérieur
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  return (
    <nav
      ref={wrap}
      aria-label="Navigation principale"
      className="hidden items-center gap-7 lg:flex"
      onBlur={(e) => {
        if (!wrap.current?.contains(e.relatedTarget as Node)) setOpen(null);
      }}
    >
      {items.map((item) =>
        isAnyMenu(item) ? (
          <Dropdown
            key={item.label}
            menu={item}
            active={item.children.some((t) => isActive(t.href))}
            open={open?.label === item.label}
            onEnter={() => {
              clearTimeout(leaveTimer.current);
              setOpen((o) => (o?.label === item.label ? o : { label: item.label, pinned: false }));
            }}
            onLeave={() => {
              leaveTimer.current = setTimeout(() => setOpen((o) => (o?.pinned ? o : null)), 120);
            }}
            onToggle={() => setOpen((o) => (o?.label === item.label && o.pinned ? null : { label: item.label, pinned: true }))}
            onPin={() => setOpen({ label: item.label, pinned: true })}
            onClose={() => setOpen(null)}
          />
        ) : (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={`whitespace-nowrap text-sm transition-colors hover:text-foreground ${isActive(item.href) ? "text-foreground" : "text-muted"}`}
          >
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}

function Dropdown({
  menu,
  active,
  open,
  onEnter,
  onLeave,
  onToggle,
  onPin,
  onClose,
}: {
  menu: AnyMenu;
  active: boolean;
  open: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onToggle: () => void;
  onPin: () => void;
  onClose: () => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const grid = menu.children.length > 3; // 4 entrées : grille 2 × 2 compacte
  const groups = groupTools(menu.children);

  const links = () => Array.from(panel.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);

  return (
    <div
      className="relative"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          onClose();
          trigger.current?.focus();
          return;
        }
        // Flèches : parcourir les entrées du panneau
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          if (!open) onPin();
          // Après le rendu : le panneau doit être visible pour recevoir le focus
          setTimeout(() => {
            const all = links();
            const i = all.indexOf(document.activeElement as HTMLAnchorElement);
            const next = e.key === "ArrowDown" ? (i + 1) % all.length : i <= 0 ? all.length - 1 : i - 1;
            all[next]?.focus();
          }, 30);
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={`flex items-center gap-1.5 whitespace-nowrap text-sm transition-colors hover:text-foreground ${active || open ? "text-foreground" : "text-muted"}`}
      >
        {menu.label}
        {menu.dot && <NewDot />}
        <Chevron open={open} />
      </button>

      <div
        ref={panel}
        id={panelId}
        className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-4 transition duration-150 ease-out ${
          open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-2 opacity-0"
        }`}
      >
        <div className="rounded-2xl border border-accent/20 bg-background p-3 shadow-[0_24px_60px_-12px_var(--shadow-pop)] backdrop-blur-md">
          {groups ? (
            <div className="flex gap-6 p-1">
              {groups.map(([title, tools]) => (
                <div key={title} className="w-[270px]">
                  <p className="label-mono px-3 pb-2 pt-1">{title}</p>
                  <ul className="space-y-1">
                    {tools.map((t) => (
                      <li key={t.href}>
                        <Link href={t.href} onClick={onClose} className="group flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-accent/10 focus-visible:bg-accent/10">
                          <span className="h-14 w-14 shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.06]">
                            <ItemArt icon={t.icon} />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <ToolLabel t={t} />
                              {t.badge && <Badge>{t.badge}</Badge>}
                            </span>
                            <span className="mt-0.5 block text-sm leading-snug text-muted">{t.desc}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
          <ul className={grid ? "grid w-[660px] grid-cols-2 gap-1" : "flex gap-2"}>
            {menu.children.map((t) => (
              <li key={t.href}>
                {grid ? (
                  <Link href={t.href} onClick={onClose} className={`group flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-accent/10 focus-visible:bg-accent/10${"soon" in t && t.soon ? " opacity-60 hover:opacity-100" : ""}`}>
                    <span className="h-16 w-16 shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.06]">
                      <ItemArt icon={t.icon} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <ToolLabel t={t} />
                        {t.badge && <Badge>{t.badge}</Badge>}
                        {"locked" in t && t.locked && <LockIcon className="h-3.5 w-3.5 shrink-0 text-muted" />}
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-muted">{t.desc}</span>
                    </span>
                  </Link>
                ) : (
                  <Link
                    href={t.href}
                    onClick={onClose}
                    className={`group flex w-[220px] flex-col rounded-xl p-4 transition-colors hover:bg-accent/10 focus-visible:bg-accent/10${"soon" in t && t.soon ? " opacity-60 hover:opacity-100" : ""}`}
                  >
                    <div className="h-24 w-full transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.04]">
                      <ItemArt icon={t.icon} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="whitespace-nowrap text-sm font-medium text-foreground"><ToolLabel t={t} /></span>
                      {t.badge && <Badge>{t.badge}</Badge>}
                        {"locked" in t && t.locked && <LockIcon className="h-3.5 w-3.5 shrink-0 text-muted" />}
                      <span aria-hidden="true" className="ml-auto text-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        →
                      </span>
                    </div>
                    <span className="mt-1 text-sm leading-snug text-muted">{t.desc}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
          )}
          {menu.note && <p className="mt-2 border-t border-line px-4 pb-1 pt-3 text-xs text-muted">{menu.note}</p>}
        </div>
      </div>
    </div>
  );
}

/** Mobile (menu burger) : accordéon. */
export function NavAccordion({ menu, active, onNavigate }: { menu: AnyMenu; active: boolean; onNavigate: () => void }) {
  const [open, setOpen] = useState(active);
  const id = useId();
  return (
    <div className="border-b border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between py-4 text-base hover:text-foreground ${active ? "text-foreground" : "text-muted"}`}
      >
        <span className="flex items-center gap-2">
          {menu.label}
          {menu.dot && <NewDot />}
        </span>
        <Chevron open={open} />
      </button>
      <ul id={id} hidden={!open} className="pb-3">
        {menu.children.map((t, i) => (
          <li key={t.href}>
            {t.group && t.group !== (menu.children as (NavTool | DashTool)[])[i - 1]?.group && (
              <p className="label-mono px-2 pb-1 pt-3">{t.group}</p>
            )}
            <Link href={t.href} onClick={onNavigate} className={`flex items-center gap-4 rounded-xl px-2 py-3 hover:bg-accent/10${"soon" in t && t.soon ? " opacity-60 hover:opacity-100" : ""}`}>
              <span className="h-12 w-12 shrink-0">
                <ItemArt icon={t.icon} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-base text-foreground"><ToolLabel t={t} /></span>
                  {t.badge && <Badge>{t.badge}</Badge>}
                        {"locked" in t && t.locked && <LockIcon className="h-3.5 w-3.5 shrink-0 text-muted" />}
                </span>
                <span className="block text-sm text-muted">{t.desc}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Regroupe les entrées d'un menu par sous-section (ordre d'apparition). Null si le menu n'en a pas. */
function groupTools(children: (NavTool | DashTool)[]): [string, (NavTool | DashTool)[]][] | null {
  if (!children.some((t) => t.group)) return null;
  const map = new Map<string, (NavTool | DashTool)[]>();
  for (const t of children) {
    const g = t.group || "Autres";
    map.set(g, [...(map.get(g) ?? []), t]);
  }
  return [...map.entries()];
}

/** Nom d'une entrée : logo S + « SYXTEE FONCTION » pour les produits SYXTEE, texte simple sinon. */
function ToolLabel({ t }: { t: { label: string; wordmark?: string } }) {
  return t.wordmark ? <Wordmark name={t.wordmark} size="sm" /> : <>{t.label}</>;
}
