"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import {
  ArrowSquareOut,
  CellSignalFull,
  ChartBar,
  CreditCard,
  Eye,
  Gear,
  Heartbeat,
  List,
  Lock,
  MapPinArea,
  MapTrifold,
  Question,
  Radio,
  ShieldCheck,
  SignOut,
  SlidersHorizontal,
  SquaresFour,
  TelevisionSimple,
  Television,
  UserCircle,
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
      { label: "Mire de coupure", href: "/dashboard/mire", icon: TelevisionSimple, feature: "mire" },
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

const ACCOUNT: Item[] = [
  { label: "Profil & réseaux", href: "/dashboard/profil", icon: UserCircle },
  { label: "Abonnement", href: "/dashboard/abonnement", icon: CreditCard },
  { label: "Paramètres", href: "/dashboard/parametres", icon: Gear },
];

const HELP: Item[] = [
  { label: "Documentation", href: "/docs", icon: Question },
  { label: "Discord", href: site.discord, icon: ArrowSquareOut, external: true },
  { label: "Retour au site", href: "/", icon: ArrowSquareOut },
];

function NavLink({ item, active, locked, onNavigate }: { item: Item; active: boolean; locked?: boolean; onNavigate: () => void }) {
  const Icon = item.icon;
  const cls = `group flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors ${
    active ? "border border-line-strong bg-accent/10 text-foreground" : "border border-transparent text-muted hover:bg-accent/[0.06] hover:text-foreground"
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

function Content({ admin, onNavigate }: { admin: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const account = useAccount();
  const isActive = (href: string) => (href === "/dashboard" || href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  const locked = (i: Item) => !!i.feature && !!account && !account.features.includes(i.feature);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3" aria-label="Dashboard SYXTEE">
          <Image src="/logo-400.png" alt="" width={24} height={33} className="ink-img" priority />
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
            {g.title && <p className="label-mono px-3 pb-2 text-[10px]">{g.title}</p>}
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
          <p className="label-mono px-3 pb-2 text-[10px]">Compte</p>
          <ul className="space-y-0.5">
            {ACCOUNT.map((it) => (
              <li key={it.href}>
                <NavLink item={it} active={isActive(it.href)} onNavigate={onNavigate} />
              </li>
            ))}
            {admin && (
              <li>
                <NavLink item={{ label: "Administration", href: "/admin", icon: ShieldCheck }} active={isActive("/admin")} onNavigate={onNavigate} />
              </li>
            )}
          </ul>
        </div>

        <div>
          <p className="label-mono px-3 pb-2 text-[10px]">Aide</p>
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
        {account && (
          <div className="flex items-center gap-3">
            <Avatar account={account} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{account.name}</p>
              <span className="mt-0.5 inline-block rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{account.planName}</span>
            </div>
            <form action={signOut}>
              <button type="submit" aria-label="Déconnexion" title="Déconnexion" className="rounded-lg p-2 text-muted transition-colors hover:bg-accent/10 hover:text-foreground">
                <SignOut size={18} />
              </button>
            </form>
          </div>
        )}
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
          <button type="button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu" aria-expanded={open} className="rounded-lg p-2 hover:bg-accent/10">
            <List size={22} />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu du dashboard">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative h-full w-[280px] max-w-[85vw] border-r border-line bg-surface">
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer le menu" className="absolute right-3 top-4 rounded-lg p-2 hover:bg-accent/10">
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
