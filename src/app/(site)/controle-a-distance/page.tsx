import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType, CSSProperties } from "react";
import { DeviceMobile, Faders, LockKey, Rows, ShieldCheck, type IconProps } from "@/components/icons";
import CloudBackdrop from "@/components/home/CloudBackdrop";
import FloatingPhone from "@/components/remote-showcase/FloatingPhone";
import ProgramPeek from "@/components/mockups/ProgramPeek";
import PhoneStory, { type Step } from "@/components/remote-showcase/PhoneStory";
import { Container } from "@/components/ui";
import Highlight from "@/components/ui/Highlight";

export const metadata: Metadata = {
  title: "Contrôle à distance : le direct n'a plus de bureau",
  description: "Pilote le vrai OBS de ton ordinateur depuis ton téléphone : scènes, sources, son, direct. Image et son du programme, où que tu sois.",
  alternates: { canonical: "/controle-a-distance" },
};

const btn =
  "inline-flex h-12 items-center justify-center gap-3 whitespace-nowrap rounded-xl px-7 text-base font-medium transition-[background-color,transform] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const corner = "pointer-events-none absolute h-9 w-9 border-accent sm:h-12 sm:w-12";

const STEPS: Step[] = [
  {
    title: "Une scène. Un toucher.",
    text: "Touche une scène : OBS change sur ton ordinateur, tout de suite. Et si tu changes dans OBS, ton téléphone suit.",
    src: "/images/remote/controle-mobile.png",
    alt: "Liste des scènes d'OBS sur téléphone, la scène en direct en bleu",
  },
  {
    title: "Tes sources, d'un doigt.",
    text: "Montre ou cache n'importe quelle source de la scène, comme l'œil d'OBS. Navigateur, texte, média, flux : tout y est.",
    src: "/images/remote/controle-mobile-sources.png",
    alt: "Sources de la scène avec leur type et l'œil pour les afficher ou les masquer",
  },
  {
    title: "Le son, sous ton pouce.",
    text: "Un fader par piste, les niveaux en direct, le mute et l'écoute. Chaque scène a ses sons : tu ne vois que les bons.",
    src: "/images/remote/controle-mobile-mixer.png",
    alt: "Mixeur audio vertical avec niveaux en direct",
  },
  {
    title: "Le direct, en un geste.",
    text: "Pars en direct, enregistre, surveille le débit. Une confirmation te protège des fausses manipulations.",
    src: "/images/remote/controle-mobile-controles.png",
    alt: "Bouton Arrêter le direct en rouge avec la durée, et le débit du flux",
  },
];

type Tile = { title: string; text: string; icon?: ComponentType<IconProps>; className: string; image?: boolean; href?: string; cta?: string };
// 4 colonnes sur 3 rangées : aperçu (2x2), quatre tuiles, puis une bande pleine largeur. 12 cases, 6 tuiles, aucune vide.
const TILES: Tile[] = [
  { title: "L'image et le son de ton programme", text: "Tu vois ce que voient tes spectateurs, avec le son, sur ton téléphone. Coupé par défaut, un toucher pour l'entendre.", className: "lg:col-span-2 lg:row-span-2", image: true },
  { title: "Mode studio", text: "Prépare la scène suivante, puis envoie-la d'un toucher.", icon: Faders, className: "lg:col-span-1" },
  { title: "Écran de secours", text: "Si l'image se fige, OBS passe tout seul sur ta scène de secours.", icon: ShieldCheck, className: "lg:col-span-1" },
  { title: "Rien à ouvrir", text: "Ton ordinateur se connecte à SYXTEE. Aucun port, aucun mot de passe, aucun réglage réseau.", icon: LockKey, className: "lg:col-span-1" },
  { title: "Profils et collections", text: "Change de profil ou de collection de scènes d'un toucher, hors direct.", icon: Rows, className: "lg:col-span-1" },
  { title: "Comme une vraie app", text: "Mets SYXTEE sur ton écran d'accueil : plein écran, écran toujours allumé, un toucher pour ouvrir.", icon: DeviceMobile, className: "lg:col-span-4", href: "/application", cta: "Mettre sur l'écran d'accueil" },
];

