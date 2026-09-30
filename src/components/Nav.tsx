"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { dashboardNav, withLocks } from "@/lib/dashboard-nav";
import { nav, site } from "@/lib/site";
import AccountMenu, { Avatar, siteAccountLinks, useAccount, type MenuLink } from "./AccountMenu";
import { LivePill } from "./dashboard/LiveStatus";
import StreamModeToggle from "./dashboard/StreamModeToggle";
import { restoreStreamMode } from "./dashboard/streamMode";
import { DesktopMenus, NavAccordion } from "./NavTools";
import { SupportId } from "./SupportId";
import { DiscordButton, DiscordIcon } from "./ui";

// Barre du site. Sur /dashboard/* (variant « dashboard ») : mêmes logo, hauteur, flou et méga-menus, mais les menus
// du dashboard au centre et, à droite, le statut du direct, « ← Site », le mode stream, Discord et le compte.

const dashboardAccountLinks: MenuLink[] = [
  { label: "Profil", href: "/dashboard/profil" },
  { label: "Abonnement", href: "/dashboard/abonnement" },
  { label: "Documentation", href: "/docs" },
];

function DiscordCompact() {
  return (
    <a
      href={site.discord}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discord SYXTEE"
      title="Discord"
      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-neutral-200"
    >
      <DiscordIcon />
    </a>
  );
}

export default function Nav({ variant = "site" }: { variant?: "site" | "dashboard" }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const account = useAccount();
  const dash = variant === "dashboard";
  const items = dash ? (account ? withLocks(dashboardNav, account.features) : dashboardNav) : nav;
  const accountLinks = dash ? dashboardAccountLinks : siteAccountLinks;
  // « Vue d'ensemble » (/dashboard) n'est active que sur sa propre page.
  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

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
          <div className="hidden shrink-0 items-center gap-3 justify-self-end lg:flex">
            <LivePill compact />
            <Link href="/" className="whitespace-nowrap text-sm text-muted transition-colors hover:text-foreground">
              ← Site
            </Link>
            <StreamModeToggle />
            <DiscordCompact />
            <AccountMenu account={account} links={accountLinks} />
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
            <div className="flex items-center justify-between gap-4 border-b border-line py-4">
              <Link href="/" onClick={() => setOpen(false)} className="text-base text-muted hover:text-foreground">
                ← Retour au site
              </Link>
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
                {accountLinks.map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-line py-4 text-base text-muted hover:text-foreground">
                    {l.label}
                  </Link>
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
          <div className="mt-6">
            <DiscordButton>Discord</DiscordButton>
          </div>
        </div>
      )}
    </header>
  );
}
