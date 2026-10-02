"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  ArrowSquareOut,
  CaretUpDown,
  CellSignalFull,
  ChartBar,
  Eye,
  Heartbeat,
  List,
  Lifebuoy,
  Lock,
  MapPinArea,
  MapTrifold,
  Question,
  Radio,
  SignOut,
  SlidersHorizontal,
  SquaresFour,
  Television,
  VideoCamera,
  X,
  type IconProps,
} from "@phosphor-icons/react";
import { signOut } from "@/app/(auth)/actions";
import type { Feature } from "@/lib/plans";
import { site } from "@/lib/site";
import { Avatar, useAccount } from "../AccountMenu";
import ThemeToggle from "../ThemeToggle";
import { LivePill } from "./LiveStatus";
import NotificationsBell from "./NotificationsBell";
import StreamModeToggle from "./StreamModeToggle";
import { restoreStreamMode } from "./streamMode";

// Barre latérale du dashboard : groupes titrés, icônes, formule et compte en bas. Sur mobile, une barre en haut
// ouvre la même navigation en tiroir. Les entrées liées à une fonction de la formule affichent un cadenas en Gratuit.

type Item = { label: string; href: string; icon: ComponentType<IconProps>; feature?: Feature; external?: boolean };
type Group = { title?: string; items: Item[] };

const GROUPS: Group[] = [
  { items: [{ label: "Vue d'ensemble", href: "/dashboard", icon: SquaresFour }] },
  {
    title: "Direct",
    items: [
      { label: "Mes relais", href: "/dashboard/relais", icon: Radio, feature: "relais" },
      { label: "Santé du flux", href: "/dashboard/sante", icon: Heartbeat, feature: "sante" },
      { label: "Aperçu", href: "/dashboard/apercu", icon: Eye, feature: "apercu" },
      { label: "Caméras externes", href: "/dashboard/dji", icon: VideoCamera, feature: "dji" },
      { label: "SYXTEE Studio", href: "/studio", icon: SlidersHorizontal, external: true },
    ],
  },
  {
    title: "Réseau",
    items: [
      { label: "Scan de zone", href: "/dashboard/scanner", icon: MapTrifold },
      { label: "Test ponctuel", href: "/dashboard/analyseur", icon: CellSignalFull },
    ],
  },
  {
    title: "Statistiques",
    items: [
      { label: "Vue globale", href: "/dashboard/stats", icon: ChartBar },
      { label: "Lives", href: "/dashboard/lives", icon: Television },
      { label: "Couverture", href: "/dashboard/contributions", icon: MapPinArea },
    ],
  },
];

const HELP: Item[] = [
  { label: "Support", href: "/dashboard/support", icon: Lifebuoy },
  { label: "Documentation", href: "/docs", icon: Question },
  { label: "Discord", href: site.discord, icon: ArrowSquareOut, external: true },
  { label: "Retour au site", href: "/", icon: ArrowSquareOut },
];

function NavLink({ item, active, locked, onNavigate }: { item: Item; active: boolean; locked?: boolean; onNavigate: () => void }) {
  const Icon = item.icon;
  const cls = `group flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors ${
    active ? "border border-line-strong bg-foreground/10 text-foreground" : "border border-transparent text-muted hover:bg-foreground/[0.06] hover:text-foreground"
  }`;
  const inner = (
    <>
      <Icon size={20} weight={active ? "fill" : "regular"} className="shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
      {locked && <Lock size={14} className="ml-auto shrink-0 text-muted" aria-label="Verrouillé dans ta formule" />}
    </>
  );
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls} onClick={onNavigate}>
      {inner}
    </a>
  ) : (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={cls} onClick={onNavigate}>
      {inner}
    </Link>
  );
}

