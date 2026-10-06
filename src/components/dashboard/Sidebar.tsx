"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  ArrowLeft,
  CaretUpDown,
  ChatsCircle,
  ChartBar,
  Eye,
  FilmStrip,
  List,
  Lifebuoy,
  Lock,
  MapTrifold,
  Question,
  Radio,
  SignOut,
  SlidersHorizontal,
  SquaresFour,
  VideoCamera,
  X,
  type IconProps,
} from "@phosphor-icons/react";
import { signOut } from "@/app/(auth)/actions";
import type { Feature } from "@/lib/plans";
import { activeAlso } from "@/lib/dashboard-nav";
import { Avatar, useAccount } from "../AccountMenu";
import CloudBackdrop from "../home/CloudBackdrop";
import ThemeToggle from "../ThemeToggle";
import Wordmark from "../Wordmark";
import GlidePill from "../ui/GlidePill";
import { LivePill } from "./LiveStatus";
import NotificationsBell from "./NotificationsBell";
import StreamModeToggle from "./StreamModeToggle";
import { restoreStreamMode } from "./streamMode";

// Barre latérale du dashboard : groupes titrés, icônes, formule et compte en bas. Sur mobile, une barre en haut
// ouvre la même navigation en tiroir. Les entrées liées à une fonction de la formule affichent un cadenas en Gratuit.

type Item = { label: string; href: string; icon: ComponentType<IconProps>; feature?: Feature; external?: boolean; wordmark?: string; /** « À venir » : pas encore ouvert (l'admin y accède quand même). */ soon?: boolean };
type Group = { title?: string; items: Item[] };

// Barre épurée : une seule liste. Statistiques et Scanner regroupent leurs pages en onglets ; Discord et le retour au site sont dans le menu du compte.
const GROUPS: Group[] = [
  {
    title: "Direct",
    items: [
      { label: "Vue d'ensemble", href: "/dashboard", icon: SquaresFour },
      { label: "Mes relais", href: "/dashboard/relais", icon: Radio, feature: "relais" },
      { label: "Aperçu", href: "/dashboard/apercu", icon: Eye, feature: "apercu" },
      { label: "Enregistrements", href: "/dashboard/enregistrements", icon: FilmStrip, feature: "relais" },
      { label: "Multichat", href: "/dashboard/multichat", icon: ChatsCircle },
      { label: "Caméras externes", href: "/dashboard/dji", icon: VideoCamera, feature: "dji" },
    ],
  },
  {
    title: "Outils",
    items: [
      { label: "SYXTEE Commutateur", href: "/commutateur", icon: SlidersHorizontal, external: true, wordmark: "COMMUTATEUR", feature: "commutateur", soon: true },
      { label: "Scanner", href: "/dashboard/scanner", icon: MapTrifold },
      { label: "Statistiques", href: "/dashboard/stats", icon: ChartBar },
    ],
  },
];

const HELP: Item[] = [
  { label: "Support", href: "/dashboard/support", icon: Lifebuoy },
  { label: "Documentation", href: "/docs", icon: Question },
];

