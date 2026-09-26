"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { nav } from "@/lib/site";
import { ToolsAccordion, ToolsMenu } from "./NavTools";
import { DiscordButton } from "./ui";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3" aria-label="SYXTEE NETWORKS — accueil">
          <Image src="/logo-400.png" alt="" width={26} height={36} priority />
          <span className="text-sm font-semibold tracking-[0.18em]">SYXTEE <span className="font-normal text-muted">NETWORKS</span></span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex xl:gap-8">
          {nav.map((item) =>
            "children" in item ? (
              <ToolsMenu key={item.label} label={item.label} tools={item.children} active={item.children.some((t) => isActive(t.href))} />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`text-sm transition-colors hover:text-foreground ${isActive(item.href) ? "text-foreground" : "text-muted"}`}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden lg:block">
          <DiscordButton>Support Discord</DiscordButton>
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
          <nav className="flex flex-col">
            {nav.map((item) =>
              "children" in item ? (
                <ToolsAccordion
                  key={item.label}
                  label={item.label}
                  tools={item.children}
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
          <div className="mt-6">
            <DiscordButton>Support Discord</DiscordButton>
          </div>
        </div>
      )}
    </header>
  );
}
