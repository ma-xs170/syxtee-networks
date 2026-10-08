import type { Metadata } from "next";
import { siFacebook, siInstagram, siKick, siTiktok, siTwitch, siX, siYoutube } from "simple-icons";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import GridBackground from "@/components/ui/GridBackground";
import SectionHeader from "@/components/ui/SectionHeader";
import StatusPill from "@/components/ui/StatusPill";

export const metadata: Metadata = {
  title: "Multistream",
  description: "Diffuse le même direct sur YouTube, Twitch, Kick, Instagram et d'autres plateformes, directement depuis le plugin SYXTEE.",
  alternates: { canonical: "/multistream" },
};

const PLATFORMS = [
  { label: "YouTube", icon: siYoutube },
  { label: "Twitch", icon: siTwitch },
  { label: "Kick", icon: siKick },
  { label: "Instagram", icon: siInstagram },
  { label: "TikTok", icon: siTiktok },
  { label: "Facebook", icon: siFacebook },
  { label: "X", icon: siX },
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
          <ul className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-4" aria-label="Plateformes">
            {PLATFORMS.map((p) => (
              <li key={p.label} className="flex flex-col items-center gap-2">
                <span className="grid size-16 place-items-center rounded-2xl border border-line bg-surface text-foreground">
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" role="img" aria-label={p.label}><path d={p.icon.path} /></svg>
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{p.label}</span>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-6 max-w-md text-sm text-muted">Et toute autre plateforme qui accepte une adresse RTMP.</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/acces">Demander l&apos;accès</ButtonLink>
            <ButtonLink href="/controle-a-distance" variant="secondary">Voir le contrôle à distance</ButtonLink>
          </div>
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-28">
        <Container>
          <SectionHeader title={<>Pensé pour <em>grandir.</em></>} subtitle="Plus de plateformes, c'est plus de spectateurs. Sans compliquer ton direct." />
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {REASONS.map(([t, x]) => (
              <article key={t} className="bento-cell p-6 sm:p-7">
                <h3 className="text-lg font-semibold tracking-tight">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{x}</p>
              </article>
            ))}
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
