"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/revenus", label: "Revenus" },
  { href: "/admin/comptes", label: "Comptes" },
  { href: "/admin/relais", label: "Relais" },
  { href: "/admin/partenaires", label: "Partenaires" },
  { href: "/admin/carte", label: "Carte" },
  { href: "/admin/securite", label: "Sécurité" },
  { href: "/admin/journal", label: "Journal" },
];

export default function AdminTabs() {
  const path = usePathname();
  if (path === "/admin/2fa") return null;
  return (
    <nav aria-label="Admin" className="border-b border-line">
      <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
        <li className="flex items-center pr-3 font-mono text-xs uppercase tracking-[0.15em] text-muted">Admin</li>
        {TABS.map((t) => {
          const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors ${active ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
