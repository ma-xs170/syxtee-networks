"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";
import { Bell, ChartLineUp, ClockCounterClockwise, Globe, Key, Lifebuoy, List, MapTrifold, Radio, Robot, ShieldWarning, SquaresFour, Tag, Users, UsersThree, X, type IconProps } from "@/components/icons";
import CloudBackdrop from "@/components/home/CloudBackdrop";
import ThemeToggle from "@/components/ThemeToggle";
import GlidePill from "@/components/ui/GlidePill";
import { ROLE_META, roleStyle, type AnyRole, type Permission } from "@/lib/staff";
import { SUPPORT_CATEGORIES, type SupportCategory } from "@/lib/support-categories";

// Espace admin : sa propre barre latérale (ordinateur) et, sur téléphone, une barre d'onglets en bas + un tiroir qui reprend
// les mêmes groupes. Chaque entrée n'apparaît que si le membre a la permission correspondante (le serveur la revérifie partout).
// Sur /admin/2fa (double authentification) la coque est masquée.

type Icon = ComponentType<IconProps>;
/** `perm` : permission requise ; « full » : propriétaire et administrateurs ; « any » : tout membre. */
type Need = Permission | "full" | "any";
type Child = { label: string; href: string; badge: number; key: string };
type Item = { label: string; href: string; icon: Icon; need: Need; badge?: number; children?: Child[] };
type Group = { title?: string; items: Item[] };
export type SupportBadges = { all: number; byCategory: Record<SupportCategory, number> };

function groups(support: SupportBadges, pending: number): Group[] {
  return [
    { items: [{ icon: SquaresFour, label: "Vue d'ensemble", href: "/admin", need: "full" }] },
    {
      title: "Clients",
      items: [
        {
          icon: Lifebuoy,
          label: "Support",
          href: "/admin/support",
          need: "support",
          badge: support.all,
          // Tous, puis chaque catégorie séparément : une pastille par catégorie (demandes qui attendent une réponse).
          children: [{ key: "tous", label: "Tous", href: "/admin/support", badge: support.all }, ...SUPPORT_CATEGORIES.map((c) => ({ key: c.id, label: c.label, href: `/admin/support?categorie=${c.id}`, badge: support.byCategory[c.id] }))],
        },
        { icon: Key, label: "Demandes d'accès", href: "/admin/acces", need: "access", badge: pending },
        { icon: Users, label: "Comptes", href: "/admin/comptes", need: "accounts" },
        { icon: UsersThree, label: "Comptes gérés", href: "/admin/comptes-geres", need: "accounts" },
        { icon: UsersThree, label: "Partenaires", href: "/admin/partenaires", need: "partners" },
        { icon: Key, label: "Codes Encodeur", href: "/admin/encodeurs", need: "accounts" },
      ],
    },
    {
      title: "Plateforme",
      items: [
        { icon: Radio, label: "Relais", href: "/admin/relais", need: "relays" },
        { icon: MapTrifold, label: "Carte", href: "/admin/carte", need: "relays" },
        { icon: Tag, label: "Versions", href: "/admin/versions", need: "versions" },
        { icon: Bell, label: "Notifications", href: "/admin/notifications", need: "notifications" },
        { icon: Robot, label: "Discord", href: "/admin/discord", need: "discord" },
      ],
    },
    { title: "Finances", items: [{ icon: ChartLineUp, label: "Revenus", href: "/admin/revenus", need: "revenue" }] },
    {
      title: "Sécurité",
      items: [
        { icon: ShieldWarning, label: "Alertes", href: "/admin/securite", need: "security" },
        { icon: ClockCounterClockwise, label: "Journal", href: "/admin/journal", need: "journal" },
      ],
    },
    { title: "Équipe", items: [{ icon: Globe, label: "Équipe", href: "/admin/equipe", need: "any" }] },
  ];
}