function NavLink({ item, active, locked, soon, onNavigate, hovered, onHover }: { item: Item; active: boolean; locked?: boolean; soon?: boolean; onNavigate: () => void; hovered?: boolean; onHover?: () => void }) {
  const Icon = item.icon;
  if (soon)
    return (
      <div aria-disabled="true" className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-muted lg:py-1.5">
        {item.wordmark ? (
          <span className="min-w-0 opacity-70" aria-label={item.label}>
            <Wordmark name={item.wordmark} size="sm" className="gap-2" />
          </span>
        ) : (
          <>
            <Icon size={20} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </>
        )}
        <span className="ml-auto shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]">À venir</span>
      </div>
    );
  const cls = `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium tracking-[0.01em] transition-colors lg:py-1.5 ${
    active ? "bg-foreground/10 text-foreground" : "text-muted hover:text-foreground"
  }`;
  const inner = (
    <>
      <GlidePill show={!!hovered && !active} id="dash-nav-pill" />
      {active && <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" />}
      {item.wordmark ? (
        <span className="relative z-10 min-w-0" aria-label={item.label}>
          <Wordmark name={item.wordmark} size="sm" className="gap-2" />
        </span>
      ) : (
        <>
          <Icon size={20} weight={active ? "fill" : "regular"} className="relative z-10 shrink-0" aria-hidden="true" />
          <span className="relative z-10 truncate">{item.label}</span>
        </>
      )}
      {locked && <Lock size={14} className="relative z-10 ml-auto shrink-0 text-muted" aria-label="Verrouillé dans ta formule" />}
    </>
  );
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls} onClick={onNavigate} onMouseEnter={onHover} onFocus={onHover}>
      {inner}
    </a>
  ) : (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={cls} onClick={onNavigate} onMouseEnter={onHover} onFocus={onHover}>
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
    { label: "Mon compte", href: "/compte" },
    { label: "Abonnement", href: "/dashboard/abonnement" },
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
  const isActive = (href: string) =>
    href === "/dashboard" || href === "/"
      ? pathname === href
      : [href, ...(activeAlso[href] ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`));
  const locked = (i: Item) => !!i.feature && !!account && !account.features.includes(i.feature);
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3" aria-label="Dashboard SYXTEE">
          <Image src="/logo-400.png" alt="" width={18} height={25} style={{ width: 18, height: "auto" }} className="ink-img" priority />
          <span className="text-sm font-semibold tracking-[0.18em]">
            SYXTEE<span className="font-normal text-muted"> DASHBOARD</span>
          </span>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        <LivePill />
        <Link
          href="/"
          onClick={onNavigate}
          className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-line px-3 text-sm text-muted transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Retour au site
        </Link>
      </div>

      <nav aria-label="Navigation du dashboard" className="flex-1 space-y-6 overflow-y-auto px-3 pb-3" onMouseLeave={() => setHover(null)}>
        {GROUPS.map((g, i) => (
          <div key={g.title ?? i}>
            {g.title && <p className="px-3 pb-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted">{g.title}</p>}
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <li key={it.href}>
                  <NavLink item={it} active={isActive(it.href)} locked={locked(it)} soon={it.soon && !admin} onNavigate={onNavigate} hovered={hover === it.href} onHover={() => setHover(it.href)} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="px-3 pb-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Aide</p>
          <ul className="space-y-0.5">
            {HELP.map((it) => (
              <li key={it.href}>
                <NavLink item={it} active={false} onNavigate={onNavigate} hovered={hover === it.href} onHover={() => setHover(it.href)} />
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

// Barre d'onglets du bas (mobile) : les 4 pages du quotidien à portée de pouce, le reste dans le tiroir.
const TAB_HREFS = ["/dashboard", "/dashboard/relais", "/dashboard/apercu", "/dashboard/dji"];
const TABS: Item[] = TAB_HREFS.map((h) => GROUPS[0].items.find((i) => i.href === h)!);

function MobileTabs({ onMenu, menuOpen }: { onMenu: () => void; menuOpen: boolean }) {
  const pathname = usePathname();
  const account = useAccount();
  const cell = "relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] transition-colors active:scale-[0.97]";
  return (
    <nav aria-label="Navigation rapide" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-2 pt-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = t.href === "/dashboard" ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
          const locked = !!t.feature && !!account && !account.features.includes(t.feature);
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={on ? "page" : undefined} className={`${cell} ${on ? "text-foreground" : "text-muted"}`}>
                {on && <span aria-hidden="true" className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent" />}
                <Icon size={22} weight={on ? "fill" : "regular"} aria-hidden="true" />
                <span className="max-w-full truncate">{t.label === "Vue d'ensemble" ? "Accueil" : t.label === "Mes relais" ? "Relais" : t.label === "Caméras externes" ? "Caméras" : t.label}</span>
                {locked && <Lock size={10} className="absolute right-3 top-1.5 text-muted" aria-label="Verrouillé dans ta formule" />}
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onMenu} aria-expanded={menuOpen} aria-label="Ouvrir le menu" className={`${cell} w-full text-muted`}>
            <List size={22} aria-hidden="true" />
            <span>Menu</span>
          </button>
        </li>
      </ul>
    </nav>
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
  // Tiroir ouvert : la page derrière ne défile plus.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="dash-surface min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-surface lg:block">
        <Content admin={admin} onNavigate={() => {}} />
      </aside>

      <header className="sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between gap-2 border-b border-line bg-background/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-3" aria-label="Dashboard SYXTEE">
          <Image src="/logo-400.png" alt="" width={20} height={28} style={{ width: 20, height: "auto" }} className="ink-img" priority />
          <span className="text-sm font-semibold tracking-[0.18em]">SYXTEE</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <Link href="/" aria-label="Retour au site" className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-foreground/10 hover:text-foreground">
            <ArrowLeft size={20} />
          </Link>
          <LivePill compact />
          <button type="button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu" aria-expanded={open} className="grid h-11 w-11 place-items-center rounded-lg hover:bg-foreground/10">
            <List size={22} />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu du dashboard">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative h-dvh w-[300px] max-w-[88vw] border-r border-line bg-surface pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer le menu" className="absolute right-3 top-[calc(0.5rem+env(safe-area-inset-top))] grid h-11 w-11 place-items-center rounded-lg hover:bg-foreground/10">
              <X size={18} />
            </button>
            <Content admin={admin} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <MobileTabs onMenu={() => setOpen(true)} menuOpen={open} />

      <div className="relative min-w-0 pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
        {/* Fond de la page : même principe que l'accueil (dégradé rouge et nuages animés), qui se fond dans le thème vers le bas. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_35%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_35%,transparent_100%)]">
          <CloudBackdrop tone="theme" />
        </div>
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
