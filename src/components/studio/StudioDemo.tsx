"use client";

import { useState, type ComponentType } from "react";
import { useReducedMotion } from "motion/react";
import { Broadcast, Gauge, Gear, Microphone, SlidersHorizontal, SpeakerSimpleSlash, SpeakerSimpleHigh, SquaresFour } from "@/components/icons";
import { DEMO_HEALTH } from "@/lib/demo-health";
import StreamHealth from "../dashboard/StreamHealth";
import HeroStreet from "../home/HeroStreet";
import RelayServer from "../illustrations/RelayServer";
import StreamerDesk from "../illustrations/StreamerDesk";
import StudioWire from "../illustrations/StudioWire";

// Démo de SYXTEE STUDIO (accueil et page produit) : une fenêtre d'application sombre dont chaque page de la barre
// latérale s'ouvre (Régie, Mixeur, Santé du flux, Réglages). Aperçus en filaire à la place de la vidéo, données d'exemple,
// rien n'est connecté.

type Art = ComponentType<{ className?: string; animated?: boolean }>;
type Icon = ComponentType<{ size?: number; "aria-hidden"?: boolean }>;

const SCENES: { name: string; art: Art; caption: string }[] = [
  { name: "Caméra IRL", art: HeroStreet as Art, caption: "iPhone 16 Pro, relais SRTLA" },
  { name: "Face cam", art: StreamerDesk, caption: "OBS sur PC, micro et casque" },
  { name: "Multiview", art: StudioWire, caption: "Aperçu, programme et vignettes" },
  { name: "Ça commence bientôt", art: RelayServer, caption: "Scène d'attente" },
  { name: "Secours", art: RelayServer, caption: "Scène de secours" },
];

type PageId = "regie" | "mixeur" | "sante" | "reglages";
const PAGES: { id: PageId; label: string; icon: Icon }[] = [
  { id: "regie", label: "Régie", icon: SquaresFour },
  { id: "mixeur", label: "Mixeur", icon: SlidersHorizontal },
  { id: "sante", label: "Santé du flux", icon: Gauge },
  { id: "reglages", label: "Réglages", icon: Gear },
];

const SOURCES = [
  { name: "Micro", level: 78, db: -6 },
  { name: "Musique", level: 54, db: -18 },
  { name: "Alertes", level: 66, db: -12 },
];

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${on ? "border-accent bg-accent" : "border-line-strong bg-foreground/10"}`}
    >
      <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-on-accent transition-all ${on ? "left-[1.35rem]" : "left-0.5 bg-foreground/70"}`} />
    </button>
  );
}

