import { siFacebook, siKick, siTiktok, siTwitch, siX, siYoutube } from "simple-icons";

// Accueil : le multistream. Un direct, toutes les plateformes : un logo, une clé de stream, un clic. Tourne dans OBS sur l'ordinateur
// (plugin SYXTEE Link), commandé depuis le contrôle à distance. Logos en encre (jamais de couleur de marque : une seule couleur d'accent).

type Platform = { id: string; label: string; icon?: { path: string }; letter?: string };

const PLATFORMS: Platform[] = [
  { id: "twitch", label: "Twitch", icon: siTwitch },
  { id: "youtube", label: "YouTube", icon: siYoutube },
  { id: "facebook", label: "Facebook", icon: siFacebook },
  { id: "kick", label: "Kick", icon: siKick },
  { id: "tiktok", label: "TikTok", icon: siTiktok },
  { id: "x", label: "X", icon: siX },
  { id: "trovo", label: "Trovo", letter: "T" },
  { id: "autre", label: "Autre service", letter: "+" },
];

function Logo({ p, size = 28 }: { p: Platform; size?: number }) {
  return p.icon ? (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d={p.icon.path} />
    </svg>
  ) : (
    <span aria-hidden="true" className="grid place-items-center rounded-md border border-current font-mono font-semibold leading-none" style={{ width: size, height: size, fontSize: size * 0.5 }}>
      {p.letter}
    </span>
  );
}

const DOCK: { id: string; live: boolean }[] = [
  { id: "twitch", live: true },
  { id: "youtube", live: true },
  { id: "kick", live: false },
  { id: "tiktok", live: false },
];

const byId = (id: string) => PLATFORMS.find((p) => p.id === id)!;

/** Maquette du dock Multistream du contrôle à distance (Twitch et YouTube en direct, Kick et TikTok arrêtés). */
export function MultistreamDock() {
  return (
    <figure aria-label="Aperçu du multistream : Twitch et YouTube en direct, Kick et TikTok arrêtés (exemple)" className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-line-strong bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-semibold">Multistream</p>
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">+ Ajouter</span>
        </div>
        <ul className="grid gap-2 p-3">
          {DOCK.map((d) => {
            const p = byId(d.id);
            return (
              <li key={d.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-background text-foreground">
                  <Logo p={p} size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.label}</p>
                  <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                    {d.live && <span aria-hidden="true" className="size-1.5 rounded-full bg-live motion-safe:animate-pulse" />}
                    {d.live ? "En direct" : "Arrêté"}
                  </p>
                </div>
                <span aria-hidden="true" className={`grid h-9 w-12 place-items-center rounded-lg border ${d.live ? "border-live bg-live text-on-accent" : "border-line-strong text-foreground"}`}>
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="2" fill={d.live ? "currentColor" : "none"} />
                    <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13" />
                  </svg>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <figcaption className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Exemple</figcaption>
    </figure>
  );
}

/** Une rangée de logos, sans texte : toutes les plateformes prises en charge. */
export function PlatformLogos() {
  return (
    <ul aria-label="Plateformes compatibles" className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5 text-foreground/70">
      {PLATFORMS.map((p) => (
        <li key={p.id} title={p.label} className="flex items-center gap-2">
          <Logo p={p} size={26} />
          <span className="sr-only">{p.label}</span>
        </li>
      ))}
    </ul>
  );
}
