"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKey, PlugsConnected, ShareNetwork, SquaresFour, Trash, UserCircle } from "@phosphor-icons/react";

// Menu de Mon compte : une page par section. Pastilles défilantes sur mobile, colonne collée à gauche sur ordinateur.
export const COMPTE_SECTIONS = [
  { href: "/compte", label: "Vue d'ensemble", Icon: SquaresFour },
  { href: "/compte/profil", label: "Profil", Icon: UserCircle },
  { href: "/compte/reseaux", label: "Réseaux et visibilité", Icon: ShareNetwork },
  { href: "/compte/comptes-relies", label: "Comptes reliés", Icon: PlugsConnected },
  { href: "/compte/securite", label: "Sécurité", Icon: LockKey },
  { href: "/compte/supprimer", label: "Supprimer mon compte", Icon: Trash },
] as const;

export default function CompteNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Mon compte" className="-mx-4 overflow-x-auto px-4 lg:sticky lg:top-24 lg:mx-0 lg:self-start lg:overflow-visible lg:px-0">
      <ul className="flex gap-2 lg:flex-col lg:gap-0.5">
        {COMPTE_SECTIONS.map((s) => {
          const on = s.href === "/compte" ? pathname === s.href : pathname === s.href || pathname.startsWith(`${s.href}/`);
          return (
            <li key={s.href} className="shrink-0">
              <Link
                href={s.href}
                aria-current={on ? "page" : undefined}
                className={`relative flex items-center gap-2.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors lg:rounded-lg lg:border-transparent lg:px-3 ${
                  on ? "border-line-strong bg-foreground/10 text-foreground" : "border-line text-muted hover:text-foreground lg:hover:bg-foreground/[0.06]"
                } ${s.href === "/compte/supprimer" && !on ? "hover:text-red-300" : ""}`}
              >
                {on && <span aria-hidden="true" className="absolute inset-y-1.5 left-0 hidden w-0.5 rounded-full bg-accent lg:block" />}
                <s.Icon size={18} weight={on ? "fill" : "regular"} aria-hidden="true" className="shrink-0" />
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
