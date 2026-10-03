"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type ComponentType } from "react";
import { DesktopTower, DeviceMobile } from "@phosphor-icons/react";
import HeroStreet from "./HeroStreet";
import { useReducedMotion } from "motion/react";
import DataCenter from "../illustrations/DataCenter";
import StreamerDesk from "../illustrations/StreamerDesk";
import PhoneMoblin from "../illustrations/PhoneMoblin";
import RelayServer from "../illustrations/RelayServer";
import StudioWire from "../illustrations/StudioWire";

// Accueil : liste numérotée à gauche, démo à droite. Le panneau actif change tout seul toutes les 7 s pour montrer
// l'ensemble, s'arrête au survol ou au focus, et reste fixe en prefers-reduced-motion.

type Art = ComponentType<{ className?: string; animated?: boolean }>;
type Feature = { name: string; lead: string; hl: string; text: string; art: Art; custom?: "setup"; img?: string; w?: number; h?: number; alt?: string; href?: string };

const FEATURES: Feature[] = [
  {
    name: "Bonding multi-réseaux",
    lead: "Une connexion",
    hl: "qui ne décroche pas.",
    text: "Le bonding agrège 4G, 5G, Wi-Fi et Starlink en une seule liaison. Si un réseau faiblit ou tombe, les autres prennent le relais et le direct continue sans coupure.",
    art: PhoneMoblin,
  },
  {
    name: "Relais SRTLA, RTMP et RIST",
    lead: "Un relais",
    hl: "pour chaque appareil.",
    text: "Moblin, IRL Pro et BELABOX se connectent en SRTLA ; les caméras DJI Osmo, GoPro et OBS en RTMP ; les encodeurs pros en RIST, chiffré en AES-256. Chaque appareil dispose de son propre relais, de son adresse et de sa clé.",
    art: RelayServer,
    img: "/images/outils/relais-v2.png",
    w: 2200,
    h: 2020,
    alt: "La page Mes relais du dashboard : un relais en live et deux relais actifs.",
    href: "/relais",
  },
  {
    name: "Santé du flux",
    lead: "Supervise ton flux",
    hl: "en temps réel.",
    text: "Débit, latence, congestion, pertes et liens actifs sont mesurés en continu, avec l'historique des 15 dernières minutes pour repérer la cause d'une dégradation.",
    art: DataCenter,
    img: "/images/outils/sante-v2.png",
    w: 2200,
    h: 2088,
    alt: "Santé du flux : débit, latence, congestion, pertes, courbe et liens SRTLA.",
  },
  {
    name: "Tableau de bord",
    lead: "Ton activité,",
    hl: "en un seul écran.",
    text: "Statut du direct en cours, temps de diffusion sur 7 et 30 jours, derniers directs et accès rapides à chaque outil.",
    art: DataCenter,
    img: "/images/outils/accueil-v2.png",
    w: 3000,
    h: 2566,
    alt: "L'accueil du dashboard : activité en direct, dernier direct et temps de direct par jour.",
  },
  {
    name: "SYXTEE STUDIO",
    lead: "Pilote OBS",
    hl: "à distance.",
    text: "SYXTEE STUDIO commande ton OBS depuis un navigateur, y compris sur téléphone : changement de scène, démarrage du direct, réglage de l'audio.",
    art: StudioWire,
    img: "/images/outils/studio-v2.png",
    w: 2200,
    h: 1342,
    alt: "SYXTEE STUDIO : la régie avec la liste des scènes et le programme en direct.",
    href: "/syxtee-studio",
  },

  {
    name: "Sources PC et IRL",
    lead: "Change de source",
    hl: "sans couper le direct.",
    text: "Diffuse depuis ton téléphone, depuis OBS, ou depuis les deux, puis passe de l'une à l'autre en plein direct depuis ton navigateur.",
    art: PhoneMoblin,
    custom: "setup",
  },
];

/** Démo « PC + IRL » : deux sources cliquables, l'aperçu en direct suit celle qu'on choisit. */
function SetupSwitch({ animated }: { animated: boolean }) {
  const [src, setSrc] = useState(0);
  const SOURCES: { name: string; kind: string; icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>; art: Art }[] = [
    { name: "Caméra IRL", kind: "Téléphone", icon: DeviceMobile, art: HeroStreet as Art },
    { name: "OBS", kind: "PC, face cam", icon: DesktopTower, art: StreamerDesk },
  ];
  const Preview = SOURCES[src].art;
  return (
    <div className="absolute inset-0 flex flex-col gap-3 p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-3">
        {SOURCES.map((x, i) => {
          const on = i === src;
          return (
            <button
              key={x.name}
              type="button"
              onClick={() => setSrc(i)}
              aria-pressed={on}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${on ? "border-accent bg-accent/10" : "border-line bg-background/40 hover:border-line-strong"}`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${on ? "border-accent/60 text-accent" : "border-line text-muted"}`}>
                <x.icon size={20} aria-hidden={true} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{x.name}</span>
                <span className="block text-xs text-muted">{x.kind}</span>
              </span>
              {on && <span className="hidden whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-on-accent sm:inline">Dans l&apos;aperçu</span>}
            </button>
          );
        })}
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-line bg-background/40 p-2">
        <span className="absolute left-3 top-3 z-10 rounded bg-live px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-on-accent">En direct</span>
        <Preview key={src} animated={animated} className="h-full w-full" />
      </div>
    </div>
  );
}

