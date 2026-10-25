import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType, CSSProperties } from "react";
import { siKick, siTwitch, siYoutube } from "@/lib/brand-icons";
import { DeviceMobile, Faders, LockKey, Rows, ShieldCheck, type IconProps } from "@/components/icons";
import ObsHero from "@/components/landing/ObsHero";
import ProgramPeek from "@/components/mockups/ProgramPeek";
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
    src: "/images/remote/controle-mobile-v2.png",
    alt: "Liste des scènes d'OBS sur téléphone, la scène en direct en surbrillance",
  },
  {
    title: "Tes sources, d'un doigt.",
    text: "Montre ou cache n'importe quelle source de la scène, comme l'œil d'OBS. Navigateur, texte, média, flux : tout y est.",
    src: "/images/remote/controle-mobile-sources-v2.png",
    alt: "Sources de la scène avec leur type et l'œil pour les afficher ou les masquer",
  },
  {
    title: "Le son, sous ton pouce.",
    text: "Un fader par piste, les niveaux en direct, le mute et l'écoute. Chaque scène a ses sons : tu ne vois que les bons.",
    src: "/images/remote/controle-mobile-mixer-v2.png",
    alt: "Mixeur audio vertical avec niveaux en direct",
  },
  {
    title: "Le direct, en un geste.",
    text: "Pars en direct, enregistre, surveille le débit. Une confirmation te protège des fausses manipulations.",
    src: "/images/remote/controle-mobile-controles-v2.png",
    alt: "Bouton Arrêter le direct en rouge avec la durée, et le débit du flux",
  },
  {
    title: "Toutes tes plateformes.",
    text: "Lance ou coupe chaque sortie multistream (Twitch, YouTube, Kick…) d'un toucher, sans quitter ton téléphone.",
    src: "",
    alt: "Liste des sorties multistream avec leur état et le bouton pour les lancer",
  },
  {
    title: "Le chat, au même endroit.",
    text: "Les messages de toutes tes plateformes dans un seul fil, à côté de ton programme.",
    src: "",
    alt: "Chat unifié de toutes les plateformes",
  },
];

type Tile = { title: string; text: string; icon?: ComponentType<IconProps>; platforms?: boolean; className: string; image?: boolean; href?: string; cta?: string };
// 4 colonnes sur 3 rangées : aperçu (2x2), quatre tuiles, puis deux tuiles larges. 12 cases, 7 tuiles, aucune vide.
const TILES: Tile[] = [
  { title: "L'image et le son de ton programme", text: "Tu vois ce que voient tes spectateurs, avec le son, sur ton téléphone. Coupé par défaut, un toucher pour l'entendre.", className: "lg:col-span-2 lg:row-span-2", image: true },
  { title: "Mode studio", text: "Prépare la scène suivante, puis envoie-la d'un toucher.", icon: Faders, className: "lg:col-span-1" },
  { title: "Écran de secours", text: "Si l'image se fige, OBS passe tout seul sur ta scène de secours.", icon: ShieldCheck, className: "lg:col-span-1" },
  { title: "Rien à ouvrir", text: "Ton ordinateur se connecte à SYXTEE. Aucun port, aucun mot de passe, aucun réglage réseau.", icon: LockKey, className: "lg:col-span-1" },
  { title: "Profils et collections", text: "Change de profil ou de collection de scènes d'un toucher, hors direct.", icon: Rows, className: "lg:col-span-1" },
  { title: "Comme une vraie app", text: "Mets SYXTEE sur ton écran d'accueil : plein écran, écran toujours allumé, un toucher pour ouvrir.", icon: DeviceMobile, className: "lg:col-span-2", href: "/application", cta: "Mettre sur l'écran d'accueil" },
  { title: "Multistream", text: "Diffuse sur Twitch, YouTube et Kick en même temps, et lance ou coupe chaque sortie d'un toucher depuis ton téléphone.", platforms: true, className: "lg:col-span-2", href: "/multistream", cta: "Découvrir le multistream" },
];

const GUARDIAN: { tag: string; title: string; text: string }[] = [
  { tag: "Relance", title: "OBS plante, il revient.", text: "Le Gardien SYXTEE rouvre OBS en quelques secondes, sans fenêtre à valider, et remet tes scènes comme avant." },
  { tag: "Direct", title: "Ton direct repart.", text: "Si tu étais en direct au moment du plantage, il reprend dès qu'OBS est de retour. Tu n'as rien à faire." },
  { tag: "À distance", title: "Un bouton, où que tu sois.", text: "OBS gelé ou fermé à 40 km de ton ordinateur ? « Relancer OBS » depuis ton téléphone, même écran verrouillé." },
];

/** Logos en couleur des plateformes du multistream, puis « +50 » : il y en a plus de cinquante. */
function PlatformLogos() {
  const list = [siYoutube, siTwitch, siKick];
  return (
    <div className="flex items-center gap-4" role="img" aria-label="YouTube, Twitch, Kick et plus de 50 autres plateformes">
      {list.map((p) => (
        <svg key={p.title} viewBox="0 0 24 24" width="28" height="28" fill={`#${p.hex}`} aria-hidden="true" className="no-icon-anim">
          <path d={p.path} />
        </svg>
      ))}
      <span aria-hidden="true" className="font-mono text-lg font-semibold leading-none text-foreground">+50</span>
    </div>
  );
}

