"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Compte", href: "/dashboard/parametres" },
  { label: "Usage", href: "/dashboard/parametres/usage" },
  { label: "Facturation", href: "/dashboard/parametres/facturation" },
  { label: "Équipe", href: "/dashboard/parametres/equipe" },
  { label: "Intégrations", href: "/dashboard/parametres/integrations" },
  { label: "Documents", href: "/dashboard/parametres/documents" },
  { label: "Labs", href: "/dashboard/parametres/labs" },
];

/** Onglets en pilules sous le titre : actif = fond surface-2 et texte blanc, inactifs en gris. Chaque onglet est une route. */
export default function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Paramètres" className="-mx-1 mb-8 overflow-x-auto px-1">
      <ul className="flex w-max gap-1">
        {TABS.map((t) => {
          const on = pathname === t.href;
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={on ? "page" : undefined} className={`block whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${on ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"}`}>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
