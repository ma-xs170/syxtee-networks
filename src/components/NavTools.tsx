"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import GlidePill from "./ui/GlidePill";
import GlassIconView from "./ui/GlassIconView";
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
import DashArt from "./dashboard/DashArt";
import type { DashIcon, DashItem, DashMenu, DashTool } from "@/lib/dashboard-nav";
import type { NavItem, NavMenu, NavTool, ToolIcon } from "@/lib/site";
import { LockIcon } from "./plans/Locked";

// Même composant pour la nav du site et celle du dashboard (autres entrées, autres illustrations).
type AnyMenu = NavMenu | DashMenu;
type AnyItem = NavItem | DashItem;
const isAnyMenu = (item: AnyItem): item is AnyMenu => "children" in item;
const DASH_ICONS = new Set<string>(["relays", "urls", "health", "preview", "control", "stats", "lives", "map", "mire", "scan", "cam", "security", "profile", "plan", "settings"]);

/** Miniature d'une entrée de menu : icône verre 3D quand l'entrée en a une, sinon l'illustration filaire. */
function Thumb({ t, size }: { t: NavTool | DashTool; size: number }) {
  if ("glass" in t && t.glass) return <GlassIconView name={t.glass} size={size} float={false} src={`/glass-icons/${t.glass}.webp`} />;
  return <ItemArt icon={t.icon} />;
}

function ItemArt({ icon }: { icon: ToolIcon | DashIcon }) {
  return DASH_ICONS.has(icon) ? <DashArt icon={icon as DashIcon} /> : <ToolArt icon={icon as ToolIcon} />;
}

// Menus de la nav (Produits, Outils, Ressources) : méga-menus sur desktop (survol + clic, clavier, Échap, clic
// extérieur, un seul ouvert à la fois), accordéons dans le burger. Chaque entrée a sa mini-illustration filaire.