export type AdminShellProps = { support: SupportBadges; pendingAccess: number; name: string; role: AnyRole; permissions: Permission[]; full: boolean; children: ReactNode };

export default function AdminShell({ support, pendingAccess, name, role, permissions, full, children }: AdminShellProps) {
  const path = usePathname();
  const category = useSearchParams().get("categorie");
  const [hover, setHover] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawer(false), 0);
    return () => clearTimeout(t);
  }, [path]);
  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawer]);
  if (path === "/admin/2fa") return <>{children}</>;

  const allowed = (n: Need) => n === "any" || full || (n !== "full" && permissions.includes(n));
  const all = groups(support, pendingAccess)
    .map((g) => ({ ...g, items: g.items.filter((i) => allowed(i.need)) }))
    .filter((g) => g.items.length > 0);
  const flat = all.flatMap((g) => g.items);
  const onSupport = path === "/admin/support" || path.startsWith("/admin/support/");
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));
  const meta = ROLE_META[role];

  // Barre du bas (téléphone) : les trois entrées les plus utiles de CE membre, puis le menu.
  const PREFERRED = ["/admin", "/admin/support", "/admin/comptes", "/admin/acces", "/admin/securite", "/admin/relais", "/admin/equipe"];
  const tabs = PREFERRED.map((h) => flat.find((i) => i.href === h)).filter((i): i is Item => !!i).slice(0, 3);

  const roleChip = (
    <span style={roleStyle(role)} className="inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]">
      {meta.short}
    </span>
  );

  const navList = (compact: boolean) => (
    <nav aria-label="Navigation admin" className="flex-1 overflow-y-auto px-3 pb-3" onMouseLeave={() => setHover(null)}>
      {all.map((g, i) => (
        <div key={g.title ?? i} className={i > 0 ? "mt-4 border-t border-line pt-4" : ""}>
          {g.title && <p className="px-3 pb-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{g.title}</p>}
          <ul className="space-y-1">
            {g.items.map((it) => {
              const on = active(it.href);
              const Icon = it.icon;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    aria-current={on ? "page" : undefined}
                    onMouseEnter={() => setHover(it.href)}
                    onFocus={() => setHover(it.href)}
                    className={`relative flex items-center gap-3 rounded-lg border px-3 text-sm transition-colors ${compact ? "min-h-12 py-2.5" : "py-2"} ${on ? "border-line-strong bg-foreground/10 font-semibold text-foreground" : "border-transparent text-muted hover:bg-foreground/[0.06] hover:text-foreground"}`}
                  >
                    {!compact && <GlidePill show={hover === it.href && !on} id="admin-nav-pill" />}
                    {on && !compact && <span aria-hidden="true" className="absolute -left-3 top-2 h-5 w-1 rounded-r bg-accent" />}
                    <Icon size={18} weight={on ? "fill" : "regular"} className="relative z-10 shrink-0" aria-hidden="true" />
                    <span className="relative z-10 flex-1">{it.label}</span>
                    {!!it.badge && <span className="relative z-10 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold tabular-nums text-on-accent">{it.badge}</span>}
                  </Link>
                  {it.children && (
                    <ul aria-label="Catégories du support" className="ml-5 mt-1 space-y-0.5 border-l border-line pl-3">
                      {it.children.map((c) => {
                        const here = onSupport && (c.key === "tous" ? !category : category === c.key);
                        return (
                          <li key={c.key}>
                            <Link
                              href={c.href}
                              aria-current={here && path === "/admin/support" ? "page" : undefined}
                              className={`flex items-center justify-between gap-2 rounded-md px-2.5 text-[13px] transition-colors ${compact ? "min-h-11" : "py-1.5"} ${here ? "bg-foreground/10 font-semibold text-foreground" : "text-muted hover:bg-foreground/[0.06] hover:text-foreground"}`}
                            >
                              <span className="truncate">{c.label}</span>
                              {c.badge > 0 && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-on-accent">{c.badge}</span>}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="space-y-3 border-t border-line p-4">
      <Link href="/dashboard" className="flex min-h-9 items-center text-sm text-muted transition-colors hover:text-foreground">
        ← Retour au dashboard
      </Link>
      <ThemeToggle />
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs text-muted" data-sensitive>
          {name}
        </p>
        {roleChip}
      </div>
      <form action={signOut}>
        <button type="submit" className="flex min-h-9 items-center text-sm text-muted transition-colors hover:text-foreground">
          Déconnexion
        </button>
      </form>
    </div>
  );

  const tabCell = "relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] transition-colors active:scale-[0.97]";

  return (
    <div className="dash-surface min-h-dvh lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface lg:flex">
        <Link href={flat[0]?.href ?? "/admin"} className="flex items-center gap-3 px-5 pb-4 pt-5" aria-label="Espace admin SYXTEE">
          <Image src="/logo-400.png" alt="" width={18} height={25} style={{ width: 18, height: "auto" }} className="ink-img" priority />
          <span className="text-sm font-semibold tracking-[0.18em]">
            SYXTEE<span className="font-normal text-muted"> ADMIN</span>
          </span>
        </Link>
        {navList(false)}
        {footer}
      </aside>

      <div className="relative min-w-0">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_35%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_35%,transparent_100%)]">
          <CloudBackdrop tone="theme" />
        </div>

        {/* Téléphone : barre du haut (rôle) */}
        <header className="sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between gap-2 border-b border-line bg-background/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
          <Link href={flat[0]?.href ?? "/admin"} className="flex items-center gap-3" aria-label="Espace admin SYXTEE">
            <Image src="/logo-400.png" alt="" width={20} height={28} style={{ width: 20, height: "auto" }} className="ink-img" priority />
            <span className="text-sm font-semibold tracking-[0.18em]">
              SYXTEE<span className="font-normal text-muted"> ADMIN</span>
            </span>
          </Link>
          {roleChip}
        </header>

        <div className="relative pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</div>
      </div>

      {/* Téléphone : tiroir et barre d'onglets */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu admin">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <div className="relative flex h-dvh w-[310px] max-w-[88vw] flex-col border-r border-line bg-surface pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
            <div className="flex items-center justify-between px-4 pb-3 pt-4">
              <span className="text-sm font-semibold tracking-[0.18em]">
                SYXTEE<span className="font-normal text-muted"> ADMIN</span>
              </span>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Fermer le menu" className="grid size-11 place-items-center rounded-lg hover:bg-foreground/10">
                <X size={18} />
              </button>
            </div>
            {navList(true)}
            {footer}
          </div>
        </div>
      )}
      <nav aria-label="Navigation rapide admin" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <ul className={`mx-auto grid max-w-lg gap-1 px-2 pt-1.5 ${tabs.length === 3 ? "grid-cols-4" : tabs.length === 2 ? "grid-cols-3" : tabs.length === 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {tabs.map((t) => {
            const on = active(t.href);
            const Icon = t.icon;
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={on ? "page" : undefined} className={`${tabCell} ${on ? "text-foreground" : "text-muted"}`}>
                  {on && <span aria-hidden="true" className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent" />}
                  <Icon size={22} weight={on ? "fill" : "regular"} aria-hidden="true" />
                  <span className="max-w-full truncate">{t.label === "Vue d'ensemble" ? "Accueil" : t.label === "Demandes d'accès" ? "Accès" : t.label}</span>
                  {!!t.badge && <span className="absolute right-3 top-1 rounded-full bg-accent px-1.5 text-[10px] font-semibold tabular-nums text-on-accent">{t.badge}</span>}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setDrawer(true)} aria-expanded={drawer} aria-label="Ouvrir le menu" className={`${tabCell} w-full text-muted`}>
              <List size={22} aria-hidden="true" />
              <span>Menu</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
