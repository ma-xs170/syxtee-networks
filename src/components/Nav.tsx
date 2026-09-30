"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { activeAlso, dashboardNav, withLocks } from "@/lib/dashboard-nav";
import { nav, site } from "@/lib/site";
import AccountMenu, { Avatar, MenuLinkItem, siteAccountLinks, useAccount, type MenuGroup } from "./AccountMenu";
import { LivePill } from "./dashboard/LiveStatus";
import StreamModeToggle from "./dashboard/StreamModeToggle";
import { restoreStreamMode } from "./dashboard/streamMode";
import { DesktopMenus, NavAccordion } from "./NavTools";
import { SupportId } from "./SupportId";
import { DiscordButton } from "./ui";

// Barre du site. Sur /dashboard/* (variant « dashboard ») : mêmes logo, hauteur, flou et méga-menus, mais les menus
// du dashboard au centre et, à droite, seulement le statut du direct, le mode stream et l'avatar. Tout le reste
// (compte, admin, aide, retour au site) est rangé par groupes dans le panneau de l'avatar.

function dashboardGroups(admin: boolean): MenuGroup[] {
  return [
    {
      label: "Compte",
      links: [
        { label: "Profil & réseaux", href: "/dashboard/profil" },
        { label: "Abonnement", href: "/dashboard/abonnement" },
        { label: "Paramètres", href: "/dashboard/parametres" },
      ],
    },
    ...(admin
      ? [
          // Une seule entrée : l'admin a sa propre barre d'onglets (admin/layout.tsx).
          { label: "Admin", links: [{ label: "Administration", href: "/admin" }] },
        ]
      : []),
    {
      label: "Aide",
      links: [
        { label: "Documentation", href: "/docs" },
        { label: "Discord", href: site.discord, external: true },
        { label: "Retour au site", href: "/" },
      ],
    },
  ];
}

export default function Nav({ variant = "site", admin = false }: { variant?: "site" | "dashboard"; admin?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const account = useAccount();
  const dash = variant === "dashboard";
  const items = dash ? (account ? withLocks(dashboardNav, account.features) : dashboardNav) : nav;
  const groups: MenuGroup[] = dash ? dashboardGroups(admin) : [{ links: siteAccountLinks }];
  // « Vue d'ensemble » (/dashboard) n'est active que sur sa propre page. Statistiques et Scanner : toute leur section.
  const isActive = (href: string) =>
    [href, ...(dash ? (activeAlso[href] ?? []) : [])].some((h) => pathname === h || (h !== "/dashboard" && pathname.startsWith(`${h}/`)));

  useEffect(() => {
    if (dash) restoreStreamMode();
  }, [dash]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-black/70 backdrop-blur-md">
      {/* 3 zones : logo à gauche, menus centrés, compte + Discord à droite */}
      <div className={`mx-auto flex h-16 items-center justify-between gap-6 px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] ${dash ? "max-w-[1400px]" : "max-w-7xl"}`}>
        <Link href={dash ? "/dashboard" : "/"} onClick={() => setOpen(false)} className="flex shrink-0 items-center gap-3 justify-self-start" aria-label={dash ? "Dashboard SYXTEE" : "SYXTEE NETWORKS, accueil"}>
          <Image src="/logo-400.png" alt="" width={26} height={36} priority />
          <span className="whitespace-nowrap text-sm font-semibold tracking-[0.18em]">
            SYXTEE<span className="hidden font-normal text-muted xl:inline"> {dash ? "DASHBOARD" : "NETWORKS"}</span>
          </span>
        </Link>

        <DesktopMenus items={items} isActive={isActive} />

        {dash ? (
          <div className="hidden shrink-0 items-center gap-4 justify-self-end lg:flex">
            <LivePill compact />
            <StreamModeToggle />
            <AccountMenu account={account} groups={groups} />
          </div>
        ) : (
          <div className="hidden shrink-0 items-center gap-6 justify-self-end lg:flex">
            <AccountMenu account={account} />
            <DiscordButton size="sm">Discord</DiscordButton>
          </div>
        )}

        <div className="flex items-center gap-2 lg:hidden">
          {dash && <LivePill compact />}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-md p-2 text-foreground"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-black px-4 pb-6 pt-2 lg:hidden">
          <nav aria-label="Navigation principale" className="flex flex-col">
            {items.map((item) =>
              "children" in item ? (
                <NavAccordion
                  key={item.label}
                  menu={item}
                  active={item.children.some((t) => isActive(t.href))}
                  onNavigate={() => setOpen(false)}
                />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`border-b border-line py-4 text-base hover:text-foreground ${isActive(item.href) ? "text-foreground" : "text-muted"}`}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          {dash && (
            <div className="flex items-center justify-end border-b border-line py-4">
              <StreamModeToggle withLabel />
            </div>
          )}
          <div className="mt-2 flex flex-col">
            {account ? (
              <>
                <p className="flex items-center gap-3 py-4 text-sm text-muted">
                  <Avatar account={account} size={28} />
                  {account.name}
                </p>
                {account.supportId && (
                  <div className="border-b border-line pb-4">
                    <SupportId id={account.supportId} compact />
                  </div>
                )}
                {groups.map((g, i) => (
                  <div key={g.label ?? i} className="flex flex-col">
                    {g.label && <p className="pb-1 pt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{g.label}</p>}
                    {g.links.map((l) => (
                      <MenuLinkItem key={l.href} link={l} onNavigate={() => setOpen(false)} className="border-b border-line py-4 text-base text-muted hover:text-foreground" />
                    ))}
                  </div>
                ))}
                <form action={signOut}>
                  <button type="submit" className="w-full border-b border-line py-4 text-left text-base text-muted hover:text-foreground">
                    Déconnexion
                  </button>
                </form>
              </>
            ) : (
              account === null && (
                <Link href="/connexion" onClick={() => setOpen(false)} className="border-b border-line py-4 text-base text-muted hover:text-foreground">
                  Connexion
                </Link>
              )
            )}
          </div>
          {!dash && (
            <div className="mt-6">
              <DiscordButton>Discord</DiscordButton>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
