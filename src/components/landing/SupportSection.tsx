import { ArrowUpRight, DiscordLogo, GithubLogo, Heart, YoutubeLogo } from "@phosphor-icons/react/dist/ssr";
import { site } from "@/lib/site";
import { support } from "@/config/support";
import { Container } from "../ui";

// « Me soutenir » : sur l'accueil et sur /soutenir. Pas de chiffres de coûts : un mot du développeur et trois façons d'aider.
const pill = "inline-flex h-12 w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-medium transition-[background-color,border-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export default function SupportSection({ id }: { id?: string }) {
  return (
    <section id={id} className="relative isolate overflow-hidden border-b border-line py-24 lg:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: "radial-gradient(60% 60% at 0% 100%, color-mix(in srgb, var(--bad) 22%, transparent), transparent 70%), radial-gradient(50% 50% at 100% 0%, color-mix(in srgb, var(--bad) 16%, transparent), transparent 70%)" }} />
      <Container>
        <div className="bento-cell grid gap-10 p-7 sm:p-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div className="max-w-xl">
            <Heart size={40} weight="fill" aria-hidden="true" className="mb-5 text-bad" />
            <h2 className="h-serif text-[clamp(2.25rem,4.5vw,3.5rem)]">Me <em>soutenir.</em></h2>
            <p className="mt-5 text-lg font-medium leading-snug">Mathis, développeur de SYXTEE NETWORKS.</p>
            <p className="mt-4 leading-relaxed text-muted">
              Je construis SYXTEE seul, depuis la Guadeloupe, pour que le live IRL soit simple et fiable partout. Le code est ouvert : tu peux le lire, signaler un souci ou proposer une amélioration. Et si le projet te sert, suivre la chaîne YouTube m&apos;aide déjà beaucoup.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a href={support.sponsors ?? site.github} target="_blank" rel="noopener noreferrer" className={`${pill} btn-primary`}>
              <GithubLogo size={20} weight="fill" aria-hidden="true" />
              Contribuer sur GitHub
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <a href={site.youtube} target="_blank" rel="noopener noreferrer" className={`${pill} btn-tonal`}>
              <YoutubeLogo size={20} weight="fill" aria-hidden="true" />
              Suivre sur YouTube · syxtee
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <a href={site.discord} target="_blank" rel="noopener noreferrer" className={`${pill} btn-tonal`}>
              <DiscordLogo size={20} weight="fill" aria-hidden="true" />
              Rejoindre la communauté
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
