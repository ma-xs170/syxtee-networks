"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeRow } from "@/components/ThemeToggle";
import { LockKey, PlugsConnected, ShareNetwork, SquaresFour, Trash, UserCircle } from "@/components/icons";

// Menu de Mon compte : une page par section. Pastilles défilantes sur mobile, colonne collée à gauche sur ordinateur.
export const COMPTE_SECTIONS = [
  { href: "/compte", label: "Général", Icon: SquaresFour, group: "Mon espace" },
  { href: "/compte/profil", label: "Profil", Icon: UserCircle, group: "Ton compte" },
  { href: "/compte/securite", label: "Sécurité", Icon: LockKey, group: "Ton compte" },
  { href: "/compte/comptes-relies", label: "Comptes reliés", Icon: PlugsConnected, group: "Ton compte" },
  { href: "/compte/reseaux", label: "Réseaux et visibilité", Icon: ShareNetwork, group: "Ton compte" },
  { href: "/compte/supprimer", label: "Supprimer mon compte", Icon: Trash, group: "Zone sensible" },
] as const;

export default function CompteNav() {
  const pathname = usePathname();
  const groups = [...new Set(COMPTE_SECTIONS.map((s) => s.group))];
  return (
    <nav aria-label="Mon compte" className="lg:sticky lg:top-24 lg:self-start">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground">
        <span aria-hidden="true">←</span> Retour à l&apos;espace client
      </Link>
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g}>
            <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{g}</p>
            <ul className="space-y-0.5">
              {COMPTE_SECTIONS.filter((s) => s.group === g).map((s) => {
                const on = s.href === "/compte" ? pathname === s.href : pathname === s.href || pathname.startsWith(`${s.href}/`);
                return (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      aria-current={on ? "page" : undefined}
                      className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${on ? "bg-foreground/10 font-medium text-foreground" : "text-muted hover:text-foreground"}`}
                    >
                      {on && <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-foreground" />}
                      <s.Icon size={18} weight={on ? "fill" : "regular"} aria-hidden="true" className="shrink-0" />
                      {s.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <div>
          <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Cet appareil</p>
          <ThemeRow className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-foreground" />
        </div>
      </div>
    </nav>
  );
}