const WHITE = "inline-flex h-12 items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-foreground px-6 text-[15px] font-medium text-background transition-opacity hover:opacity-85";
const TONAL = "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border border-foreground/25 bg-foreground/[0.06] px-6 text-[15px] font-medium text-foreground transition-colors hover:bg-foreground/[0.12]";
const eyebrow = "font-mono text-[11px] uppercase tracking-[0.14em] text-muted";

export default function ControlePage() {
  return (
    <>
      {/* 1. Hero : deux colonnes, halo rouge en haut à gauche, sous l'en-tête transparent */}
      <section data-hero data-theme="dark" className="relative isolate overflow-hidden border-b border-line bg-background text-foreground">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={glow("var(--bad)", "0% 0%", 70, 90, 30)} />
        <Container className="grid items-center gap-14 pb-24 pt-[calc(5rem+65px)] lg:grid-cols-[0.8fr_1.2fr] lg:gap-10 lg:pb-32 lg:pt-[calc(7rem+65px)]">
          <div>
            <p className={`rise ${eyebrow}`} style={{ "--i": 0 } as CSSProperties}>Contrôle à distance</p>
            <h1 className="rise h-serif mt-5 max-w-[14ch] text-[clamp(2.75rem,6vw,4.75rem)]" style={{ "--i": 1 } as CSSProperties}>
              Le direct n&apos;a plus de <em>bureau.</em>
            </h1>
            <p className="rise mt-6 max-w-[46ch] text-lg leading-relaxed text-muted" style={{ "--i": 2 } as CSSProperties}>
              Pilote le vrai OBS de ton ordinateur depuis ton téléphone : scènes, son, direct. Où que tu sois.
            </p>
            <div className="rise mt-9 flex flex-col gap-3 sm:flex-row" style={{ "--i": 3 } as CSSProperties}>
              <Link href="/inscription" className={WHITE}>Créer mon compte</Link>
              <Link href="/application" className={TONAL}>Mettre sur l&apos;écran d&apos;accueil</Link>
            </div>
          </div>
          <div className="min-w-0 lg:pr-[9%]"><ObsHero still /></div>
        </Container>
      </section>

      {/* 2. Manifeste */}
      <section className="py-24 sm:py-36">
        <Container className="max-w-4xl text-center">
          <h2 className="h-serif text-[clamp(2.25rem,5vw,3.75rem)]">Avant, ton direct s&apos;arrêtait là où <em>ton ordinateur s&apos;arrêtait.</em></h2>
          <p className="mt-8 text-xl text-muted sm:text-2xl">Maintenant, il te suit.</p>
        </Container>
      </section>

      {/* 3. Récit défilant : le téléphone, quatre gestes */}
      <section aria-label="Ce que tu fais depuis ton téléphone" className="border-t border-line">
        <PhoneStory steps={STEPS} />
      </section>

      {/* 4. Tout OBS, sans ton écran : halo violet à droite */}
      <section className="relative isolate overflow-hidden border-t border-line py-24 sm:py-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={glow("var(--bad)", "100% 0%", 70, 60, 24)} />
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className={eyebrow}>Fonctionnalités</p>
            <h2 className="h-serif mt-4 text-[clamp(2.25rem,4.5vw,3.5rem)]">Tout OBS, sans être <em>devant ton écran.</em></h2>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[repeat(3,minmax(11rem,auto))]">
            {TILES.map((t) => {
              const Icon = t.icon;
              return (
                <article key={t.title} className={`bento-cell relative flex flex-col p-6 sm:p-7 ${t.className}`}>
                  {Icon && <Icon size={26} weight="regular" className="text-foreground" aria-hidden="true" />}
                  {t.platforms && <PlatformLogos />}
                  <h3 className={`font-semibold tracking-tight ${t.image ? "text-2xl sm:text-3xl" : "mt-5 text-lg"}`}>{t.title}</h3>
                  <p className={`mt-2 text-sm leading-relaxed text-muted ${t.image ? "max-w-[40ch] sm:text-base" : ""}`}>{t.text}</p>
                  {t.image && (
                    <div className="mt-auto -mb-6 pt-8 sm:-mb-7 sm:px-6">
                      <ProgramPeek className="pointer-events-none" />
                    </div>
                  )}
                  {t.href && (
                    <Link href={t.href} className="mt-6 inline-flex min-h-11 items-center self-start text-sm font-medium underline-offset-4 hover:underline">
                      {t.cta}
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      {/* 5. Gardien : OBS plante, il redémarre */}
      <section aria-labelledby="gardien" className="relative isolate overflow-hidden border-t border-line py-24 sm:py-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={glow("var(--bad)", "0% 0%", 70, 60, 24)} />
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className={eyebrow}>Gardien</p>
            <h2 id="gardien" className="h-serif mt-4 text-[clamp(2.25rem,4.5vw,3.5rem)]">
              Ton OBS plante en plein stream ? <em>Il redémarre tout seul.</em>
            </h2>
            <p className="mx-auto mt-6 max-w-[56ch] text-base leading-relaxed text-muted sm:text-lg">
              Un petit gardien veille sur ton ordinateur, indépendamment d&apos;OBS, et garde le Mac éveillé même écran verrouillé. Le direct est interrompu le temps du redémarrage, pas toute la soirée.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
            {GUARDIAN.map((g, i) => (
              <article key={g.tag} className="bento-cell flex flex-col p-6 sm:p-7">
                <span className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                  {g.tag}
                  <span>0{i + 1}</span>
                </span>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{g.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{g.text}</p>
              </article>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted">Disponible sur Mac. Après trois plantages en quinze minutes, le Gardien s&apos;arrête et te prévient au lieu de boucler.</p>
        </Container>
      </section>

      {/* 6. Appel final */}
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
