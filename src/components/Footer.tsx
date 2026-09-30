import Image from "next/image";
import Link from "next/link";
import { isMenu, nav, site, type NavLink } from "@/lib/site";
import { DiscordIcon } from "./ui";

// Mêmes catégories que la nav : Produits (+ Offres), Outils, Ressources, puis Support.
const columns: { title: string; links: NavLink[] }[] = nav.filter(isMenu).map((m) => ({ title: m.label, links: [...m.children] }));
const offers = nav.find((item) => !isMenu(item)) as NavLink | undefined;
if (offers) columns[0]?.links.push(offers);

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:grid-cols-6">
        <div className="col-span-2 md:col-span-4 lg:col-span-2">
          <div className="flex items-center gap-3">
            <Image src="/logo-400.png" alt="" width={32} height={44} />
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
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex items-center gap-2 text-muted hover:text-foreground">
                    {l.label}
                    {l.badge && <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]">{l.badge}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Support</p>
          <p className="mt-4 text-sm text-muted">Toutes les demandes passent uniquement par Discord.</p>
          <a
            href={site.discord}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-foreground hover:underline"
          >
            <DiscordIcon /> Ouvrir un ticket
          </a>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {site.year} {site.name}. Tous droits réservés.</p>
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
