import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType, CSSProperties } from "react";
import { DeviceMobile, Faders, LockKey, ShieldCheck, type IconProps } from "@/components/icons";
import ObsHero from "@/components/landing/ObsHero";
import PhoneStory, { type Step } from "@/components/remote-showcase/PhoneStory";
import { Container } from "@/components/ui";
import { Envelope } from "@phosphor-icons/react/dist/ssr";
import { glow } from "@/lib/glow";

export const metadata: Metadata = {
  title: "Contrôle à distance d'OBS depuis ton téléphone",
  description: "Pilote le vrai OBS de ton ordinateur depuis ton téléphone : scènes, sources, son, direct. Image et son du programme, où que tu sois.",
  alternates: { canonical: "/controle-a-distance" },
};

const STEPS: Step[] = [
  {
    title: "Une scène. Un toucher.",
    text: "Touche une scène : OBS change sur ton ordinateur, tout de suite. Et si tu changes dans OBS, ton téléphone suit.",
    src: "/images/remote/controle-mobile-v3.png",
    alt: "Liste des scènes d'OBS sur téléphone, la scène en direct en surbrillance",
  },
  {
    title: "Tes sources, d'un doigt.",
    text: "Montre ou cache n'importe quelle source de la scène, comme l'œil d'OBS. Navigateur, texte, média, flux : tout y est.",
    src: "/images/remote/controle-mobile-v3-sources.png",
    alt: "Sources de la scène avec leur type et l'œil pour les afficher ou les masquer",
  },
  {
    title: "Le son, sous ton pouce.",
    text: "Un fader par piste, les niveaux en direct, le mute et l'écoute. Chaque scène a ses sons : tu ne vois que les bons.",
    src: "/images/remote/controle-mobile-v3-mixer.png",
    alt: "Mixeur audio vertical avec niveaux en direct",
  },
  {
    title: "Le direct, en un geste.",
    text: "Pars en direct, enregistre, surveille le débit. Une confirmation te protège des fausses manipulations.",
    src: "/images/remote/controle-mobile-v3-controles.png",
    alt: "Bouton Arrêter le direct en rouge avec la durée, et le débit du flux",
  },
];

type Feature = { title: string; text: string; icon: ComponentType<IconProps> };
const FEATURES: Feature[] = [
  { title: "Mode studio", text: "Prépare la scène suivante, envoie-la d'un toucher.", icon: Faders },
  { title: "Écran de secours", text: "Si l'image se fige, OBS passe sur ta scène de secours.", icon: ShieldCheck },
  { title: "Rien à ouvrir", text: "Aucun port, aucun mot de passe, aucun réglage réseau.", icon: LockKey },
  { title: "Comme une vraie app", text: "SYXTEE sur ton écran d'accueil, en plein écran.", icon: DeviceMobile },
];

const GUARDIAN: { tag: string; title: string; text: string }[] = [
  { tag: "Relance", title: "OBS plante, il revient.", text: "Le Gardien rouvre OBS en quelques secondes et remet tes scènes comme avant." },
  { tag: "Direct", title: "Ton direct repart.", text: "Si tu étais en direct, il reprend dès qu'OBS est de retour." },
  { tag: "À distance", title: "Un bouton, où que tu sois.", text: "« Relancer OBS » depuis ton téléphone, même écran verrouillé." },
];

const WHITE = "inline-flex h-12 items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-foreground px-6 text-[15px] font-medium text-background transition-opacity hover:opacity-85";
const TONAL = "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border border-foreground/25 bg-foreground/[0.06] px-6 text-[15px] font-medium text-foreground transition-colors hover:bg-foreground/[0.12]";

export default function ControlePage() {
  return (
    <>
      {/* 1. Hero : centré comme l'accueil, les appareils juste dessous */}
      <section data-hero data-theme="dark" className="relative isolate overflow-hidden border-b border-line bg-background text-foreground">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={glow("var(--bad)", "50% 0%", 70, 80, 28)} />
        <Container className="pb-20 pt-[calc(5rem+65px)] text-center lg:pb-28 lg:pt-[calc(7rem+65px)]">
          <h1 className="rise h-serif mx-auto max-w-[14ch] text-[clamp(2.75rem,6.5vw,5.5rem)]" style={{ "--i": 0 } as CSSProperties}>
            Le direct n&apos;a plus de <em>bureau.</em>
          </h1>
          <p className="rise mx-auto mt-6 max-w-[40ch] text-lg leading-relaxed text-muted" style={{ "--i": 1 } as CSSProperties}>
            Pilote le vrai OBS de ton ordinateur depuis ton téléphone. Où que tu sois.
          </p>
          <div className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ "--i": 2 } as CSSProperties}>
            <Link href="/inscription" className={WHITE}>Créer mon compte</Link>
            <Link href="/application" className={TONAL}>Mettre sur l&apos;écran d&apos;accueil</Link>
          </div>
          <div className="mx-auto mt-16 max-w-5xl lg:mt-20"><ObsHero still /></div>
        </Container>
      </section>

      {/* 2. Récit défilant : le téléphone, quatre gestes */}
      <section aria-label="Ce que tu fais depuis ton téléphone">
        <PhoneStory steps={STEPS} />
      </section>

      {/* 3. L'essentiel, en quatre lignes */}
      <section className="border-t border-line py-24 sm:py-32">
        <Container>
          <h2 className="h-serif mx-auto max-w-3xl text-center text-[clamp(2.25rem,4.5vw,3.5rem)]">Tout OBS, sans être <em>devant ton écran.</em></h2>
          <ul className="mx-auto mt-16 grid max-w-5xl gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title}>
                  <Icon size={26} weight="regular" className="text-foreground" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* 4. Gardien : trois lignes, sans cartes */}
      <section aria-labelledby="gardien" className="relative isolate overflow-hidden border-t border-line py-24 sm:py-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={glow("var(--bad)", "100% 100%", 70, 60, 24)} />
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="gardien" className="h-serif text-[clamp(2.25rem,4.5vw,3.5rem)]">
              OBS plante en plein stream&nbsp;? <em>Il redémarre tout seul.</em>
            </h2>
            <p className="mx-auto mt-6 max-w-[48ch] text-base leading-relaxed text-muted sm:text-lg">
              Le Gardien veille sur ton Mac, indépendamment d&apos;OBS. Le direct est interrompu le temps du redémarrage, pas toute la soirée.
            </p>
          </div>
          <ol className="mx-auto mt-14 grid max-w-5xl border-t border-line md:grid-cols-3 md:border-l">
            {GUARDIAN.map((g, i) => (
              <li key={g.tag} className="border-b border-line p-6 sm:p-8 md:border-r">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">0{i + 1} · {g.tag}</span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{g.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{g.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-center text-sm text-muted">Disponible sur Mac.</p>
        </Container>
      </section>

      {/* 5. Appel final */}
      <section data-theme="dark" className="relative isolate overflow-hidden border-t border-line bg-background py-28 text-foreground sm:py-40">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={glow("var(--bad)", "50% 40%", 60, 80, 24)} />
        <Container className="text-center">
          <h2 className="h-serif mx-auto max-w-[16ch] text-[clamp(2.75rem,6vw,4.5rem)]">Ton prochain direct, <em>sans bureau.</em></h2>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/inscription" className={WHITE}>Créer mon compte</Link>
            <Link href="/contact" className={TONAL}><Envelope size={18} weight="fill" aria-hidden="true" className="mr-2.5" />Contactez-nous</Link>
          </div>
        </Container>
      </section>
    </>
  );
}
