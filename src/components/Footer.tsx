import Image from "next/image";
import Link from "next/link";
import { DiscordLogo, GithubLogo, InstagramLogo, YoutubeLogo } from "@phosphor-icons/react/dist/ssr";
import { site, type NavLink } from "@/lib/site";
import StatusPill from "./ui/StatusPill";

// Pied de page : à gauche le logo, la promesse, l'état du service et les réseaux (logos blancs) ; à droite quatre colonnes rangées par besoin.
const columns: { title: string; links: NavLink[] }[] = [
  {
    title: "Production",
    links: [
      { label: "Production IRL", href: "/contact" },
      { label: "Guide du live IRL", href: "/guide-live-irl" },
    ],
  },
  {
    title: "Streamers",
    links: [
      { label: "Contrôle à distance", href: "/controle-a-distance" },
      { label: "Espaces partagés", href: "/espaces-partages" },
      { label: "Nos serveurs", href: "/relais" },
      { label: "Tarifs", href: "/tarifs" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "FAQ", href: "/faq" },
      { label: "État des services", href: "/statut" },
      { label: "Me soutenir", href: "/soutenir" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Mentions légales", href: "/mentions-legales" },
      { label: "Confidentialité", href: "/confidentialite" },
      { label: "CGU", href: "/cgu" },
      { label: "CGV", href: "/cgv" },
    ],
  },
];

const socials = [
  { label: "Instagram", href: site.instagram, Icon: InstagramLogo },
  { label: "YouTube", href: site.youtube, Icon: YoutubeLogo },
  { label: "Discord", href: site.discord, Icon: DiscordLogo },
  { label: "GitHub", href: site.github, Icon: GithubLogo },
];

export default function Footer() {
  return (
    <footer className="overflow-hidden border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-16">
        <div>
          <Link href={site.url} className="inline-flex items-center gap-3" aria-label="SYXTEE NETWORKS, accueil">
            <Image src="/logo-400.png" alt="" width={22} height={31} style={{ width: 22, height: "auto" }} className="ink-img" />
            <span className="text-sm font-medium tracking-[0.02em] text-foreground">SYXTEE NETWORKS</span>
          </Link>
          <p className="mt-5 text-sm leading-relaxed text-muted">Le live IRL, partout. Production et outils pour streamers, depuis la Guadeloupe.</p>
          <ul className="mt-6 flex items-center gap-2" aria-label="Réseaux sociaux">
            {socials.map(({ label, href, Icon }) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="grid size-11 place-items-center rounded-full border border-line text-foreground transition-colors hover:border-foreground/40 hover:bg-foreground/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:size-10">
                  <Icon size={20} weight="fill" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
          <Link href="/statut" className="mt-6 inline-block max-w-full"><StatusPill variant="ok" label="Systèmes opérationnels" /></Link>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold">{col.title}</p>
              <ul className="mt-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-11 items-center text-muted hover:text-foreground sm:min-h-9">
                      <span className="whitespace-nowrap">{l.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {site.year} {site.name}. Basé en Guadeloupe.</p>
          <a href="mailto:contact@syxtee-networks.fr" className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0">contact@syxtee-networks.fr</a>
        </div>
      </div>
    </footer>
  );
}
