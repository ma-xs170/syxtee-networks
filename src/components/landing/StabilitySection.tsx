"use client";

import { useId, useState } from "react";
import { Container } from "../ui";
import Highlight from "../ui/Highlight";
import Reveal from "../ui/Reveal";

// Accueil : « Signal instable ? L'image reste fluide. » Un curseur compare le flux brut (blocs, images fantômes) au flux lissé par le tampon
// du relais, et une courbe montre la connexion du streamer face à ce que voient les spectateurs. Dessins filaires, couleurs par jetons.

const h2 = "h-serif text-[clamp(2.25rem,4.5vw,3.5rem)]";

// Connexion du streamer (débit instable) et débit côté spectateurs (lissé par le tampon), sur une grille de 600 × 120.
const CONNECTION = [0, 70, 20, 40, 12, 96, 40, 82, 60, 70, 78, 110, 105, 44, 130, 90, 150, 112, 170, 60, 190, 16, 215, 66, 235, 100, 255, 54, 280, 22, 300, 98, 322, 114, 345, 48, 368, 84, 392, 26, 415, 96, 440, 108, 462, 40, 486, 74, 510, 18, 534, 90, 560, 112, 585, 60, 600, 80];
const VIEWERS = "M0 60 C 60 58, 90 62, 150 60 S 260 58, 320 61 S 430 59, 500 60 S 570 61, 600 60";

const points = (flat: number[]) => flat.reduce<string[]>((acc, v, i) => (i % 2 ? acc : [...acc, `${v},${flat[i + 1]}`]), []).join(" ");

/** La scène : une rue filaire, des silhouettes et un téléphone en l'air. Dessinée en traits, sans photo. */
function Scene() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {/* Immeubles */}
      <path d="M40 250 V90 h110 V250 M150 250 V130 h70 V250 M420 250 V70 h130 V250 M550 250 V120 h60 V250" />
      <path d="M62 112 h20 M100 112 h20 M62 150 h20 M100 150 h20 M62 188 h20 M100 188 h20 M440 92 h22 M486 92 h22 M440 132 h22 M486 132 h22 M440 172 h22 M486 172 h22" strokeWidth="1.2" />
      {/* Sol et perspective */}
      <path d="M0 250 H640 M0 360 L260 250 M640 360 L380 250" strokeWidth="1.2" />
      {/* Foule : têtes et épaules */}
      {[
        [210, 256, 1],
        [262, 270, 1.15],
        [320, 262, 1.3],
        [382, 272, 1.1],
        [440, 258, 0.95],
        [150, 280, 1.2],
        [500, 285, 1.25],
      ].map(([x, y, k]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y - 34 * k} r={9 * k} />
          <path d={`M${x - 20 * k} ${y + 28 * k} C ${x - 18 * k} ${y - 8 * k}, ${x + 18 * k} ${y - 8 * k}, ${x + 20 * k} ${y + 28 * k}`} />
        </g>
      ))}
      {/* Le streamer au centre, téléphone levé */}
      <circle cx="320" cy="168" r="16" strokeWidth="2" />
      <path d="M284 262 C 286 206, 354 206, 356 262 M350 214 L372 150" strokeWidth="2" />
      <rect x="362" y="104" width="26" height="46" rx="5" strokeWidth="2" transform="rotate(12 375 127)" />
    </g>
  );
}

/** Flux brut : blocs de compression, image fantôme décalée, bandes déchirées. */
function Glitch() {
  const blocks: [number, number, number, number, number][] = [
    [250, 150, 36, 30, 0.5], [286, 150, 24, 30, 0.22], [250, 180, 24, 24, 0.34], [330, 190, 48, 26, 0.45], [378, 190, 26, 26, 0.18],
    [420, 100, 30, 24, 0.4], [450, 124, 24, 24, 0.25], [170, 200, 40, 28, 0.35], [210, 228, 24, 22, 0.5], [500, 210, 32, 30, 0.3], [470, 240, 26, 20, 0.45],
  ];
  return (
    <>
      <g className="text-foreground" opacity="0.4" transform="translate(9 0)">
        <Scene />
      </g>
      <g fill="currentColor" className="text-foreground">
        {blocks.map(([x, y, w, h, o]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} opacity={o} />
        ))}
      </g>
      <g stroke="currentColor" strokeWidth="2" className="text-foreground" opacity="0.5">
        <path d="M0 118 h260 M380 118 h260 M0 214 h180 M470 214 h170 M120 300 h400" />
      </g>
    </>
  );
}