export default function ControlePage() {
  return (
    <>
      {/* 1. Hero : sombre, comme l'accueil */}
      <section data-theme="dark" className="relative -mt-[4.0625rem] overflow-hidden border-b border-line bg-background text-foreground">
        <CloudBackdrop />
        <Container className="relative pb-20 pt-[8.5rem] sm:pb-28 sm:pt-[10rem]">
          <div className="grid items-center gap-16 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
            <div className="relative px-1 py-6 sm:px-10 sm:py-10">
              <span aria-hidden="true" className={`${corner} left-0 top-0 border-l-[5px] border-t-[5px]`} />
              <span aria-hidden="true" className={`${corner} bottom-0 left-0 border-b-[5px] border-l-[5px]`} />
              <p className="rise mb-6 inline-flex items-center gap-3 rounded-full border border-foreground/20 bg-background/60 py-1.5 pl-1.5 pr-4 text-sm backdrop-blur-sm" style={{ "--i": 0 } as CSSProperties}>
                <span className="rounded-full bg-accent px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-on-accent">Nouveau</span>
                Contrôle à distance
              </p>
              <h1 className="rise h-hero" style={{ "--i": 1 } as CSSProperties}>
                Le direct n&apos;a plus de <Highlight>bureau.</Highlight>
              </h1>
              <p className="rise mt-6 max-w-[34rem] text-base leading-relaxed text-foreground/75 sm:text-lg" style={{ "--i": 2 } as CSSProperties}>
                Pilote le vrai OBS de ton ordinateur depuis ton téléphone : scènes, son, direct. Où que tu sois.
              </p>
              <div className="rise mt-9 flex flex-col gap-3 sm:flex-row" style={{ "--i": 3 } as CSSProperties}>
                <Link href="/acces" className={`${btn} border border-line-strong bg-accent text-on-accent hover:bg-accent-hover`}>
                  Demander l&apos;accès
                  <span aria-hidden="true">↗</span>
                </Link>
                <Link href="/application" className={`${btn} border border-foreground/20 bg-background/60 text-foreground backdrop-blur-sm hover:bg-background/90`}>
                  Mettre sur l&apos;écran d&apos;accueil
                </Link>
              </div>
            </div>
            <FloatingPhone />
          </div>
        </Container>
      </section>

      {/* 2. Manifeste */}
      <section className="py-28 sm:py-40">
        <Container className="max-w-4xl text-center">
          <h2 className="h-hero">Avant, ton direct s&apos;arrêtait là où ton ordinateur s&apos;arrêtait.</h2>
          <p className="mt-10 text-3xl font-semibold tracking-tight text-muted sm:text-5xl">
            Maintenant, <Highlight>il te suit.</Highlight>
          </p>
        </Container>
      </section>

      {/* 3. Récit défilant : le téléphone, quatre gestes */}
      <section aria-label="Ce que tu fais depuis ton téléphone" className="border-t border-line">
        <PhoneStory steps={STEPS} />
      </section>

      {/* 4. Tout OBS, sans ton écran */}
      <section className="border-t border-line py-24 sm:py-32">
        <Container>
          <h2 className="h-section max-w-3xl">Tout OBS, sans être devant ton écran.</h2>
          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[repeat(3,minmax(11rem,auto))]">
            {TILES.map((t) => {
              const Icon = t.icon;
              return (
                <article key={t.title} className={`relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-6 sm:p-7 ${t.className}`}>
                  {Icon && <Icon size={26} weight="regular" className="text-foreground" aria-hidden="true" />}
                  <h3 className={`font-semibold tracking-tight ${t.image ? "text-2xl sm:text-3xl" : "mt-5 text-lg"}`}>{t.title}</h3>
                  <p className={`mt-2 text-sm leading-relaxed text-muted ${t.image ? "max-w-[40ch] sm:text-base" : ""}`}>{t.text}</p>
                  {t.image && (
                    <div className="mt-auto -mb-6 pt-8 sm:-mb-7 sm:px-6">
                      <ProgramPeek className="pointer-events-none" />
                    </div>
                  )}
                  {t.href && (
                    <Link href={t.href} className="btn btn-secondary mt-6 self-start">
                      {t.cta}
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      {/* 5. Appel final */}
      <section data-theme="dark" className="relative overflow-hidden bg-background py-28 text-foreground sm:py-36">
        <CloudBackdrop flip />
        <Container className="relative">
          <div className="relative mx-auto max-w-4xl px-6 py-14 text-center sm:px-14 sm:py-20">
            <span aria-hidden="true" className={`${corner} left-0 top-0 border-l-[5px] border-t-[5px]`} />
            <span aria-hidden="true" className={`${corner} right-0 top-0 border-r-[5px] border-t-[5px]`} />
            <span aria-hidden="true" className={`${corner} bottom-0 left-0 border-b-[5px] border-l-[5px]`} />
            <span aria-hidden="true" className={`${corner} bottom-0 right-0 border-b-[5px] border-r-[5px]`} />
            <h2 className="h-hero mx-auto max-w-3xl">
              Ton prochain direct, <Highlight>sans bureau.</Highlight>
            </h2>
            <div className="mt-10 flex flex-col items-center gap-4">
              <Link href="/acces" className={`${btn} border border-line-strong bg-accent px-8 text-on-accent hover:bg-accent-hover`}>
                Demander l&apos;accès
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
