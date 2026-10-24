import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, DiscordLogo, Envelope, GithubLogo, InstagramLogo, MapPin, YoutubeLogo } from "@phosphor-icons/react/dist/ssr";
import ContactForm from "@/components/contact/ContactForm";
import { Container } from "@/components/ui";
import { site } from "@/lib/site";

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
      <section className="py-16 sm:py-24">
        <Container className="max-w-5xl">
          <h1 className="h-serif max-w-[16ch] text-[clamp(3rem,7vw,5rem)]">Demander une <em>production IRL.</em></h1>
          <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-muted sm:text-lg">Lancé par des Guadeloupéens, des solutions de streaming IRL flexibles.</p>
          <p className="mt-4 max-w-[58ch] font-medium">Tu veux qu&apos;on filme et diffuse ton direct IRL ? Décris ton projet : on s&apos;occupe de la production (régie, cadreur, réseau) et on te répond avec un devis gratuit et sur mesure.</p>
        </Container>
      </section>

      <section className="pb-16 sm:pb-24">
        <Container className="grid max-w-5xl gap-8 lg:grid-cols-[1fr_340px] lg:gap-12">
          <div>
            <h2 className="mb-6 text-xl font-semibold">Ta demande de production</h2>
            <ContactForm />
          </div>
          <aside className="grid content-start gap-4">
            <div className="bento-cell p-6">
              <h2 className="text-base font-semibold">Coordonnées</h2>
              <ul className="mt-5 grid gap-4">
                <li className="flex items-start gap-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-strong bg-background"><MapPin size={18} aria-hidden="true" /></span>
                  <span className="pt-0.5 text-sm"><span className="block font-medium">Petit-Bourg</span><span className="text-muted">Déplacement partout en Guadeloupe</span></span>
                </li>
                {CONTACTS.map(({ Icon, label, sub, href }) => (
                  <li key={label}>
                    <a href={href} {...(href.startsWith("mailto:") ? {} : { target: "_blank", rel: "noopener noreferrer" })} className="group flex min-h-10 items-center gap-3.5 text-sm">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-strong bg-background transition-colors group-hover:border-foreground/50"><Icon size={18} aria-hidden="true" /></span>
                      <span><span className="block font-medium group-hover:underline group-hover:underline-offset-4">{label}</span><span className="text-muted">{sub}</span></span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bento-cell p-6 text-center">
              <h2 className="text-base font-semibold">Devis gratuit</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">Décris ton projet et reçois une estimation personnalisée.</p>
            </div>
            <p className="text-sm text-muted">Une question ? <Link href="/faq" className="font-medium text-foreground underline-offset-4 hover:underline">Consulte la FAQ</Link></p>
          </aside>
        </Container>
      </section>

      <section className="relative overflow-hidden border-t border-line py-20 sm:py-28">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-full" style={{ background: "radial-gradient(60% 80% at 20% 100%, color-mix(in srgb, #5865f2 22%, transparent), transparent 70%)" }} />
        <Container className="relative max-w-5xl">
          <DiscordLogo size={44} weight="fill" aria-hidden="true" style={{ color: "#5865f2" }} />
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
