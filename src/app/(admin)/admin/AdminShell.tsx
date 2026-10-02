"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { ChartLineUp, ClockCounterClockwise, Globe, Key, Lifebuoy, MapTrifold, Radio, ShieldWarning, SquaresFour, Users, UsersThree, Bell, type IconProps } from "@phosphor-icons/react";
import { signOut } from "@/app/(auth)/actions";
import CloudBackdrop from "@/components/home/CloudBackdrop";
import ThemeToggle from "@/components/ThemeToggle";

// Espace admin : sa propre barre latérale, séparée du dashboard client (autre fond de logo, autre titre). Sur la page
// /admin/2fa (double authentification) la barre est masquée. Mobile : navigation en rangée défilante.

type Icon = ComponentType<IconProps>;
type Item = { label: string; href: string; badge?: number; icon: Icon };
type Group = { title?: string; items: Item[] };

function groups(openTickets: number, pending: number): Group[] {
  return [
    { items: [{ icon: SquaresFour, label: "Vue d'ensemble", href: "/admin" }] },
    {
      title: "Clients",
      items: [
        { icon: Key, label: "Demandes d'accès", href: "/admin/acces", badge: pending },
        { icon: Lifebuoy, label: "Support", href: "/admin/support", badge: openTickets },
        { icon: Users, label: "Comptes", href: "/admin/comptes" },
        { icon: UsersThree, label: "Partenaires", href: "/admin/partenaires" },
        { icon: Bell, label: "Notifications", href: "/admin/notifications" },
      ],
    },
    {
      title: "Infrastructure",
      items: [
        { icon: Radio, label: "Relais", href: "/admin/relais" },
        { icon: MapTrifold, label: "Carte", href: "/admin/carte" },
        { icon: ChartLineUp, label: "Revenus", href: "/admin/revenus" },
      ],
    },
    {
      title: "Sécurité",
      items: [
        { icon: ShieldWarning, label: "Alertes", href: "/admin/securite" },
        { icon: ClockCounterClockwise, label: "Journal", href: "/admin/journal" },
        { icon: Globe, label: "Équipe", href: "/admin/equipe" },
      ],
    },
  ];
}

export default function AdminShell({ openTickets, pendingAccess, name, children }: { openTickets: number; pendingAccess: number; name: string; children: ReactNode }) {
  const path = usePathname();
  if (path === "/admin/2fa") return <>{children}</>;
  const all = groups(openTickets, pendingAccess);
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));

  return (
    <div className="dash-surface min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface lg:flex">
        <Link href="/admin" className="flex items-center gap-3 px-5 pb-4 pt-5" aria-label="Espace admin SYXTEE">
          <Image src="/logo-400.png" alt="" width={18} height={25} className="ink-img" priority />
          <span className="text-sm font-semibold tracking-[0.18em]">
            SYXTEE<span className="font-normal text-muted"> ADMIN</span>
          </span>
        </Link>
        <nav aria-label="Navigation admin" className="flex-1 overflow-y-auto px-3 pb-3">
          {all.map((g, i) => (
            <div key={g.title ?? i} className={i > 0 ? "mt-4 border-t border-line pt-4" : ""}>
              {g.title && <p className="px-3 pb-2 text-[13px] font-semibold text-foreground">{g.title}</p>}
              <ul className="space-y-1">
                {g.items.map((it) => {
                  const on = active(it.href);
                  const Icon = it.icon;
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        aria-current={on ? "page" : undefined}
                        className={`relative flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${on ? "border-line-strong bg-foreground/10 font-semibold text-foreground" : "border-transparent text-muted hover:bg-foreground/[0.06] hover:text-foreground"}`}
                      >
                        {on && <span aria-hidden="true" className="absolute -left-3 top-2 h-5 w-1 rounded-r bg-accent" />}
                        <Icon size={18} weight={on ? "fill" : "regular"} className="shrink-0" aria-hidden="true" />
                        <span className="flex-1">{it.label}</span>
                        {!!it.badge && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold tabular-nums text-on-accent">{it.badge}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="space-y-3 border-t border-line p-4">
          <Link href="/dashboard" className="block text-sm text-muted transition-colors hover:text-foreground">
            ← Retour au dashboard
          </Link>
          <ThemeToggle />
          <form action={signOut}>
            <button type="submit" className="text-sm text-muted transition-colors hover:text-foreground">
              Déconnexion
            </button>
          </form>
          <p className="truncate text-xs text-muted">{name}</p>
        </div>
      </aside>

      <div className="relative min-w-0">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_35%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_35%,transparent_100%)]">
          <CloudBackdrop tone="theme" />
        </div>
        <nav aria-label="Navigation admin" className="sticky top-0 z-40 flex gap-1 overflow-x-auto border-b border-line bg-background/95 px-3 py-2 backdrop-blur lg:hidden">
          <Link href="/dashboard" className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-muted">
            ← Dashboard
          </Link>
          {all.flatMap((g) => g.items).map((it) => (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active(it.href) ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${active(it.href) ? "bg-foreground/10 text-foreground" : "text-muted"}`}
            >
              {it.label}
              {!!it.badge && <span className="ml-1.5 tabular-nums text-accent">{it.badge}</span>}
            </Link>
          ))}
        </nav>
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
