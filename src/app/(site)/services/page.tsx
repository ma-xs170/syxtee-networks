import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import DiscordChat from "@/components/illustrations/DiscordChat";
import ObsInterface from "@/components/illustrations/ObsInterface";
import PhoneMoblin from "@/components/illustrations/PhoneMoblin";
import WatchChat from "@/components/illustrations/WatchChat";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Relais SRTLA, bonding 4G/5G/Wi-Fi, flux SRT dans OBS et assistance dédiée : tout ce que SYXTEE NETWORKS fait pour ton live IRL depuis ton téléphone.",
  alternates: { canonical: "/services" },
};

const ROWS = [
  { title: "Relais SRTLA", text: "4G, 5G et Wi-Fi en même temps : si une connexion faiblit, les autres compensent.", art: <PhoneMoblin /> },
  { title: "Ton téléphone suffit", text: "Moblin sur iPhone, IRL Pro sur Android : ton téléphone est ton encodeur.", art: <PhoneMoblin waves={false} /> },
  { title: "Tu gardes la main dans OBS", text: "Le flux arrive comme une source dans tes scènes, avec tes overlays.", art: <ObsInterface /> },
  { title: "Une vraie assistance", text: "Une demande, une personne de l'équipe, une réponse sous 24 h.", art: <div className="grid h-full grid-cols-[1.6fr_1fr] items-center gap-2"><DiscordChat /><WatchChat /></div> },
];

export default function ServicesPage() {
  return (
    <>
      <PageHero title={<>Tout ce qu&apos;il faut pour sortir <em>streamer.</em></>}>
        Quatre briques simples, de ton téléphone à ton OBS.
      </PageHero>

      <section className="py-12 lg:py-20">
        <Container>
          <ul className="mx-auto grid max-w-5xl gap-16 lg:gap-24">
            {ROWS.map((r, i) => (
              <li key={r.title} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-20">
                <div className={i % 2 ? "lg:order-2" : ""}>
                  <h2 className="h-serif text-[clamp(2rem,4vw,3rem)]">{r.title}</h2>
                  <p className="mt-4 max-w-[34ch] text-lg leading-relaxed text-muted">{r.text}</p>
                </div>
                <div aria-hidden="true" className="mx-auto aspect-[4/3] w-full max-w-sm text-foreground/80">{r.art}</div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="border-t border-line py-20 lg:py-28">
        <Container className="text-center">
          <h2 className="h-serif mx-auto max-w-3xl text-[clamp(2.25rem,5vw,3.75rem)]">Tu débutes ? On <em>t&apos;explique.</em></h2>
          <div className="mt-9 flex justify-center">
            <ButtonLink href="/guide-live-irl">Lire le guide du live IRL</ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
