import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import GridBackground from "@/components/ui/GridBackground";
import CircuitArt from "@/components/multistream/CircuitArt";
import SectionHeader from "@/components/ui/SectionHeader";
import StatusPill from "@/components/ui/StatusPill";

export const metadata: Metadata = {
  title: "Multistream",
  description: "Diffuse le même direct sur YouTube, Twitch, Kick, Instagram et d'autres plateformes, directement depuis le plugin SYXTEE.",
  alternates: { canonical: "/multistream" },
};

// Un symbole au trait avant chaque titre : vues (œil), envoi (avion en papier), clic (curseur).
const ICONS = [
  <><path key="a" d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle key="b" cx="12" cy="12" r="3" /></>,
  <path key="c" d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />,
  <path key="d" d="M5 3l14 7-6 2-2 6L5 3Z" />,
];
const REASONS: [string, string][] = [
  ["Plus de vues", "Ton public est réparti sur plusieurs plateformes. Un seul direct les atteint toutes en même temps, sans refaire ton installation."],
  ["Un seul envoi", "Ton ordinateur n'envoie qu'un flux à OBS. La diffusion vers chaque plateforme se fait depuis le plugin : pas besoin de plusieurs encodeurs."],
  ["Un clic par plateforme", "Active ou coupe une plateforme pendant le direct, depuis ton navigateur ou ton téléphone, avec le Contrôle à distance."],
];

const STEPS = [
  "Installe le plugin SYXTEE dans OBS Studio.",
  "Ouvre Contrôle à distance, panneau Multistream, puis « Ajouter ».",
  "Choisis la plateforme : l'adresse du serveur est déjà remplie, tu colles ta clé de stream.",
  "Lance le direct : chaque plateforme active démarre avec lui.",
];

export default function MultistreamPage() {
  return (
    <>
      <section className="relative -mt-[4.0625rem] overflow-hidden border-b border-line pb-16 pt-[9rem] text-center sm:pb-24 sm:pt-[10.5rem]">
        <GridBackground />
        <Container className="relative">
          <StatusPill variant="ok" label="DANS LE PLUGIN" />
          <h1 className="h-serif mx-auto mt-8 max-w-[16ch] text-[clamp(3rem,8vw,5.5rem)]">Un direct, <em>toutes tes plateformes.</em></h1>
          <p className="mx-auto mt-6 max-w-[56ch] text-base leading-relaxed text-muted sm:text-lg">
            On a pensé aux streamers qui veulent plus de vues. Le multistream est intégré au plugin SYXTEE : tu diffuses partout en même temps, sans rien installer de plus.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/acces">Demander l&apos;accès</ButtonLink>
            <ButtonLink href="/controle-a-distance" variant="secondary">Voir le contrôle à distance</ButtonLink>
          </div>
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-24">
        <Container>
          <SectionHeader title={<>Diffuse <em>partout.</em></>} subtitle="Une adresse et une clé par plateforme, et c'est prêt. Toute autre plateforme qui accepte une adresse RTMP fonctionne aussi." />
          <CircuitArt className="mx-auto mt-12 max-w-2xl" />
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-28">
        <Container>
          <SectionHeader title={<>Pensé pour <em>grandir.</em></>} subtitle="Plus de plateformes, c'est plus de spectateurs. Sans compliquer ton direct." />
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {REASONS.map(([t, x], i) => {
              return (
              <article key={t} className="bento-cell p-6 sm:p-7">
                <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-foreground/80">{ICONS[i]}</svg>
                  {t}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{x}</p>
              </article>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-28">
        <Container className="max-w-3xl">
          <SectionHeader title={<>Comment <em>ça marche.</em></>} />
          <ol className="mt-12 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s} className="bento-cell flex gap-4 p-5">
                <span className="font-mono text-sm tabular-nums text-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-base leading-relaxed text-muted">{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-center text-sm text-muted">Les clés de stream restent sur ton ordinateur : elles ne sont jamais renvoyées au site.</p>
        </Container>
      </section>
    </>
  );
}
