"use client";

import { useInView, useReducedMotion } from "motion/react";
import { DeviceGlyph } from "./RegieVisuals";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Démo de la régie IA : trois caméras en fil de fer, un écran Programme, et ce que « voit » l'IA à chaque situation.
// Le scénario change tout seul toutes les quelques secondes (seulement quand la démo est à l'écran) et se choisit au clic.
// prefers-reduced-motion : pas de défilement automatique, les fondus sont coupés.

type Tone = "ok" | "warn" | "idle";
type Scene = { id: string; cam: number; situation: string; rule: string; reason: string; status: [string, Tone][] };

const CAMS = [
  { name: "Osmo", full: "DJI Osmo Pocket 3", role: "à la main" },
  { name: "iPhone", full: "iPhone 16", role: "tableau de bord" },
  { name: "Drone", full: "DJI Mini", role: "en vol" },
];

const SCENES: Scene[] = [
  {
    id: "objet",
    cam: 0,
    situation: "Tu montres un objet à la caméra",
    rule: "Si je montre un objet de près, prends la caméra à la main.",
    reason: "Objet de près au centre de l'image : l'Osmo passe au programme.",
    status: [["objet de près", "ok"], ["plan fixe", "idle"], ["au sol", "idle"]],
  },
  {
    id: "voiture",
    cam: 1,
    situation: "Tu montes dans la voiture",
    rule: "Quand je monte dans la voiture, prends l'iPhone du tableau de bord.",
    reason: "Personne au volant : l'iPhone prend la main. Le drone, sans signal, est écarté.",
    status: [["rangé", "idle"], ["personne au volant", "ok"], ["signal perdu, écarté", "warn"]],
  },
  {
    id: "drone",
    cam: 2,
    situation: "Le drone décolle",
    rule: "Si le drone vole avec une belle vue, passe sur le drone.",
    reason: "Image qui bouge et cadrage large : le drone passe devant.",
    status: [["plan fixe", "idle"], ["plan fixe", "idle"], ["belle image", "ok"]],
  },
];

const CHIP: Record<Tone, string> = { ok: "bg-ok/15 text-ok", warn: "bg-warn/15 text-warn", idle: "bg-foreground/[0.06] text-muted" };

const STEP_MS = 5000;

/** Fils de fer d'une caméra (viewBox 320 x 180). Traits en couleur d'encre, jamais de couleur fixe. */
function Wire({ cam }: { cam: number }) {
  const p = { fill: "none", stroke: "var(--foreground)", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden="true">
      {cam === 0 && (
        <g {...p}>
          {/* personne en arrière-plan, discrète */}
          <circle cx="68" cy="62" r="20" strokeOpacity="0.35" />
          <path d="M30 150 C32 112 104 112 106 150" strokeOpacity="0.35" />
          {/* objet montré de près */}
          <rect x="136" y="48" width="132" height="90" rx="10" />
          <path d="M136 78 H268" />
          <path d="M156 100 H214 M156 114 H190" />
          <circle cx="242" cy="108" r="14" />
          {/* repères de mise au point */}
          <path d="M122 36 V50 M122 36 H136 M282 36 V50 M282 36 H268 M122 150 V136 M122 150 H136 M282 150 V136 M282 150 H268" strokeOpacity="0.6" />
        </g>
      )}
      {cam === 1 && (
        <g {...p}>
          {/* pare-brise, route, tableau de bord */}
          <path d="M40 30 H280 L304 100 H16 Z" strokeOpacity="0.5" />
          <path d="M160 34 L132 98 M160 34 L188 98" strokeOpacity="0.35" strokeDasharray="4 6" />
          <path d="M0 108 H320" />
          <path d="M0 140 C60 128 100 126 160 126 C220 126 260 128 320 140" strokeOpacity="0.5" />
          {/* volant */}
          <circle cx="112" cy="140" r="30" />
          <circle cx="112" cy="140" r="7" />
          <path d="M82 140 H105 M119 140 H142 M112 147 V170" />
          {/* passager qui s'installe */}
          <circle cx="226" cy="72" r="16" />
          <path d="M198 108 C200 84 252 84 254 108" />
        </g>
      )}
      {cam === 2 && (
        <g {...p}>
          {/* vue aérienne : relief, route, soleil */}
          <path d="M0 118 L56 70 L96 104 L150 52 L214 112 L262 80 L320 126" />
          <path d="M0 150 C80 132 140 168 214 146 C260 134 292 142 320 150" strokeOpacity="0.6" />
          <path d="M150 180 C156 160 176 150 196 146" strokeOpacity="0.45" strokeDasharray="5 6" />
          <circle cx="258" cy="38" r="14" strokeOpacity="0.6" />
          {/* repère de cadrage du drone */}
          <path d="M20 20 H40 M20 20 V40 M300 20 H280 M300 20 V40 M20 160 H40 M20 160 V140 M300 160 H280 M300 160 V140" strokeOpacity="0.6" />
          <path d="M148 90 H172 M160 78 V102" strokeOpacity="0.7" />
        </g>
      )}
    </svg>
  );
}