function Regie({ live, animated }: { live: boolean; animated: boolean }) {
  const [active, setActive] = useState(0);
  const scene = SCENES[active];
  const Art = scene.art;
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
      <div className="rounded-xl border border-line p-3">
        <p className="px-2 pb-2 text-sm font-medium">Scènes</p>
        <ul role="listbox" aria-label="Scènes" className="space-y-1">
          {SCENES.map((s, i) => (
            <li key={s.name} role="option" aria-selected={i === active}>
              <button
                type="button"
                onClick={() => setActive(i)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${i === active ? "bg-foreground/10 text-foreground" : "text-muted hover:bg-foreground/[0.06] hover:text-foreground"}`}
              >
                {s.name}
                {i === active && live && <span className="live-dot" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="min-w-0">
        <p className="flex items-center justify-between pb-2 text-sm text-muted">
          <span>Programme</span>
          <span className="font-mono text-xs">1080p</span>
        </p>
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-line bg-surface p-3">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_100%,color-mix(in_srgb,var(--accent)_20%,transparent),transparent_70%)]" />
          <Art key={active} animated={animated} className="relative h-full w-full" />
        </div>
        <p className="pt-2 text-xs text-muted">
          {scene.name} · {scene.caption}
        </p>
      </div>
    </div>
  );
}

function Mixeur({ live }: { live: boolean }) {
  const [vals, setVals] = useState(SOURCES.map((s) => s.level));
  const [muted, setMuted] = useState([false, false, false]);
  return (
    <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
      {SOURCES.map((s, i) => {
        const level = muted[i] || !live ? 0 : vals[i];
        return (
          <li key={s.name} className="space-y-4 bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Microphone size={16} aria-hidden={true} />
                {s.name}
              </p>
              <button
                type="button"
                aria-pressed={muted[i]}
                aria-label={`${muted[i] ? "Réactiver" : "Couper"} ${s.name}`}
                onClick={() => setMuted((m) => m.map((v, j) => (j === i ? !v : v)))}
                className={`grid h-8 w-8 place-items-center rounded-lg border transition-colors ${muted[i] ? "border-accent text-accent" : "border-line text-muted hover:text-foreground"}`}
              >
                {muted[i] ? <SpeakerSimpleSlash size={16} aria-hidden={true} /> : <SpeakerSimpleHigh size={16} aria-hidden={true} />}
              </button>
            </div>
            <span className="block h-2 overflow-hidden rounded-full bg-foreground/15" aria-hidden="true">
              <span className="block h-full rounded-full bg-foreground/70 transition-[width] duration-300" style={{ width: `${level}%` }} />
            </span>
            <label className="block">
              <span className="sr-only">Volume {s.name}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={vals[i]}
                onChange={(e) => setVals((v) => v.map((x, j) => (j === i ? Number(e.target.value) : x)))}
                className="w-full accent-[var(--accent)]"
              />
            </label>
            <p className="font-mono text-xs tabular-nums text-muted">{muted[i] ? "coupé" : `${Math.round(-60 + (vals[i] * 60) / 100)} dB`}</p>
          </li>
        );
      })}
    </ul>
  );
}

function Reglages() {
  const [rules, setRules] = useState({ backup: true, auto: true, podcast: false });
  const rows: { key: keyof typeof rules; title: string; text: string }[] = [
    { key: "backup", title: "Secours automatique", text: "Bascule sur ta scène de secours seulement si l'image se fige." },
    { key: "auto", title: "Retour automatique", text: "Reviens à la scène d'origine quand l'image repart." },
    { key: "podcast", title: "Mode podcast", text: "Aligne plusieurs flux et suis la voix de celui qui parle." },
  ];
  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center justify-between gap-6 p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">{r.title}</p>
            <p className="mt-0.5 text-sm text-muted">{r.text}</p>
          </div>
          <Switch on={rules[r.key]} onChange={(v) => setRules((s) => ({ ...s, [r.key]: v }))} label={r.title} />
        </li>
      ))}
    </ul>
  );
}

export default function StudioDemo() {
  const reduce = useReducedMotion();
  const [page, setPage] = useState<PageId>("regie");
  const [live, setLive] = useState(true);
  const current = PAGES.find((p) => p.id === page)!;

  return (
    <div data-theme="dark" className="overflow-hidden rounded-3xl border border-line bg-background text-foreground shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
      <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden border-r border-line p-4 md:block">
          <p className="px-2 pb-5 pt-2 text-sm font-semibold tracking-[0.18em]">
            SYXTEE<span className="font-normal text-muted"> STUDIO</span>
          </p>
          <nav aria-label="Pages du studio">
            <ul className="space-y-1">
              {PAGES.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setPage(n.id)}
                    aria-current={n.id === page ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${n.id === page ? "border-line-strong bg-foreground/10" : "border-transparent text-muted hover:bg-foreground/[0.06] hover:text-foreground"}`}
                  >
                    <n.icon size={18} aria-hidden={true} />
                    {n.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 p-5 sm:p-7">
          <nav aria-label="Pages du studio" className="-mx-1 mb-4 flex gap-1 overflow-x-auto md:hidden">
            {PAGES.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setPage(n.id)}
                aria-current={n.id === page ? "page" : undefined}
                className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm ${n.id === page ? "border-line-strong bg-foreground/10" : "border-transparent text-muted"}`}
              >
                {n.label}
              </button>
            ))}
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">{current.label}</h2>
            <p className="text-xs text-muted">Démo, données d&apos;exemple</p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
            <p className="flex items-center gap-2 text-sm">
              {live ? <span className="live-dot" aria-hidden="true" /> : <span className="h-2 w-2 rounded-full border border-muted" aria-hidden="true" />}
              {live ? "En direct" : "Hors ligne"}
            </p>
            <button
              type="button"
              onClick={() => setLive((v) => !v)}
              className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg px-5 text-sm font-medium transition-colors ${live ? "bg-accent text-on-accent hover:bg-accent-hover" : "border border-line-strong hover:bg-foreground/10"}`}
            >
              <Broadcast size={18} aria-hidden={true} />
              {live ? "Terminer le stream" : "Démarrer le stream"}
            </button>
          </div>

          <div className="mt-5 min-h-[26rem]">
            {page === "regie" && <Regie live={live} animated={!reduce} />}
            {page === "mixeur" && <Mixeur live={live} />}
            {page === "sante" && <StreamHealth coreUrl="" relayId="demo" demo={DEMO_HEALTH} />}
            {page === "reglages" && <Reglages />}
          </div>
        </div>
      </div>
    </div>
  );
}
