import { rich } from "@/lib/rich";
import type { ReactNode } from "react";
import DiscordChat from "../illustrations/DiscordChat";
import ObsScreen from "../illustrations/ObsScreen";
import PhoneMoblin from "../illustrations/PhoneMoblin";
import RelayServer from "../illustrations/RelayServer";
import { Container, MoreLink, SectionHeader } from "../ui";

// Illustrations des cartes : animations en pause, elles jouent au survol (ou au focus) de la carte.
const art: Record<string, ReactNode> = {
  "01": <RelayServer />,
  "02": <PhoneMoblin />,
  "03": <ObsScreen />,
  "04": <DiscordChat />,
};

const services = [
  {
    n: "01",
    title: "Relais SRTLA",
    text: "Ton téléphone envoie la vidéo sur **plusieurs connexions en même temps** (4G, 5G, Wi-Fi). Le relais recolle tout : **si un réseau faiblit, les autres prennent le relais**.",
  },
  {
    n: "02",
    title: "Ton téléphone suffit",
    text: "**Pas de sac à dos à plusieurs milliers d'euros.** Moblin, IRL Pro ou BELABOX : tu utilises **l'app que tu connais déjà**, on fournit l'adresse du relais.",
  },
  {
    n: "03",
    title: "Tu gardes la main dans OBS",
    text: "Le relais sort un **flux SRT propre** que tu ajoutes comme source dans OBS. **Tes scènes, overlays et alertes restent les tiens**, vers Twitch, Kick ou YouTube.",
  },
  {
    n: "04",
    title: "Support humain sur Discord",
    text: "Une question, un souci de config ? Tu ouvres **un ticket sur le Discord** et on t'aide à régler ton setup. **Pas de formulaire, pas d'email perdu.**",
  },
];

export default function Services() {
  return (
    <section id="services" className="bg-field border-b border-line py-24">
      <Container>
        <SectionHeader kicker="Services" title="Tout ce qu'il faut pour sortir streamer.">
          Un relais simple, pensé pour les créateurs qui veulent faire de l&apos;IRL sans investir dans du matériel broadcast.
        </SectionHeader>

        <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {services.map((s) => (
            <article key={s.n} className="group bg-background p-8 transition-colors hover:bg-surface">
              <div className="hover-play mb-6 h-32 w-full transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.03]">
                {art[s.n]}
              </div>
              <p className="font-mono text-sm text-muted">{s.n}</p>
              <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{rich(s.text)}</p>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <MoreLink href="/services" />
        </div>
      </Container>
    </section>
  );
}