/** `intro` : titre et texte d'accroche, placés au-dessus de la liste des situations (colonne de gauche). */
export default function DirectorDemo({ intro, outro }: { intro?: ReactNode; outro?: ReactNode }) {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const seen = useInView(box, { amount: 0.4 });
  const [i, setI] = useState(0);
  // Un clic prend la main : plus de défilement automatique ensuite.
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (reduce || manual || !seen) return;
    const t = setInterval(() => setI((n) => (n + 1) % SCENES.length), STEP_MS);
    return () => clearInterval(t);
  }, [reduce, manual, seen]);

  const scene = SCENES[i];
  const fade = "transition-opacity duration-500 ease-out motion-reduce:transition-none";

  return (
    <div ref={box} className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
      <div className="min-w-0">
        {intro}
        <div role="tablist" aria-label="Situations de direct" className="mt-10 grid gap-2">
          {SCENES.map((s, n) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={n === i}
              onClick={() => {
                setI(n);
                setManual(true);
              }}
              className={`group relative flex min-h-14 items-center gap-4 overflow-hidden rounded-xl border px-5 text-left text-base transition-colors active:scale-[0.99] ${
                n === i ? "border-foreground/40 bg-surface-2 text-foreground" : "border-line text-muted hover:border-foreground/25 hover:text-foreground"
              }`}
            >
              <span className="font-mono text-xs tabular-nums text-muted">{String(n + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">{s.situation}</span>
              {n === i && !reduce && !manual && seen && (
                <span key={`bar-${i}`} aria-hidden="true" className="director-bar absolute inset-x-0 bottom-0 h-0.5 origin-left bg-foreground/60" style={{ animationDuration: `${STEP_MS}ms` }} />
              )}
            </button>
          ))}
        </div>
        {outro}
      </div>

      <div className="min-w-0 rounded-2xl border border-line bg-surface p-3 sm:p-4">
        {/* Programme */}
        <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-background">
          {SCENES.map((s, n) => (
            <div key={s.id} className={`absolute inset-0 p-4 ${fade} ${n === i ? "opacity-100" : "opacity-0"}`} aria-hidden={n !== i}>
              <Wire cam={s.cam} />
            </div>
          ))}
          <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-md border border-line bg-surface/90 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em]">
            <span className="live-dot" aria-hidden="true" />
            Au programme
          </span>
          <span className="absolute bottom-3 right-3 rounded-md border border-line bg-surface/90 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{CAMS[scene.cam].full}</span>
        </div>

        {/* Caméras : vignette, vrai appareil, état lu par l'IA */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          {CAMS.map((c, n) => (
            <div key={c.name} className={`min-w-0 rounded-xl border p-2 transition-colors motion-reduce:transition-none ${n === scene.cam ? "border-ok/60 bg-surface-2" : "border-line"}`}>
              <div className={`aspect-video overflow-hidden rounded-lg bg-background transition-opacity motion-reduce:transition-none ${n === scene.cam ? "opacity-100" : "opacity-60"}`}>
                <Wire cam={n} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-9 w-7 shrink-0"><DeviceGlyph cam={n} on={n === scene.cam} /></span>
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[11px] uppercase tracking-[0.1em]">{c.name}</span>
                  <span className="block truncate text-xs text-muted">{c.role}</span>
                </span>
              </div>
              <span className={`mt-2 inline-flex max-w-full rounded-md px-2 py-1 text-[11px] leading-tight ${CHIP[scene.status[n][1]]}`}>
                <span>{scene.status[n][0]}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Ce que dit l'IA */}
        <div className="mt-3 rounded-xl border border-line px-4 py-3" aria-live="polite">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Ta consigne</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">« {scene.rule} »</p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Décision de l&apos;IA</p>
          <p className="mt-1 text-sm leading-relaxed">{scene.reason}</p>
        </div>
      </div>
    </div>
  );
}