const DELAY = 7000;
/** Rapport largeur/hauteur du cadre des démos. */
const FRAME = 16 / 10;

export default function FeatureExplorer() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const auto = !reduce && !paused;

  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => setActive((i) => (i + 1) % FEATURES.length), DELAY);
    return () => clearTimeout(t);
  }, [auto, active]);

  const f = FEATURES[active];
  const Art = f.art;
  const tall = !!f.img && f.w! / f.h! < FRAME;

  return (
    <section aria-labelledby="fonctions-titre" className="border-b border-line py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2 id="fonctions-titre" className="h-section max-w-3xl">
          Les fonctionnalités essentielles du streaming IRL
        </h2>

        <div
          className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:gap-16"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div role="tablist" aria-label="Fonctionnalités" aria-orientation="vertical" className="border-t border-line">
            {FEATURES.map((it, i) => {
              const on = i === active;
              return (
                <button
                  key={it.name}
                  role="tab"
                  type="button"
                  id={`f-tab-${i}`}
                  aria-selected={on}
                  aria-controls="f-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => setActive(i)}
                  className={`relative flex w-full items-center gap-4 border-b border-line py-5 text-left text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${on ? "text-foreground" : "text-muted hover:text-foreground"}`}
                >
                  <span className="font-mono text-base tabular-nums text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-medium">{it.name}</span>
                  {on && (
                    <span aria-hidden="true" className="absolute inset-x-0 bottom-[-1px] h-[2px] overflow-hidden bg-transparent">
                      <span
                        key={`${active}-${auto}`}
                        className="block h-full w-full origin-left bg-accent"
                        style={auto ? { animation: `fe-progress ${DELAY}ms linear forwards` } : undefined}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div id="f-panel" role="tabpanel" aria-labelledby={`f-tab-${active}`} className="min-w-0">
            {/* Bloc de texte à hauteur réservée : le cadre de démo reste à la même place quelle que soit la fonctionnalité. */}
            <div className="lg:h-[17.5rem]">
            <h3 className="text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
              {f.lead}
              <br />
              <span className="text-accent">{f.hl}</span>
            </h3>
            <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-muted sm:text-lg">{f.text}</p>
            {f.href && (
              <Link href={f.href} className="group mt-5 inline-flex items-center gap-2 text-sm text-foreground underline-offset-4 hover:underline">
                En savoir plus
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
                  →
                </span>
              </Link>
            )}
            </div>
            {/* Cadre à format fixe (16/10) : la page ne bouge plus d'une fonctionnalité à l'autre. Une capture trop haute
                coulisse lentement de haut en bas (transform seulement), arrêtée en mouvement réduit. */}
            <div className="relative mt-6 aspect-[16/10] w-full overflow-hidden rounded-2xl border border-line bg-surface">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_100%,color-mix(in_srgb,var(--accent)_16%,transparent),transparent_70%)]"
              />
              {f.custom === "setup" ? (
                <SetupSwitch animated={!reduce} />
              ) : f.img ? (
                tall ? (
                  <Image
                    key={f.img}
                    src={f.img}
                    alt={f.alt ?? ""}
                    width={f.w!}
                    height={f.h!}
                    sizes="(min-width: 1024px) 760px, 100vw"
                    className="fe-pan absolute inset-x-0 top-0 h-auto w-full"
                    style={{ "--pan": `${((1 - f.w! / f.h! / FRAME) * 100).toFixed(2)}%` } as React.CSSProperties}
                  />
                ) : (
                  <Image key={f.img} src={f.img} alt={f.alt ?? ""} fill sizes="(min-width: 1024px) 760px, 100vw" className="object-contain p-3" />
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <Art key={active} animated={!reduce} className="h-full w-full" />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-10 flex justify-end">
          <Link href="/fonctionnement" className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-xl border border-line-strong px-6 text-base font-medium transition-colors hover:bg-foreground/10">
            Voir la suite
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
