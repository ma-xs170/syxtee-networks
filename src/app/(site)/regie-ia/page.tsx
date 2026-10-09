import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import GridBackground from "@/components/ui/GridBackground";
import Highlight from "@/components/ui/Highlight";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";
import StatusPill from "@/components/ui/StatusPill";
import DirectorDemo from "@/components/landing/DirectorDemo";
import { AudioVisual, BackupVisual, MultiCamVisual, TakesVisual } from "@/components/landing/RegieVisuals";

export const metadata: Metadata = {
  title: "Régie IA",
  description: "Plusieurs caméras, une régie qui choisit la bonne : l'IA met au programme la caméra où il se passe quelque chose, avec secours automatique et garde audio.",
  alternates: { canonical: "/regie-ia" },
};

const MODES: { title: string; text: string; example: string; visual: React.ReactNode }[] = [
  {
    title: "Régie IA multi-caméras",
    text: "Osmo, iPhone, drone, téléphones en SRTLA. L'IA regarde une vignette de chaque caméra et met au programme celle qui montre l'action, selon tes consignes écrites en français.",
    example: "Exemple : « si je montre un objet de près, prends la caméra à la main ; quand je monte dans la voiture, prends l'iPhone du tableau de bord ».",
    visual: <MultiCamVisual />,
  },
  {
    title: "Autogérance des prises",
    text: "Une belle prise sur une source (drone, caméra 2, écran, invité) bascule sur sa scène. Quand la prise s'arrête, la régie revient sur ta scène Live. Le drone passe en premier.",
    example: "Exemple : ton DJI Mini décolle pendant un direct, la scène Drone passe à l'antenne, puis tu reviens sur Live à l'atterrissage. Sans IA ni clé, directement sur ton PC.",
    visual: <TakesVisual />,
  },
  {
    title: "Secours si la connexion coupe",
    text: "Si l'image se fige ou si le débit s'effondre, OBS passe sur ta scène de secours, puis revient seul quand le flux repart. Trois niveaux de sensibilité.",
    example: "Exemple : tu passes sous un pont en 4G ou en Starlink, le public voit « On revient vite » au lieu d'une image figée.",
    visual: <BackupVisual />,
  },
  {
    title: "Garde audio",
    text: "Silence prolongé ou micro coupé pendant ta scène Live : une alerte s'affiche. En option, le micro est remis tout seul, ou la régie passe sur le secours.",
    example: "Exemple : tu as coupé ton micro en répondant au téléphone et tu l'as oublié, la régie le remet ou t'avertit après dix secondes.",
    visual: <AudioVisual />,
  },
];

const STEPS = [
  "Installe SYXTEE Link (0.7.0 ou plus récent) sur le Mac ou le PC qui fait tourner OBS.",
  "Dans OBS, crée une scène par caméra, ou laisse SYXTEE la créer depuis le panneau Régie.",
  "Ouvre le Contrôle à distance, bouton « Régie auto », et choisis ta scène Live.",
  "Ajoute tes caméras, écris tes consignes et colle ta clé API. Active la Régie IA.",
];

const SAFEGUARDS = [
  ["Rien ne bouge hors de ta scène Live", "Tant que ta scène Live n'est pas à l'antenne, la régie ne change aucune scène."],
  ["Tu reprends la main d'un tap", "Si tu changes de scène à la main, la régie se met en pause pendant trente secondes."],
  ["Une caméra coupée n'est jamais choisie", "Une image figée ou noire est écartée avant même d'être soumise à l'IA."],
  ["Ta clé reste chez toi", "Les vignettes partent de ton ordinateur vers Anthropic avec ta propre clé. Elles ne passent pas par SYXTEE, et chaque analyse est facturée par Anthropic."],
];

export default function RegieIaPage() {
  return (
    <>
      <section className="relative -mt-[4.0625rem] overflow-hidden border-b border-line pb-16 pt-[9rem] text-center sm:pb-24 sm:pt-[10.5rem]">
        <GridBackground />
        <Container className="relative">
          <StatusPill variant="ok" label="DANS LE CONTRÔLE À DISTANCE" />
          <h1 className="h-serif mx-auto mt-8 max-w-[18ch] text-[clamp(3rem,8vw,5.5rem)]">
            Ta régie <em>s&apos;occupe des caméras.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-[56ch] text-base leading-relaxed text-muted sm:text-lg">
            Plusieurs caméras, un seul direct. SYXTEE choisit la bonne image, bascule sur le secours et surveille ton micro pendant que tu filmes.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/acces">Demander l&apos;accès</ButtonLink>
            <ButtonLink href="/controle-a-distance" variant="secondary">Voir le contrôle à distance</ButtonLink>
          </div>
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-28">
        <Container>
          <DirectorDemo
            intro={
              <Reveal>
                <h2 className="h-serif text-[clamp(2.25rem,4.5vw,3.5rem)]">
                  L&apos;IA <Highlight>regarde pour toi.</Highlight>
                </h2>
                <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted">Choisis une situation : la caméra qui passe au programme et la raison donnée par l&apos;IA changent avec elle.</p>
              </Reveal>
            }
          />
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-28">
        <Container>
          <SectionHeader title={<>Quatre automatismes, <em>un panneau.</em></>} subtitle="Active seulement ce dont tu as besoin. Ils fonctionnent ensemble, depuis le bouton « Régie auto » du Contrôle à distance." />
          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {MODES.map((m) => (
              <Reveal as="article" key={m.title} className="bento-cell flex flex-col p-6 sm:p-8">
                <div className="flex h-48 items-center justify-center sm:h-56">{m.visual}</div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{m.text}</p>
                <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-foreground/80">{m.example}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-28">
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
        </Container>
      </section>

      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeader title={<>Tu gardes <em>la main.</em></>} subtitle="Une régie automatique ne doit jamais te surprendre en direct." />
          <dl className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {SAFEGUARDS.map(([t, x]) => (
              <div key={t}>
                <dt className="text-lg font-semibold tracking-tight">{t}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">{x}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-14">
            <ButtonLink href="/acces">Demander l&apos;accès</ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
