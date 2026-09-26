"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { nav } from "@/lib/site";
import { DiscordButton } from "./ui";

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="SYXTEE NETWORKS — accueil">
          <Image src="/logo-400.png" alt="" width={26} height={36} priority />
          <span className="text-sm font-semibold tracking-[0.18em]">SYXTEE <span className="font-normal text-muted">NETWORKS</span></span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <a key={item.href} href={`/${item.href}`} className="text-sm text-muted transition-colors hover:text-foreground">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <DiscordButton>Support Discord</DiscordButton>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-foreground md:hidden"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-black px-4 pb-6 pt-2 md:hidden">
          <nav className="flex flex-col">
            {nav.map((item) => (
              <a
                key={item.href}
                href={`/${item.href}`}
                onClick={() => setOpen(false)}
                className="border-b border-line py-4 text-base text-muted hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-6">
            <DiscordButton>Support Discord</DiscordButton>
          </div>
        </div>
      )}
    </header>
  );
}