export function StabilitySection() {
  const [pos, setPos] = useState(50);
  const id = useId();
  return (
    <section id="stabilite" className="scroll-mt-20 border-b border-line py-24 lg:py-36">
      <Container>
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Stabilité du flux</p>
          <h2 className={`${h2} mt-3`}>
            Signal instable ? <Highlight>L&apos;image reste fluide.</Highlight>
          </h2>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted">
            Ton relais SYXTEE garde une petite avance de vidéo en mémoire. Quand la 4G ou la 5G flanche, il rejoue les paquets perdus avant que tes spectateurs ne les voient : un stream stable et net, sans saccades ni artefacts.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="bento-cell mt-12 p-4 sm:p-8">
          <div className="relative aspect-video select-none overflow-hidden rounded-xl border border-line bg-background text-foreground">
            {/* Sans tampon (dessous) */}
            <svg viewBox="0 0 640 360" className="absolute inset-0 size-full" role="img" aria-label="Flux brut : image en blocs et fantômes">
              <Scene />
              <Glitch />
            </svg>
            {/* Avec tampon (dessus, découvert à droite du curseur) */}
            <svg viewBox="0 0 640 360" className="absolute inset-0 size-full bg-background" style={{ clipPath: `inset(0 0 0 ${pos}%)` }} role="img" aria-label="Flux lissé par le tampon : image nette">
              <Scene />
            </svg>
            <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-line-strong bg-background/90 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide">
              <span aria-hidden="true" className="size-2 rounded-full border border-foreground" />
              Flux brut
            </span>
            <span className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full border border-line-strong bg-background/90 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide">
              <span aria-hidden="true" className="size-2 rounded-full bg-foreground" />
              Avec SYXTEE
            </span>
            {/* Poignée */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-foreground" style={{ left: `${pos}%` }}>
              <span className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-fill text-on-accent shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" /></svg>
              </span>
            </div>
            <label htmlFor={id} className="sr-only">Comparer le flux brut et le flux avec SYXTEE</label>
            <input id={id} type="range" min={0} max={100} step={1} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="absolute inset-0 size-full cursor-ew-resize opacity-0 [touch-action:pan-y]" />
          </div>

          <div className="mt-4 rounded-xl border border-line bg-background p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-wide text-muted">
              <span className="inline-flex items-center gap-2">
                <svg width="28" height="6" aria-hidden="true"><line x1="0" y1="3" x2="28" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" /></svg>
                Ta connexion
              </span>
              <span className="inline-flex items-center gap-2 text-foreground">
                <svg width="28" height="6" aria-hidden="true"><line x1="0" y1="3" x2="28" y2="3" stroke="currentColor" strokeWidth="3" /></svg>
                Ce que voient les spectateurs
              </span>
            </div>
            <svg viewBox="0 0 600 120" preserveAspectRatio="none" className="mt-4 h-28 w-full text-foreground sm:h-36" role="img" aria-label="Débit de la connexion très irrégulier, débit vu par les spectateurs presque plat">
              <g stroke="currentColor" opacity="0.14" strokeWidth="1"><path d="M0 20 H600 M0 60 H600 M0 100 H600" vectorEffect="non-scaling-stroke" /></g>
              <polyline points={points(CONNECTION)} fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <path d={VIEWERS} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["Faible délai", "≈ 0,3 s", "Bonne connexion, échange vif avec le chat."],
              ["Équilibré", "≈ 1 s", "Le bon choix en 4G et 5G."],
              ["Stabilité maximale", "≈ 2,5 s", "Signal très instable, image toujours fluide."],
            ].map(([name, delay, text]) => (
              <div key={name} className="rounded-xl border border-line p-4">
                <dt className="flex items-baseline justify-between gap-3 text-sm font-medium">
                  {name}
                  <span className="font-mono text-xs text-muted">{delay}</span>
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted">{text}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Container>
    </section>
  );
}
