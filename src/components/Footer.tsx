import Image from "next/image";
import Link from "next/link";
import { site, type NavLink } from "@/lib/site";
import ThemeToggle from "./ThemeToggle";
import Wordmark from "./Wordmark";
import { DiscordIcon } from "./ui";

// Le menu du site ne garde que trois entrées : le pied de page garde le plan complet du site.
type FooterLink = NavLink & { wordmark?: string; group?: string };
const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Produits",
    links: [
      { label: "Relais SYXTEE", href: "/relais", wordmark: "RELAIS" },
      { label: "SYXTEE COMMUTATEUR", href: "/syxtee-mix", badge: "Nouveau", wordmark: "COMMUTATEUR" },
      { label: "SYXTEE PRO", href: "/pro", badge: "À venir", wordmark: "PRO" },
      { label: "Demander l'accès", href: "/acces" },
    ],
  },
  {
    title: "Outils",
    links: [
      { label: "Moblin", href: "/moblin" },
      { label: "Saily", href: "/saily", badge: "Partenaire" },
      { label: "Starlink", href: "/starlink" },
      { label: "Analyseur réseau", href: "/analyseur" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Fonctionnement", href: "/fonctionnement" },
      { label: "Services", href: "/services" },
      { label: "Où capter", href: "/couverture" },
      { label: "FAQ", href: "/faq" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:grid-cols-6">
        <div className="col-span-2 md:col-span-4 lg:col-span-2">
          <div className="flex items-center gap-3">
            <Image src="/logo-400.png" alt="" width={22} height={31} style={{ width: 22, height: "auto" }} className="ink-img" />
            <span className="text-sm font-semibold tracking-[0.18em]">SYXTEE <span className="font-normal text-muted">NETWORKS</span></span>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
            Relais IRL SRTLA pensé pour les créateurs qui démarrent. Du live pro, sans le budget pro.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{col.title}</p>
            <ul className="mt-4 space-y-3 text-sm">
              {col.links.map((l, i) => (
                <li key={l.href}>
                  {l.group && l.group !== col.links[i - 1]?.group && (
                    <p className="label-mono mb-2 mt-5 text-[10px] first:mt-0">{l.group}</p>
                  )}
                  <Link href={l.href} className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-muted hover:text-foreground">
                    {l.wordmark ? <Wordmark name={l.wordmark} size="sm" /> : <span className="whitespace-nowrap">{l.label}</span>}
                    {l.badge && <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]">{l.badge}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Support</p>
          <p className="mt-4 text-sm text-muted">Ouvre une demande depuis ton espace, ou rejoins la communauté sur Discord.</p>
          <Link href="/dashboard/support" className="mt-4 inline-block text-sm text-foreground hover:underline">
            Ouvrir une demande
          </Link>
          <a
            href={site.discord}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 text-sm text-muted hover:text-foreground"
          >
            <DiscordIcon /> Discord
          </a>
        </div>
      </div>

      <div aria-hidden="true" className="select-none overflow-hidden px-4">
        <p className="mx-auto max-w-6xl whitespace-nowrap text-center text-[17.5vw] font-semibold leading-[0.8] tracking-tighter text-foreground/[0.06] sm:text-[15vw] lg:text-[190px]">SYXTEE</p>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {site.year} {site.name}. Tous droits réservés.</p>
          <ThemeToggle />
          <div className="flex gap-6">
            <Link href="/mentions-legales" className="hover:text-foreground">Mentions légales</Link>
            <Link href="/credits" className="hover:text-foreground">Crédits</Link>
            <Link href="/cgu" className="hover:text-foreground">CGU</Link>
            <Link href="/cgv" className="hover:text-foreground">CGV</Link>
            <Link href="/confidentialite" className="hover:text-foreground">Confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
