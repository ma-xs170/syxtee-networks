"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";
import { Bell, ChartLineUp, Globe, Lifebuoy, List, Radio, ShieldWarning, SquaresFour, Users, UsersThree, X, type IconProps } from "@/components/icons";
import { ROLE_META, roleStyle, type AnyRole, type Permission } from "@/lib/staff";
import { type SupportCategory } from "@/lib/support-categories";

// Espace admin, direction éditoriale : colonne de navigation plate (un pas de ton, aucun filet), fil d'Ariane en haut, et sur téléphone
// une barre d'onglets en bas + un tiroir qui reprend les mêmes groupes. Chaque entrée n'apparaît que si le membre a la permission
// correspondante (le serveur la revérifie partout). Sur /admin/2fa (double authentification) la coque est masquée.

type Icon = ComponentType<IconProps>;
/** `perm` : permission requise ; « full » : propriétaire et administrateurs ; « any » : tout membre. */
type Need = Permission | "full" | "any";
type Tab = { label: string; href: string; need: Need; badge?: number };
/** Une entrée du menu peut regrouper plusieurs pages voisines (`tabs`) : une seule ligne dans le menu, un sélecteur en haut de page. */
type Item = { label: string; href: string; icon: Icon; need: Need; badge?: number; tabs?: Tab[] };
type Group = { title?: string; items: Item[] };
export type SupportBadges = { all: number; byCategory: Record<SupportCategory, number> };

function groups(support: SupportBadges, pending: number, quotes: number): Group[] {
  return [
    { items: [{ icon: SquaresFour, label: "Vue d'ensemble", href: "/admin", need: "full" }] },
    {
      title: "Clients",
      items: [
        {
          icon: Lifebuoy,
          label: "Demandes",
          href: "/admin/support",
          need: "any",
          tabs: [
            { label: "Support", href: "/admin/support", need: "support", badge: support.all },
            { label: "Accès", href: "/admin/acces", need: "access", badge: pending },
            { label: "Devis", href: "/admin/devis", need: "access", badge: quotes },
          ],
        },
        {
          icon: Users,
          label: "Comptes",
          href: "/admin/comptes",
          need: "any",
          tabs: [
            { label: "Comptes", href: "/admin/comptes", need: "accounts" },
            { label: "Comptes gérés", href: "/admin/comptes-geres", need: "accounts" },
            { label: "Codes Encodeur", href: "/admin/encodeurs", need: "accounts" },
          ],
        },
        {
          icon: UsersThree,
          label: "Partenariats",
          href: "/admin/partenaires",
          need: "any",
          tabs: [
            { label: "Partenaires", href: "/admin/partenaires", need: "partners" },
            { label: "Chaînes accueil", href: "/admin/chaines", need: "partners" },
            { label: "Vidéastes", href: "/admin/videastes", need: "partners" },
          ],
        },
      ],
    },
    {
      title: "Plateforme",
      items: [
        {
          icon: Radio,
          label: "Relais",
          href: "/admin/relais",
          need: "any",
          tabs: [
            { label: "Relais", href: "/admin/relais", need: "relays" },
            { label: "Carte", href: "/admin/carte", need: "relays" },
          ],
        },
        {
          icon: Bell,
          label: "Publication",
          href: "/admin/versions",
          need: "any",
          tabs: [
            { label: "Versions", href: "/admin/versions", need: "versions" },
            { label: "Notifications", href: "/admin/notifications", need: "notifications" },
            { label: "Discord", href: "/admin/discord", need: "discord" },
          ],
        },
      ],
    },
    { title: "Finances", items: [{ icon: ChartLineUp, label: "Revenus", href: "/admin/revenus", need: "revenue" }] },
    {
      title: "Sécurité",
      items: [
        {
          icon: ShieldWarning,
          label: "Sécurité",
          href: "/admin/securite",
          need: "any",
          tabs: [
            { label: "Alertes", href: "/admin/securite", need: "security" },
            { label: "Erreurs", href: "/admin/erreurs", need: "security" },
            { label: "Journal", href: "/admin/journal", need: "journal" },
          ],
        },
      ],
    },
    { title: "Équipe", items: [{ icon: Globe, label: "Équipe", href: "/admin/equipe", need: "any" }] },
  ];
}

export type AdminShellProps = { support: SupportBadges; pendingAccess: number; newQuotes?: number; name: string; role: AnyRole; permissions: Permission[]; full: boolean; children: ReactNode };

