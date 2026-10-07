"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPTE_SECTIONS } from "./CompteNav";

// Téléphone et tablette : sur une page de Mon compte, une barre de retour à la liste (la colonne de menu est réservée à l'ordinateur).
export default function MobileBack() {
  const pathname = usePathname();
  const section = COMPTE_SECTIONS.find((s) => s.href !== "/compte" && (pathname === s.href || pathname.startsWith(`${s.href}/`)));
  if (!section) return null;
  return (
    <nav aria-label="Retour" className="mb-6 flex items-center justify-between gap-3 lg:hidden">
      <Link href="/compte" className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-muted transition-colors hover:text-foreground active:bg-foreground/10">
        <span aria-hidden="true">←</span> Mon compte
      </Link>
      <p className="truncate text-sm font-medium">{section.label}</p>
    </nav>
  );
}
