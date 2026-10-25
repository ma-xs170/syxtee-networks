import { DiscordLogo, GithubLogo, Heart, YoutubeLogo } from "@phosphor-icons/react/dist/ssr";
import { site } from "@/lib/site";
import { support } from "@/config/support";
import { Container } from "../ui";

// « Me soutenir » : sur l'accueil et sur /soutenir. Pas de chiffres de coûts : un mot du développeur et trois façons d'aider.
const pill = "inline-flex h-12 w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-medium transition-[background-color,border-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export default function SupportSection({ id }: { id?: string }) {
  return (
    <section id={id} className="relative isolate overflow-hidden border-b border-line py-24 lg:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: "radial-gradient(60% 60% at 0% 100%, color-mix(in srgb, var(--bad) 22%, transparent), transparent 70%), radial-gradient(50% 50% at 100% 0%, color-mix(in srgb, var(--bad) 16%, transparent), transparent 70%)" }} />
      <Container className="text-center">
        <Heart size={36} weight="fill" aria-hidden="true" className="mx-auto mb-6 text-bad" />
        <h2 className="h-serif mx-auto max-w-3xl text-[clamp(2.25rem,4.5vw,3.5rem)]">Me <em>soutenir.</em></h2>
        <p className="mx-auto mt-5 max-w-[44ch] text-lg leading-relaxed text-muted">
          Je construis SYXTEE seul, depuis la Guadeloupe. Le code est ouvert, et suivre la chaîne m&apos;aide déjà beaucoup.
        </p>
        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-stretch justify-center gap-3 sm:flex-row">
          <a href={support.sponsors ?? site.github} target="_blank" rel="noopener noreferrer" className={`${pill} btn-primary`}>
            <GithubLogo size={20} weight="fill" aria-hidden="true" />
            GitHub
          </a>
          <a href={site.youtube} target="_blank" rel="noopener noreferrer" className={`${pill} btn-tonal`}>
            <YoutubeLogo size={20} weight="fill" aria-hidden="true" />
            YouTube
          </a>
          <a href={site.discord} target="_blank" rel="noopener noreferrer" className={`${pill} btn-tonal`}>
            <DiscordLogo size={20} weight="fill" aria-hidden="true" />
            Discord
          </a>
        </div>
      </Container>
    </section>
  );
}
