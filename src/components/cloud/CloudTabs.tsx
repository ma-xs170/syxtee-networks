"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// Onglets de la barre Cloud : Cloud (flux) et Statistiques (anciens directs), tous deux sur l'hôte cloud.
// Depuis la page d'un flux, Statistiques ne montre que les directs de ce flux (?relay=<id>) ; l'onglet Cloud y revient.
export default function CloudTabs() {
  const pathname = usePathname();
  const params = useSearchParams();
  const relay = pathname.match(/^\/dashboard\/cloud\/([^/]+)/)?.[1] ?? (pathname.startsWith("/dashboard/lives") ? params.get("relay") : null);
  const tabs = [
    { href: relay ? `/dashboard/cloud/${relay}` : "/dashboard/cloud", base: "/dashboard/cloud", label: "Cloud" },
    { href: relay ? `/dashboard/lives?relay=${relay}` : "/dashboard/lives", base: "/dashboard/lives", label: "Statistiques" },
  ];
  return (
    <nav aria-label="Cloud" className="ml-auto flex items-center gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const on = pathname === t.base || pathname.startsWith(`${t.base}/`);
        return (
          <Link key={t.base} href={t.href} aria-current={on ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors ${on ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
