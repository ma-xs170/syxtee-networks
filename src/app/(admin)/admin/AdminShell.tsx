"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";
import ThemeToggle from "@/components/ThemeToggle";

// Espace admin : sa propre barre latérale, séparée du dashboard client (autre fond de logo, autre titre). Sur la page
// /admin/2fa (double authentification) la barre est masquée. Mobile : navigation en rangée défilante.

type Item = { label: string; href: string; badge?: number };
type Group = { title?: string; items: Item[] };

function groups(openTickets: number): Group[] {
  return [
    { items: [{ label: "Vue d'ensemble", href: "/admin" }] },
    {
      title: "Clients",
      items: [
        { label: "Support", href: "/admin/support", badge: openTickets },
        { label: "Comptes", href: "/admin/comptes" },
        { label: "Partenaires", href: "/admin/partenaires" },
        { label: "Notifications", href: "/admin/notifications" },
      ],
    },
    {
      title: "Infrastructure",
      items: [
        { label: "Relais", href: "/admin/relais" },
        { label: "Carte", href: "/admin/carte" },
        { label: "Revenus", href: "/admin/revenus" },
      ],
    },
    {
      title: "Sécurité",
      items: [
        { label: "Alertes", href: "/admin/securite" },
        { label: "Journal", href: "/admin/journal" },
        { label: "Équipe", href: "/admin/equipe" },
      ],
    },
  ];
}

export default function AdminShell({ openTickets, name, children }: { openTickets: number; name: string; children: ReactNode }) {
  const path = usePathname();
  if (path === "/admin/2fa") return <>{children}</>;
  const all = groups(openTickets);
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface lg:flex">
        <Link href="/admin" className="flex items-center gap-3 px-5 pb-4 pt-5" aria-label="Espace admin SYXTEE">
          <Image src="/logo-400.png" alt="" width={18} height={25} className="ink-img" priority />
          <span className="text-sm font-semibold tracking-[0.18em]">
            SYXTEE<span className="font-normal text-muted"> ADMIN</span>
          </span>
        </Link>
        <nav aria-label="Navigation admin" className="flex-1 space-y-5 overflow-y-auto px-3 pb-3">
          {all.map((g, i) => (
            <div key={g.title ?? i}>
              {g.title && <p className="px-3 pb-2 text-xs font-medium text-muted">{g.title}</p>}
              <ul className="space-y-0.5">
                {g.items.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      aria-current={active(it.href) ? "page" : undefined}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${active(it.href) ? "border-line-strong bg-foreground/10 text-foreground" : "border-transparent text-muted hover:bg-foreground/[0.06] hover:text-foreground"}`}
                    >
                      {it.label}
                      {!!it.badge && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium tabular-nums text-on-accent">{it.badge}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="space-y-3 border-t border-line p-4">
          <Link href="/dashboard" className="block text-sm text-muted transition-colors hover:text-foreground">
            ← Retour au dashboard
          </Link>
          <div className="flex items-center justify-between gap-2">
            <ThemeToggle />
            <form action={signOut}>
              <button type="submit" className="text-sm text-muted transition-colors hover:text-foreground">
                Déconnexion
              </button>
            </form>
          </div>
          <p className="truncate text-xs text-muted">{name}</p>
        </div>
      </aside>

      <div className="min-w-0">
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
        {children}
      </div>
    </div>
  );
}
