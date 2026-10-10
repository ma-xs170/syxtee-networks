import Image from "next/image";
import Link from "next/link";
import { site, type NavLink } from "@/lib/site";
import StatusPill from "./ui/StatusPill";
import ThemeToggle from "./ThemeToggle";

// Pied de page minimal : quatre colonnes, le reste du plan du site vit dans la documentation.
const columns: { title: string; links: NavLink[] }[] = [
  {
    title: "Produit",
    links: [
      { label: "Contrôle à distance", href: "/controle-a-distance" },
      { label: "Nos serveurs", href: "/relais" },
      { label: "Espaces partagés", href: "/espaces-partages" },
      { label: "Tarifs", href: "/tarifs" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "FAQ", href: "/faq" },
      { label: "Devenir Partenaire", href: "/acces" },
    ],
  },
  {
    title: "Communauté",
    links: [{ label: "Rejoindre la communauté", href: site.discord }],
  },
  {
    title: "Légal",
    links: [
      { label: "Mentions légales", href: "/mentions-legales" },
      { label: "Confidentialité", href: "/confidentialite" },
      { label: "CGU", href: "/cgu" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="overflow-hidden border-t border-line">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 md:grid-cols-5">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-3">
            <Image src="/logo-400.png" alt="" width={22} height={31} style={{ width: 22, height: "auto" }} className="ink-img" />
            <span className="text-sm font-medium tracking-[0.02em] text-foreground">SYXTEE NETWORKS</span>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">Le direct en mobilité, simple et fiable.</p>
          <Link href="/statut" className="mt-5 inline-block max-w-full"><StatusPill variant="ok" label="Systèmes opérationnels" /></Link>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold">{col.title}</p>
            <ul className="mt-3 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 text-muted hover:text-foreground sm:min-h-9">
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
          </div>
        </div>
      </div>
    </footer>
  );
}