export default function AdminShell({ support, pendingAccess, newQuotes = 0, name, role, permissions, full, children }: AdminShellProps) {
  const path = usePathname();
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
  // Une entrée à onglets garde seulement les onglets permis ; son lien mène au premier, son badge cumule les leurs.
  const all = groups(support, pendingAccess, newQuotes)
    .map((g) => ({
      ...g,
      items: g.items
        .map((i) => {
          if (!i.tabs) return i;
          const tabs = i.tabs.filter((t) => allowed(t.need));
          return { ...i, tabs, href: tabs[0]?.href ?? i.href, badge: tabs.reduce((n, t) => n + (t.badge ?? 0), 0) };
        })
        .filter((i) => (i.tabs ? i.tabs.length > 0 : allowed(i.need))),
    }))
    .filter((g) => g.items.length > 0);
  const flat = all.flatMap((g) => g.items);
  const isOn = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));
  const active = (it: Item) => (it.tabs ? it.tabs.some((t) => isOn(t.href)) : isOn(it.href));
  const meta = ROLE_META[role];

  // Barre du bas (téléphone) : les trois entrées les plus utiles de CE membre, puis le menu.
  const PREFERRED = ["/admin", "/admin/support", "/admin/comptes", "/admin/acces", "/admin/securite", "/admin/relais", "/admin/equipe"];
  const tabs = PREFERRED.map((h) => flat.find((i) => i.href === h)).filter((i): i is Item => !!i).slice(0, 3);

  const roleChip = (
    <span style={roleStyle(role)} className="inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]">
      {meta.short}
    </span>
  );
  const current = flat.find((i) => active(i));
  const currentTab = current?.tabs?.find((t) => isOn(t.href));
  const section = all.find((g) => g.items.some((i) => i === current))?.title;

  const navList = (compact: boolean) => (
    <nav aria-label="Navigation admin" className="flex-1 overflow-y-auto px-4 pb-4">
      {all.map((g, i) => (
        <div key={g.title ?? i} className={i > 0 ? "mt-7" : ""}>
          {g.title && <p className="px-3 pb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-faint">{g.title}</p>}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const on = active(it);
              const Icon = it.icon;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    aria-current={on ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 text-[14px] transition-colors ${compact ? "min-h-12 py-2.5" : "py-2"} ${on ? "adm-nav-on font-semibold" : "text-muted hover:bg-foreground/[0.05] hover:text-foreground"}`}
                  >
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
  );

  const footer = (
    <div className="space-y-1 p-4">
      <Link href="/dashboard" className="flex min-h-10 items-center rounded-xl px-3 text-sm text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground">
        ← Retour au dashboard
      </Link>
      <form action={signOut}>
        <button type="submit" className="flex min-h-10 w-full items-center rounded-xl px-3 text-sm text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground">
          Déconnexion
        </button>
      </form>
    </div>
  );

  const brand = (
    <span className="text-[15px] font-semibold tracking-[0.04em]">
      SYXTEE<span className="font-normal text-muted"> ADMIN</span>
    </span>
  );
  const tabCell = "relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] transition-colors active:scale-[0.97]";

  return (
    <div className="adm dash-surface min-h-dvh lg:grid lg:grid-cols-[var(--adm-rail)_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col bg-[var(--adm-step-1)] lg:flex">
        <Link href={flat[0]?.href ?? "/admin"} className="flex items-center gap-3 px-7 pb-6 pt-7" aria-label="Espace admin SYXTEE">
          <Image src="/logo-400.png" alt="" width={18} height={25} style={{ width: 18, height: "auto" }} className="ink-img" priority />
          {brand}
        </Link>
        {navList(false)}
        {footer}
      </aside>

      <div className="relative min-w-0">
        {/* Ordinateur : fil d'Ariane et identité */}
        <div className="sticky top-0 z-30 hidden h-14 items-center justify-between gap-4 bg-background/90 px-8 backdrop-blur-md lg:flex">
          <p className="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Admin{section ? ` / ${section}` : ""}
            {current ? <span className="text-foreground"> / {currentTab && currentTab.label !== current.label ? `${current.label} / ${currentTab.label}` : current.label}</span> : null}
          </p>
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate text-xs text-muted" data-sensitive>{name}</span>
            {roleChip}
          </div>
        </div>

        {/* Téléphone : barre du haut (rôle) */}
        <header className="sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between gap-2 bg-background/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
          <Link href={flat[0]?.href ?? "/admin"} className="flex items-center gap-3" aria-label="Espace admin SYXTEE">
            <Image src="/logo-400.png" alt="" width={20} height={28} style={{ width: 20, height: "auto" }} className="ink-img" priority />
            {brand}
          </Link>
          {roleChip}
        </header>

        {current?.tabs && current.tabs.length > 1 && (
          <nav aria-label={current.label} className="mx-auto w-full max-w-[1280px] overflow-x-auto px-4 pt-6 sm:px-8 sm:pt-8">
            <ul className="flex w-max gap-1 rounded-full bg-[var(--adm-step-1)] p-1">
              {current.tabs.map((t) => {
                const on = isOn(t.href);
                return (
                  <li key={t.href}>
                    <Link href={t.href} aria-current={on ? "page" : undefined} className={`flex min-h-9 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm transition-colors ${on ? "bg-foreground font-semibold text-background" : "text-muted hover:text-foreground"}`}>
                      {t.label}
                      {!!t.badge && <span className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${on ? "bg-background/20" : "bg-foreground/10 text-foreground"}`}>{t.badge}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
        <main id="contenu" className="relative pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>
      </div>

      {/* Téléphone : tiroir et barre d'onglets */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu admin">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <div className="relative flex h-dvh w-[310px] max-w-[88vw] flex-col bg-surface pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
            <div className="flex items-center justify-between px-5 pb-3 pt-4">
              {brand}
              <button type="button" onClick={() => setDrawer(false)} aria-label="Fermer le menu" className="grid size-11 place-items-center rounded-lg hover:bg-foreground/10">
                <X size={18} />
              </button>
            </div>
            {navList(true)}
            {footer}
          </div>
        </div>
      )}
      <nav aria-label="Navigation rapide admin" className="fixed inset-x-0 bottom-0 z-40 bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className={`mx-auto grid max-w-lg gap-1 px-2 pt-1.5 ${tabs.length === 3 ? "grid-cols-4" : tabs.length === 2 ? "grid-cols-3" : tabs.length === 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {tabs.map((t) => {
            const on = active(t);
            const Icon = t.icon;
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={on ? "page" : undefined} className={`${tabCell} ${on ? "adm-nav-on" : "text-muted"}`}>
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
