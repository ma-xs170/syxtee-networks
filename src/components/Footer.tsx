import Image from "next/image";
import Link from "next/link";
import { nav, site } from "@/lib/site";
import { DiscordIcon } from "./ui";

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <Image src="/logo-400.png" alt="" width={32} height={44} />
            <span className="text-sm font-semibold tracking-[0.18em]">SYXTEE <span className="font-normal text-muted">NETWORKS</span></span>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
            Relais IRL SRTLA pensé pour les créateurs qui démarrent. Du live pro, sans le budget pro.
          </p>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Navigation</p>
          <ul className="mt-4 space-y-3 text-sm">
            {nav.map((item) =>
              "children" in item ? (
                <li key={item.label}>
                  <span className="text-muted">{item.label}</span>
                  <ul className="mt-3 space-y-3 border-l border-line pl-4">
                    {item.children.map((t) => (
                      <li key={t.href}>
                        <Link href={t.href} className="text-muted hover:text-foreground">
                          {t.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={item.href}>
                  <Link href={item.href} className="inline-flex items-center gap-2 text-muted hover:text-foreground">
                    {item.label}
                    {item.badge && (
                      <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]">{item.badge}</span>
                    )}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>

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
            <Link href="/confidentialite" className="hover:text-foreground">Confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
