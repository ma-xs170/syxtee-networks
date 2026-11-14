"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Onglets de la barre Cloud : Cloud (flux) et Historique (anciens directs), tous deux sur l'hôte cloud.
const TABS = [
  { href: "/dashboard/cloud", label: "Cloud" },
  { href: "/dashboard/lives", label: "Historique" },
];

export default function CloudTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Cloud" className="ml-auto flex items-center gap-1 overflow-x-auto">
      {TABS.map((t) => {
        const on = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors ${on ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