function AccountFooter({ account, admin, onNavigate }: { account: NonNullable<ReturnType<typeof useAccount>>; admin: boolean; onNavigate: () => void }) {
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

  const links: { label: string; href: string }[] = [
    { label: "Profil & réseaux", href: "/dashboard/profil" },
    { label: "Mon accès", href: "/dashboard/abonnement" },
    { label: "Paramètres", href: "/dashboard/parametres" },
    ...(admin ? [{ label: "Administration", href: "/admin" }] : []),
  ];
  const item = "block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-foreground/10";

  return (
    <div className="flex items-center gap-1">
      <div ref={box} className="relative min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
        >
          <Avatar account={account} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{account.name}</span>
            <span className="mt-0.5 inline-block rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{account.planName}</span>
          </span>
          <CaretUpDown size={16} className="shrink-0 text-muted" aria-hidden="true" />
        </button>
        {open && (
          <div role="menu" className="absolute bottom-full left-0 z-50 mb-2 w-[calc(100%+3rem)] overflow-hidden rounded-xl border border-line bg-background py-1 shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
            <p className="px-4 pb-1 pt-2 text-xs font-medium text-muted">Mon compte</p>
            {links.map((l) => (
              <Link
                key={l.href}
                role="menuitem"
                href={l.href}
                onClick={() => {
                  setOpen(false);
                  onNavigate();
                }}
                className={item}
              >
                {l.label}
              </Link>
            ))}
            <form action={signOut} className="border-t border-line">
              <button type="submit" role="menuitem" className={`${item} flex items-center gap-2 text-red-400`}>
                <SignOut size={16} aria-hidden="true" />
                Se déconnecter
              </button>
            </form>
          </div>
        )}
      </div>
      <NotificationsBell />
    </div>
  );
}

function Content({ admin, onNavigate }: { admin: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const account = useAccount();
  const isActive = (href: string) => (href === "/dashboard" || href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  const locked = (i: Item) => !!i.feature && !!account && !account.features.includes(i.feature);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3" aria-label="Dashboard SYXTEE">
          <Image src="/logo-400.png" alt="" width={18} height={25} className="ink-img" priority />
          <span className="text-sm font-semibold tracking-[0.18em]">
            SYXTEE<span className="font-normal text-muted"> DASHBOARD</span>
          </span>
        </Link>
      </div>

      <div className="px-4 pb-3">
        <LivePill />
      </div>

      <nav aria-label="Navigation du dashboard" className="flex-1 space-y-4 overflow-y-auto px-3 pb-3">
        {GROUPS.map((g, i) => (
          <div key={g.title ?? i}>
            {g.title && <p className="px-3 pb-2 text-xs font-medium text-muted">{g.title}</p>}
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <li key={it.href}>
                  <NavLink item={it} active={isActive(it.href)} locked={locked(it)} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="px-3 pb-2 text-xs font-medium text-muted">Aide</p>
          <ul className="space-y-0.5">
            {HELP.map((it) => (
              <li key={it.href}>
                <NavLink item={it} active={false} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="space-y-3 border-t border-line p-4">
        <div className="flex items-center justify-between gap-2">
          <ThemeToggle />
          <StreamModeToggle />
        </div>
        {account && <AccountFooter account={account} admin={admin} onNavigate={onNavigate} />}
      </div>
    </div>
  );
}

/** Mise en page : barre latérale fixe en desktop, barre du haut et tiroir en mobile. */
export default function DashboardShell({ admin, children }: { admin: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    restoreStreamMode();
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-surface lg:block">
        <Content admin={admin} onNavigate={() => {}} />
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-background/90 px-4 backdrop-blur-md lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-3" aria-label="Dashboard SYXTEE">
          <Image src="/logo-400.png" alt="" width={20} height={28} className="ink-img" priority />
          <span className="text-sm font-semibold tracking-[0.18em]">SYXTEE</span>
        </Link>
        <div className="flex items-center gap-2">
          <LivePill compact />
          <button type="button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu" aria-expanded={open} className="rounded-lg p-2 hover:bg-foreground/10">
            <List size={22} />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu du dashboard">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative h-full w-[280px] max-w-[85vw] border-r border-line bg-surface">
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer le menu" className="absolute right-3 top-4 rounded-lg p-2 hover:bg-foreground/10">
              <X size={18} />
            </button>
            <Content admin={admin} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="min-w-0">{children}</div>
    </div>
  );
}