export function ToolArt({ icon, className = "h-full w-full" }: { icon: ToolIcon; className?: string }) {
  switch (icon) {
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

const EASE = [0.22, 1, 0.36, 1] as const;

/** Une entrée du panneau : miniature, titre, description, flèche à droite. `soon` : grisée. Le fond de survol est la pastille partagée du panneau. */
function PanelItem({ t, hovered, onHover, onClose, i, reduce }: { t: NavTool | DashTool; hovered: boolean; onHover: () => void; onClose: () => void; i: number; reduce: boolean | null }) {
  const soon = "soon" in t && t.soon;
  const external = t.href.startsWith("http");
  return (
    <motion.li initial={reduce ? false : { opacity: 0, y: 6, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.28, delay: reduce ? 0 : 0.03 * i, ease: EASE }}>
      <Link
        href={t.href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        onClick={onClose}
        onMouseEnter={onHover}
        onFocus={onHover}
        className={`group relative flex items-center gap-4 rounded-xl p-3 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-foreground/50 ${soon ? "opacity-60 hover:opacity-100" : ""}`}
      >
        <GlidePill show={hovered} id="mega-pill" className="rounded-xl" />
        <span className="relative z-10 h-14 w-14 shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.06]">
          <Thumb t={t} size={56} />
        </span>
        <span className="relative z-10 min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ToolLabel t={t} />
            {t.badge && <Badge>{t.badge}</Badge>}
            {"locked" in t && t.locked && <LockIcon className="h-3.5 w-3.5 shrink-0 text-muted" />}
          </span>
          <span className="mt-0.5 block text-sm leading-snug text-muted">{t.desc}</span>
        </span>
        <span aria-hidden="true" className="relative z-10 text-muted transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-foreground">
          {external ? "↗" : "→"}
        </span>
      </Link>
    </motion.li>
  );
}

function PanelContent({ menu, onClose, reduce }: { menu: AnyMenu; onClose: () => void; reduce: boolean | null }) {
  const [hover, setHover] = useState<string | null>(null);
  const groups = groupTools(menu.children);
  const cols = menu.children.length > 3 && !groups ? "grid-cols-2" : "grid-cols-1";
  const list = (tools: (NavTool | DashTool)[]) => (
    <ul className={`grid gap-1 ${groups ? "grid-cols-1" : cols} ${groups ? "w-[300px]" : cols === "grid-cols-2" ? "w-[660px]" : "w-[340px]"}`} onMouseLeave={() => setHover(null)}>
      {tools.map((t, i) => (
        <PanelItem key={t.href} t={t} i={i} hovered={hover === t.href} onHover={() => setHover(t.href)} onClose={onClose} reduce={reduce} />
      ))}
    </ul>
  );
  return (
    <div className="p-3">
      {groups ? (
        <div className="flex gap-6 p-1">
          {groups.map(([title, tools]) => (
            <div key={title}>
              <p className="label-mono px-3 pb-2 pt-1">{title}</p>
              {list(tools)}
            </div>
          ))}
        </div>
      ) : (
        list(menu.children)
      )}
      {menu.note && <p className="mt-2 border-t border-line px-4 pb-1 pt-3 text-xs text-muted">{menu.note}</p>}
    </div>
  );
}

/** Desktop : barre de liens et de menus. Une seule pastille glisse entre les entrées ; un seul panneau change de taille et de contenu
 *  en douceur (flou + fondu) quand on passe d'un menu à l'autre. Ouverture au survol (fermeture après 100 ms) ou au clic, Échap, flèches. */
export function DesktopMenus({ items, isActive }: { items: AnyItem[]; isActive: (href: string) => boolean }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [center, setCenter] = useState(0);
  const wrap = useRef<HTMLElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const triggers = useRef<Record<string, HTMLElement | null>>({});
  const panelId = useId();
  const menus = items.filter(isAnyMenu);
  const current = menus.find((m) => m.label === open) ?? null;

  const cancel = () => clearTimeout(leaveTimer.current);
  const show = (label: string, pin = false) => {
    cancel();
    const el = triggers.current[label];
    const box = wrap.current?.getBoundingClientRect();
    if (el && box) {
      const r = el.getBoundingClientRect();
      setCenter(r.left - box.left + r.width / 2);
    }
    setOpen(label);
    if (pin) setPinned(true);
  };
  const close = () => {
    cancel();
    setOpen(null);
    setPinned(false);
  };
  useEffect(() => cancel, []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Mesure du contenu courant : le panneau s'adapte (largeur et hauteur) à chaque menu.
  const measure = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver(() => setSize({ w: node.offsetWidth, h: node.offsetHeight }));
    ro.observe(node);
    setSize({ w: node.offsetWidth, h: node.offsetHeight });
  }, []);

  const pill = "relative whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-foreground/50";
  const dur = reduce ? 0 : 0.28;

  return (
    <nav
      ref={wrap}
      aria-label="Navigation principale"
      className="relative hidden items-center gap-1 lg:flex"
      onMouseEnter={cancel}
      onMouseLeave={() => {
        setHover(null);
        leaveTimer.current = setTimeout(() => !pinned && setOpen(null), 100);
      }}
      onBlur={(e) => {
        if (!wrap.current?.contains(e.relatedTarget as Node)) close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          triggers.current[open]?.focus();
          close();
        }
        if (e.key === "ArrowDown" && open) {
          e.preventDefault();
          wrap.current?.querySelector<HTMLAnchorElement>(`#${CSS.escape(panelId)} a`)?.focus();
        }
      }}
    >
      {items.map((item) => {
        const label = isAnyMenu(item) ? item.label : item.href;
        const active = isAnyMenu(item) ? item.children.some((t) => isActive(t.href)) : isActive(item.href);
        const common = {
          onMouseEnter: () => {
            setHover(label);
            if (isAnyMenu(item)) show(item.label);
            else if (!pinned) setOpen(null);
          },
          onFocus: () => setHover(label),
        };
        return isAnyMenu(item) ? (
          <button
            key={label}
            ref={(el) => {
              triggers.current[label] = el;
            }}
            type="button"
            aria-expanded={open === label}
            aria-controls={panelId}
            onClick={() => (open === label && pinned ? close() : show(item.label, true))}
            className={`${pill} flex items-center gap-1.5 ${active || open === label ? "text-foreground" : "text-foreground/75"}`}
            {...common}
          >
            <GlidePill show={hover === label || open === label} id="site-nav-pill" className="rounded-full" />
            <span className="relative z-10 flex items-center gap-1.5">
              {item.label}
              {item.dot && <NewDot />}
              <Chevron open={open === label} />
            </span>
          </button>
        ) : (
          <Link
            key={label}
            href={item.href}
            {...(item.href.startsWith("http") || ("arrow" in item && item.arrow) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            aria-current={active ? "page" : undefined}
            className={`${pill} ${active ? "font-medium text-foreground" : "text-foreground/75"}`}
            {...common}
          >
            <GlidePill show={hover === label} id="site-nav-pill" className="rounded-full" />
            <span className={`relative z-10 ${"underline" in item && item.underline ? "underline underline-offset-[6px] decoration-foreground/50" : ""}`}>
              {item.label}
              {"arrow" in item && item.arrow && (
                <span aria-hidden="true" className="ml-1 inline-block text-foreground/60">
                  ↗
                </span>
              )}
            </span>
          </Link>
        );
      })}

      <AnimatePresence>
        {current && (
          <motion.div
            key="mega"
            id={panelId}
            className="absolute left-0 top-full z-50 pt-3"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)", x: Math.max(center - size.w / 2, -24) }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.98, filter: reduce ? "none" : "blur(4px)", transition: { duration: 0.12 } }}
            transition={{ duration: dur, ease: EASE, x: { type: "spring", stiffness: 420, damping: 38 } }}
            style={{ transformOrigin: "top center" }}
          >
            <motion.div
              className="relative overflow-hidden rounded-2xl border border-foreground/15 bg-[#09090b] shadow-[0_24px_60px_-12px_var(--shadow-pop)] backdrop-blur-xl"
              animate={{ width: size.w || "auto", height: size.h || "auto" }}
              transition={{ duration: dur, ease: EASE }}
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={current.label}
                  ref={measure}
                  className="w-max"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(6px)", y: 6 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={{ opacity: 0, filter: reduce ? "none" : "blur(6px)", y: reduce ? 0 : -6, transition: { duration: 0.16 } }}
                  transition={{ duration: dur, ease: EASE }}
                >
                  <PanelContent menu={current} onClose={close} reduce={reduce} />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
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
            <Link href={t.href} onClick={onNavigate} className={`flex items-center gap-4 rounded-xl px-2 py-3 hover:bg-foreground/10${"soon" in t && t.soon ? " opacity-60 hover:opacity-100" : ""}`}>
              <span className="h-12 w-12 shrink-0">
                <Thumb t={t} size={48} />
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
