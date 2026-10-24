import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, DiscordLogo, Envelope, GithubLogo, InstagramLogo, MapPin, YoutubeLogo } from "@phosphor-icons/react/dist/ssr";
import ContactForm from "@/components/contact/ContactForm";
import { Container } from "@/components/ui";
import { site } from "@/lib/site";

// Une seule carte pour toute la page : mêmes marges, mêmes arrondis, mêmes pastilles d'icône.
const card = "rounded-2xl border border-line bg-surface p-6 sm:p-8";
const iconBox = "grid size-6 shrink-0 place-items-center text-foreground";

// Coordonnées affichées à droite du formulaire : e-mail, lieu, puis tous les réseaux.
const CONTACTS = [
  { Icon: Envelope, label: "E-mail", sub: "contact@syxtee-networks.fr", href: "mailto:contact@syxtee-networks.fr" },
  { Icon: InstagramLogo, label: "Instagram", sub: "@syxtee.networks", href: site.instagram },
  { Icon: YoutubeLogo, label: "YouTube", sub: "@syxtee", href: site.youtube },
  { Icon: DiscordLogo, label: "Discord", sub: "Rejoindre la communauté", href: site.discord },
  { Icon: GithubLogo, label: "GitHub", sub: "syxtee-networks", href: site.github },
];

export const metadata: Metadata = {
  title: "Demander une production IRL",
  description: "Lancé par des Guadeloupéens : des solutions de streaming IRL flexibles. Décris ton projet de production IRL, on te répond avec un devis gratuit.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="relative isolate overflow-hidden">
      {/* Dégradé rouge en haut de page, comme un projecteur sur la scène. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1100px]" style={{ maskImage: "linear-gradient(to bottom, #000 55%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, #000 55%, transparent)", background: "radial-gradient(70% 55% at 0% 0%, color-mix(in srgb, var(--bad) 40%, transparent), transparent 70%), radial-gradient(55% 50% at 100% 30%, color-mix(in srgb, var(--bad) 26%, transparent), transparent 70%)" }} />
      <section className="pb-12 pt-20 sm:pb-16 sm:pt-28">
        <Container className="max-w-5xl">
          <h1 className="h-serif max-w-[18ch] text-[clamp(2.75rem,6vw,4.5rem)]">Demander une <em>production IRL.</em></h1>
          <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-muted sm:text-lg">Décris ton projet : on s&apos;occupe de la production (régie, cadreur, réseau) et on te répond avec un devis gratuit et sur mesure.</p>
        </Container>
      </section>

      <section className="pb-20 sm:pb-28">
        <Container className="grid max-w-5xl items-stretch gap-6 lg:grid-cols-[1fr_360px]">
          <div className={card}>
            <h2 className="text-xl font-semibold tracking-tight">Ta demande de production</h2>
            <p className="mb-8 mt-1.5 text-sm text-muted">Les champs marqués d&apos;une étoile sont obligatoires.</p>
            <ContactForm />
          </div>
          <aside className="grid grid-rows-[auto_1fr] gap-6">
            <div className={card}>
              <h2 className="text-xl font-semibold tracking-tight">Coordonnées</h2>
              <ul className="mt-6 grid gap-5">
                <li className="flex items-center gap-4">
                  <span className={iconBox}><MapPin size={22} aria-hidden="true" /></span>
                  <span className="text-sm"><span className="block font-medium">Petit-Bourg</span><span className="block text-muted">Déplacement partout en Guadeloupe</span></span>
                </li>
                {CONTACTS.map(({ Icon, label, sub, href }) => (
                  <li key={label}>
                    <a href={href} {...(href.startsWith("mailto:") ? {} : { target: "_blank", rel: "noopener noreferrer" })} className="group flex items-center gap-4 text-sm">
                      <span className={`${iconBox} `}><Icon size={22} aria-hidden="true" /></span>
                      <span><span className="block font-medium group-hover:underline group-hover:underline-offset-4">{label}</span><span className="block text-muted">{sub}</span></span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className={card}>
              <h2 className="text-xl font-semibold tracking-tight">Devis gratuit</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">Décris ton projet et reçois une estimation personnalisée.</p>
              <Link href="/faq" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">Consulter la FAQ <ArrowUpRight size={14} aria-hidden="true" /></Link>
            </div>
          </aside>
        </Container>
      </section>

      <section className="relative overflow-hidden border-t border-line py-20 sm:py-28">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-full" style={{ background: "radial-gradient(60% 80% at 20% 100%, color-mix(in srgb, #5865f2 22%, transparent), transparent 70%)" }} />
        <Container className="relative max-w-5xl">
          <Image src="/images/discord-logo.webp" alt="" width={56} height={56} className="size-14" />
          <h2 className="h-serif mt-5 max-w-[18ch] text-[clamp(2.25rem,5vw,3.5rem)]">Échange, apprends, progresse <em>ensemble.</em></h2>
          <p className="mt-5 max-w-[50ch] leading-relaxed text-muted">Partage des astuces, demande de l&apos;aide pour ton installation et grandis avec la communauté SYXTEE.</p>
          <a href={site.discord} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full btn-tonal px-6 text-[15px] font-medium">
            Rejoindre le Discord <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </Container>
      </section>
    </div>
  );
}
