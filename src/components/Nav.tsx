"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { isMenu, nav } from "@/lib/site";
import AccountMenu, { Avatar, useAccount } from "./AccountMenu";
import { DesktopMenus, NavAccordion } from "./NavTools";
import { DiscordButton } from "./ui";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const account = useAccount();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-black/70 backdrop-blur-md">
      {/* 3 zones : logo à gauche, menus centrés, compte + Discord à droite */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <Link href="/" onClick={() => setOpen(false)} className="flex shrink-0 items-center gap-3 justify-self-start" aria-label="SYXTEE NETWORKS, accueil">
          <Image src="/logo-400.png" alt="" width={26} height={36} priority />
          <span className="whitespace-nowrap text-sm font-semibold tracking-[0.18em]">
            SYXTEE<span className="hidden font-normal text-muted xl:inline"> NETWORKS</span>
          </span>
        </Link>

        <DesktopMenus items={nav} isActive={isActive} />

        <div className="hidden shrink-0 items-center gap-6 justify-self-end lg:flex">
          <AccountMenu account={account} />
          <DiscordButton size="sm">Discord</DiscordButton>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-foreground lg:hidden"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-black px-4 pb-6 pt-2 lg:hidden">
          <nav aria-label="Navigation principale" className="flex flex-col">
            {nav.map((item) =>
              isMenu(item) ? (
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
          <div className="mt-2 flex flex-col">
            {account ? (
              <>
                <p className="flex items-center gap-3 py-4 text-sm text-muted">
                  <Avatar account={account} size={28} />@{account.username}
                </p>
                <Link href="/dashboard" onClick={() => setOpen(false)} className="border-b border-line py-4 text-base text-muted hover:text-foreground">
                  Dashboard
                </Link>
                <Link href="/compte" onClick={() => setOpen(false)} className="border-b border-line py-4 text-base text-muted hover:text-foreground">
                  Mon compte
                </Link>
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
