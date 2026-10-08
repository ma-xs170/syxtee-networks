import Image from "next/image";
import Link from "next/link";
import { site, type NavLink } from "@/lib/site";
import ThemeToggle from "./ThemeToggle";
import { DiscordIcon } from "./ui";

// Pied de page minimal : quatre colonnes, le reste du plan du site vit dans la documentation.
const columns: { title: string; links: NavLink[] }[] = [
  {
    title: "Produit",
    links: [
      { label: "Relais", href: "/relais" },
      { label: "Contrôle à distance", href: "/controle-a-distance" },
      { label: "Espaces partagés", href: "/espaces-partages" },
      { label: "Encodeur", href: "/encodeur", badge: "En développement" },
      { label: "Tarifs", href: "/tarifs" },
      { label: "Demander l'accès", href: "/acces" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Fonctionnement", href: "/fonctionnement" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Communauté",
    links: [
      { label: "Discord", href: site.discord },
      { label: "Demander l'accès", href: "/acces" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Mentions légales", href: "/mentions-legales" },
      { label: "Conditions d'utilisation", href: "/cgu" },
      { label: "Conditions de vente", href: "/cgv" },
      { label: "Confidentialité", href: "/confidentialite" },
      { label: "Crédits", href: "/credits" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="overflow-hidden border-t border-line">
      <div aria-hidden="true" className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <p className="ghost-word h-[0.62em] overflow-hidden text-[clamp(3rem,14.5vw,10.5rem)]">SYXTEE</p>
      </div>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 md:grid-cols-5">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-3">
            <Image src="/logo-400.png" alt="" width={22} height={31} style={{ width: 22, height: "auto" }} className="ink-img" />
            <span className="text-sm font-semibold">SYXTEE NETWORKS</span>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">Le direct en mobilité, simple et fiable.</p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3.5 py-2 text-xs text-foreground">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ok" />
            Tous les systèmes opérationnels
          </p>
          <a href={site.discord} target="_blank" rel="noopener noreferrer" aria-label="Discord" className="mt-5 flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:text-foreground">
            <DiscordIcon />
          </a>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold">{col.title}</p>
            <ul className="mt-3 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 text-muted hover:text-foreground sm:min-h-9">
                    <span className="whitespace-nowrap">{l.label}</span>
                    {l.badge && <span className="rounded border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em]">{l.badge}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {site.year} {site.name}. Tous droits réservés.</p>
          <ThemeToggle />
          <div className="flex items-center gap-6">
            <a href="mailto:contact@syxtee-networks.fr" className="inline-flex min-h-11 items-center hover:text-foreground">contact@syxtee-networks.fr</a>
            <a href={site.discord} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 hover:text-foreground">
              <DiscordIcon /> Communauté
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
