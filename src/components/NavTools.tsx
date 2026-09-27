"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import PhoneAndroid from "./illustrations/PhoneAndroid";
import PhoneMoblin from "./illustrations/PhoneMoblin";
import StarlinkMini from "./illustrations/StarlinkMini";
import type { NavTool, ToolIcon } from "@/lib/site";

// Menu « Outils » : méga-menu sur desktop (survol + clic, clavier, Échap, clic extérieur), accordéon dans le burger.

export function ToolArt({ icon, className = "h-full w-full" }: { icon: ToolIcon; className?: string }) {
  if (icon === "phone") return <PhoneMoblin waves={false} animated={false} className={className} />;
  if (icon === "dish") return <StarlinkMini animated={false} className={className} />;
  return <PhoneAndroid screen="esim" animated={false} className={className} />;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 12 12" className={`h-3 w-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M3 4.5l3 3l3 -3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Badge({ children }: { children: string }) {
  return <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{children}</span>;
}

/** Desktop : lien « Outils » + panneau déroulant. */
export function ToolsMenu({ label, tools, active }: { label: string; tools: NavTool[]; active: boolean }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hover || pinned;
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const panelId = useId();

  const close = () => {
    setHover(false);
    setPinned(false);
  };

  // Clic à l'extérieur
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div
      ref={wrap}
      className="relative"
      onMouseEnter={() => {
        clearTimeout(leaveTimer.current);
        setHover(true);
      }}
      onMouseLeave={() => {
        leaveTimer.current = setTimeout(() => setHover(false), 120);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          close();
          trigger.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (!wrap.current?.contains(e.relatedTarget as Node)) close();
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          // Au clavier / au toucher : le clic ouvre et épingle ; un 2e clic referme.
          if (pinned) close();
          else setPinned(true);
        }}
        className={`flex items-center gap-1.5 text-sm transition-colors hover:text-foreground ${active || open ? "text-foreground" : "text-muted"}`}
      >
        {label}
        <Chevron open={open} />
      </button>

      <div
        id={panelId}
        className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-4 transition duration-150 ease-out ${
          open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-2 opacity-0"
        }`}
      >
        <div className="rounded-2xl border border-line bg-black/90 p-3 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)] backdrop-blur-md">
          <ul className="flex gap-2">
            {tools.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  onClick={close}
                  className="group flex w-[220px] flex-col rounded-xl p-4 transition-colors hover:bg-white/5 focus-visible:bg-white/5"
                >
                  <div className="h-24 w-full transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.04]">
                    <ToolArt icon={t.icon} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{t.label}</span>
                    {t.badge && <Badge>{t.badge}</Badge>}
                    <span aria-hidden="true" className="ml-auto text-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      →
                    </span>
                  </div>
                  <span className="mt-1 text-sm leading-snug text-muted">{t.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-line px-4 pb-1 pt-3 text-xs text-muted">Tous nos outils fonctionnent avec le relais SYXTEE</p>
        </div>
      </div>
    </div>
  );
}

/** Mobile (menu burger) : accordéon. */
export function ToolsAccordion({ label, tools, active, onNavigate }: { label: string; tools: NavTool[]; active: boolean; onNavigate: () => void }) {
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
        {label}
        <Chevron open={open} />
      </button>
      <ul id={id} hidden={!open} className="pb-3">
        {tools.map((t) => (
          <li key={t.href}>
            <Link href={t.href} onClick={onNavigate} className="flex items-center gap-4 rounded-xl px-2 py-3 hover:bg-white/5">
              <span className="h-12 w-12 shrink-0">
                <ToolArt icon={t.icon} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-base text-foreground">{t.label}</span>
                  {t.badge && <Badge>{t.badge}</Badge>}
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
