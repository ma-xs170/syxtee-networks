import type { Metadata } from "next";
import Link from "next/link";
import NextStep from "@/components/NextStep";
import RelayGrid from "@/components/blocks/RelayGrid";
import RelayWorld from "@/components/globe/RelayWorld";
import Glow from "@/components/landing/Glow";
import LiveDemo from "@/components/landing/LiveDemo";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import GlassIcon from "@/components/ui/GlassIcon";
import GridBackground from "@/components/ui/GridBackground";
import SectionHeader from "@/components/ui/SectionHeader";
import StatusPill from "@/components/ui/StatusPill";
import WordsReveal from "@/components/ui/WordsReveal";
import { publicCoreUrl } from "@/lib/core";

export const metadata: Metadata = {
  title: "Flux",
  description:
    "Les serveurs de flux SRTLA SYXTEE NETWORKS en ligne, comment choisir le plus adapté à l'endroit où tu streames, et la latence à laquelle t'attendre en IRL.",
  alternates: { canonical: "/relais" },
};

// Latence de bout en bout : chaque maillon, avec sa part approximative de la frise.
const latency = [
  { k: "Téléphone vers relais", v: "Quelques dizaines de ms", note: "Plus si le relais est sur un autre continent : environ 100 ms entre l'Europe et l'Amérique du Nord.", share: 12 },
  { k: "Réserve SRT", v: "1 à 3 s", note: "Le tampon qui laisse le temps de récupérer les paquets perdus. Plus ton réseau est instable, plus il doit être grand.", share: 56 },
  { k: "Relais vers OBS", v: "Très faible", note: "Ton ordinateur est en général sur une connexion fixe, stable et rapide.", share: 6 },
  { k: "OBS vers viewers", v: "Quelques secondes", note: "La latence de la plateforme elle-même, la même que pour tes lives à la maison.", share: 26 },
];

const tips = [
  {
    icon: "map" as const,
    title: "Le plus proche de là où tu streames",
    text: "Choisis le relais le plus proche de l'endroit où tu vas filmer, pas de chez toi. C'est la liaison entre ton téléphone et le relais qui est fragile : elle passe par la 4G ou la 5G, avec des pertes. Plus le relais est proche, plus les paquets perdus sont renvoyés vite, et moins il faut de réserve.",
  },
  {
    icon: "obs-cloud" as const,
    title: "Et ton OBS ?",
    text: "Ton ordinateur récupère le flux sur une connexion fixe (fibre, câble), bien plus stable. La distance entre le relais et ton OBS compte donc beaucoup moins que celle entre ton téléphone et le relais.",
  },
  {
    icon: "relay" as const,
    title: "En voyage",
    text: "Si tu pars streamer dans une autre région, change simplement de relais dans ton application avant le live. Ta source dans OBS devra pointer vers le même relais : garde une source par relais, prête à l'emploi.",
  },
];

export default function RelaisPage() {
  return (
    <>
      <Glow />
      {/* Hero */}
      <section className="relative -mt-[4.0625rem] overflow-hidden border-b border-line pb-20 pt-[9rem] text-center sm:pb-28 sm:pt-[10.5rem]">
        <GridBackground />
        <Container className="relative">
          <StatusPill variant="ok" label="Serveurs opérationnels" />
          <h1 className="h-serif mx-auto mt-8 max-w-[14ch] text-[clamp(3rem,8vw,5.5rem)]">
            <WordsReveal text="Nos flux." />
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] text-base leading-relaxed text-muted sm:text-lg">
            Des serveurs SRTLA et RTMP qui gardent ton direct stable. Choisis le plus proche de l&apos;endroit où tu streames.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/acces">Demander l&apos;accès</ButtonLink>
            <ButtonLink href="#serveurs" variant="secondary">Voir les serveurs</ButtonLink>
          </div>
        </Container>
      </section>

      {/* Serveurs */}
      <section id="serveurs" className="scroll-mt-20 border-b border-line py-24 sm:py-32">
        <Container>
          <SectionHeader icon="relay" title={<>Nos <em>serveurs.</em></>} subtitle="Les relais SYXTEE tournent 24 h sur 24. De nouvelles régions ouvrent selon la demande de la communauté : propose la tienne dans la communauté." />
          <div className="mt-16">
            <RelayWorld coreUrl={publicCoreUrl} />
          </div>
          <div className="mt-14">
            <RelayGrid />
          </div>
        </Container>
      </section>

      {/* Démo des stats du relais */}
      <section className="border-b border-line py-24 sm:py-32">
        <Container>
          <SectionHeader icon="health" title={<>Un flux qui ne lâche <em>pas.</em></>} subtitle="Coupe une connexion et regarde le bonding compenser. Une simulation : débit, latence et perte réagissent en direct." />
          <div className="mt-14">
            <LiveDemo />
          </div>
        </Container>
      </section>

      {/* Choisir son serveur : trois cartes */}
      <section className="border-b border-line py-24 sm:py-32">
        <Container>
          <SectionHeader align="left" icon="map" title={<>Comment choisir ton <em>serveur.</em></>} subtitle="Trois règles simples pour un flux stable partout." />
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {tips.map((t) => (
              <article key={t.title} className="bento-cell flex flex-col p-7">
                <GlassIcon name={t.icon} size={56} />
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{t.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* Latence */}
      <section className="py-24 sm:py-32">
        <Container>
          <SectionHeader icon="docs" title={<>Latence : à quoi <em>t&apos;attendre.</em></>} subtitle="En IRL, on échange un peu de latence contre de la stabilité. Ta vidéo arrive dans OBS avec un petit retard volontaire : c'est lui qui absorbe les micro-coupures du réseau mobile." />
          {/* frise : la part de chaque maillon dans le délai total */}
          <div className="bento-cell mt-14 p-6 sm:p-8">
            <div className="flex h-3 overflow-hidden rounded-full bg-foreground/10" role="img" aria-label="Part de chaque maillon dans la latence totale">
              {latency.map((l, i) => (
                <span key={l.k} className="h-full border-r border-background last:border-r-0" style={{ width: `${l.share}%`, background: "var(--foreground)", opacity: 0.25 + i * 0.2 }} />
              ))}
            </div>
            <dl className="mt-8 grid gap-6 sm:grid-cols-2">
              {latency.map((l, i) => (
                <div key={l.k} className="flex gap-4">
                  <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-foreground" style={{ opacity: 0.25 + i * 0.2 }} />
                  <div>
                    <dt className="text-xs font-mono uppercase tracking-[0.08em] text-muted">{l.k}</dt>
                    <dd className="mt-1 text-lg font-medium tracking-tight">{l.v}</dd>
                    <dd className="mt-1 text-sm leading-relaxed text-muted">{l.note}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
          <div className="bento-cell mt-4 flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Au total</p>
              <p className="mt-2 font-mono text-5xl font-medium tabular-nums tracking-tight sm:text-6xl">+1 à 3 s</p>
            </div>
            <p className="max-w-[48ch] text-sm leading-relaxed text-muted">
              Compte en général une à trois secondes de plus qu&apos;un live à la maison. Tes viewers ne le remarquent pas, et tu peux toujours répondre au chat normalement.
            </p>
          </div>
          <p className="mt-6 text-sm text-muted">
            Pour aller plus loin :{" "}
            <Link href="/fonctionnement" className="text-foreground underline-offset-4 hover:underline">comment fonctionne le bonding</Link>.
          </p>
        </Container>
      </section>
      <NextStep label="Demander l'accès" href="/acces" />
    </>
  );
}
