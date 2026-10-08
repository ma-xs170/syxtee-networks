import Link from "next/link";
import { siFacebook, siKick, siTiktok, siTwitch, siX, siYoutube } from "simple-icons";
import Highlight from "../ui/Highlight";
import { Reveal } from "../device/Motion";
import { Container } from "../ui";

// Accueil : le multistream. Un direct, toutes les plateformes : un logo, une clé de stream, un clic. Tourne dans OBS sur l'ordinateur
// (plugin SYXTEE Link), commandé depuis le contrôle à distance. Logos en encre (jamais de couleur de marque : une seule couleur d'accent).

type Platform = { id: string; label: string; icon?: { path: string }; letter?: string; preset: string };

const PLATFORMS: Platform[] = [
  { id: "twitch", label: "Twitch", icon: siTwitch, preset: "Serveur prêt" },
  { id: "youtube", label: "YouTube", icon: siYoutube, preset: "Serveur prêt" },
  { id: "facebook", label: "Facebook", icon: siFacebook, preset: "Serveur prêt" },
  { id: "kick", label: "Kick", icon: siKick, preset: "Ta clé" },
  { id: "tiktok", label: "TikTok", icon: siTiktok, preset: "Ta clé" },
  { id: "x", label: "X", icon: siX, preset: "Ta clé" },
  { id: "trovo", label: "Trovo", letter: "T", preset: "Serveur prêt" },
  { id: "autre", label: "Autre service", letter: "+", preset: "Adresse RTMP" },
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

export default function Multistream() {
  const byId = (id: string) => PLATFORMS.find((p) => p.id === id)!;
  return (
    <section id="multistream" aria-labelledby="ms-title" className="scroll-mt-20 border-b border-line">
      <Container>
        <div className="grid grid-cols-1 items-center gap-12 border-t border-line py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-foreground/70">Multistream</p>
            <h2 id="ms-title" className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
              Un direct, <Highlight>toutes les plateformes.</Highlight>
            </h2>
            <p className="mt-5 max-w-[48ch] text-base leading-relaxed text-muted sm:text-lg">
              Colle ta clé de stream une fois, choisis le logo de la plateforme : son serveur est déjà rempli. Ensuite, un seul toucher lance ou arrête chaque diffusion, depuis ton téléphone.
            </p>
            <ul className="mt-6 grid max-w-[48ch] gap-2 text-sm text-muted">
              <li className="flex gap-2.5"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-foreground/60" />Une sortie par plateforme, lancée ou arrêtée séparément.</li>
              <li className="flex gap-2.5"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-foreground/60" />Tout part de ton ordinateur, avec l&apos;encodeur matériel d&apos;OBS : pas de charge en plus.</li>
              <li className="flex gap-2.5"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-foreground/60" />Tes clés restent sur ton ordinateur, jamais sur le site.</li>
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/controle-a-distance" className="btn btn-primary">
                Voir le contrôle à distance
              </Link>
              <Link href="/acces" className="btn btn-secondary">
                Demander l&apos;accès
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
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
          </Reveal>
        </div>

        <ul aria-label="Plateformes compatibles" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line pb-0 sm:grid-cols-4">
          {PLATFORMS.map((p) => (
            <li key={p.id} className="flex flex-col items-center gap-3 bg-background px-4 py-8 text-foreground">
              <Logo p={p} size={32} />
              <span className="text-sm font-medium">{p.label}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{p.preset}</span>
            </li>
          ))}
        </ul>
        <div className="pb-20 lg:pb-28" />
      </Container>
    </section>
  );
}
