import Image from "next/image";
import { siKick, siTwitch, siYoutube } from "@/lib/brand-icons";
import type { HomeStreamer } from "@/lib/streamers";

// Accueil : « Ils nous font confiance. » Deux rangées de cartes, une par chaîne (Twitch, Kick, YouTube : logo, avatar, @pseudo, lien) qui défilent
// lentement en sens inverse, et s'arrêtent au survol. Données : comptes qui ont coché « Afficher ma chaîne » avec un
// Twitch ou YouTube (public_streamers). Rien ne s'affiche tant qu'il n'y a aucun streamer. Immobile sous prefers-reduced-motion.

function Avatar({ s }: { s: HomeStreamer }) {
  return s.avatar ? (
    <Image src={s.avatar} alt="" width={104} height={104} className="h-[3.25rem] w-[3.25rem] shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg font-semibold uppercase text-muted">{s.handle.charAt(0)}</span>
  );
}

type Card = { key: string; s: HomeStreamer; platform: "twitch" | "kick" | "youtube"; handle: string; url: string; dup?: boolean };
const ICON = { twitch: siTwitch, kick: siKick, youtube: siYoutube };

function Card({ c }: { c: Card }) {
  const { s } = c;
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      {...(c.dup ? { "aria-hidden": true, tabIndex: -1 } : {})}
      className="mr-3 flex w-64 shrink-0 items-center gap-4 rounded-xl border border-line bg-surface px-5 py-4 transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:w-72"
    >
      <Avatar s={s} />
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-mono text-base">
          <svg viewBox="0 0 24 24" width="14" height="14" fill={`#${ICON[c.platform].hex}`} aria-label={c.platform} role="img" className="shrink-0">
            <path d={ICON[c.platform].path} />
          </svg>
          <span className="truncate">@{c.handle}</span>
          {c.platform === "twitch" && s.live && <span className="live-dot shrink-0" role="img" aria-label="En direct" />}
        </span>
        <span className="mt-0.5 block text-sm text-muted">
          Voir la chaîne <span aria-hidden="true">→</span>
        </span>
      </span>
    </a>
  );
}

/** Rangée en boucle : la liste est doublée (la moitié sort pendant que l'autre entre). */
function Row({ items, reverse }: { items: Card[]; reverse?: boolean }) {
  const base = items;
  return (
    <div className="marquee-wrap overflow-x-auto motion-reduce:overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className={`marquee ${reverse ? "marquee-r" : "marquee-l"}`}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0" aria-hidden={copy === 1 ? true : undefined}>
            {base.map((c, i) => (
              <Card key={`${c.key}-${i}`} c={c} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StreamerWall({ streamers }: { streamers: HomeStreamer[] }) {
  if (streamers.length === 0) return null;
  const ranked = [...streamers].sort((a, b) => Number(!!b.live) - Number(!!a.live) || Number(b.partner) - Number(a.partner));
  // Une carte par chaîne vérifiée de chaque streamer.
  const cards: Card[] = ranked.flatMap((s) => s.channels.filter((ch) => ch.platform !== "kick").map((ch) => ({ key: `${s.handle}-${ch.platform}`, s, platform: ch.platform, handle: ch.handle, url: ch.url })));
  if (cards.length === 0) return null;
  // Toujours deux rangées en défilement, la première vers la gauche, la seconde vers la droite. La liste est répétée (copies masquées
  // aux lecteurs d'écran) jusqu'à remplir la largeur. Peu de chaînes : la seconde rangée reprend les mêmes, décalées d'un cran.
  const pad = (list: Card[], allDup = false) => {
    const out: Card[] = [];
    while (list.length && out.length < 8) out.push(...list.map((c) => ({ ...c, dup: allDup || out.length > 0 })));
    return out;
  };
  const many = cards.length >= 8;
  const top = pad(many ? cards.filter((_, i) => i % 2 === 0) : cards);
  const bottom = many ? pad(cards.filter((_, i) => i % 2 === 1)) : pad([...cards.slice(1), ...cards.slice(0, 1)], true);

  return (
    <section aria-labelledby="mur-titre" className="relative isolate overflow-hidden py-24 sm:py-32">
      {/* Dégradé violet Twitch en haut de section. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ maskImage: "linear-gradient(to bottom, transparent, #000 28%, #000 72%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 28%, #000 72%, transparent)", background: "radial-gradient(70% 60% at 50% 0%, color-mix(in srgb, #9146ff 38%, transparent), transparent 75%)" }} />
      <svg viewBox="0 0 24 24" width="44" height="44" fill="currentColor" role="img" aria-label="Twitch" className="mx-auto mb-6 block" style={{ color: `#${siTwitch.hex}` }}>
        <path d={siTwitch.path} />
      </svg>
      <h2 id="mur-titre" className="h-section px-4 text-center">
        Ils nous font confiance.
      </h2>
      <div className="mt-14 space-y-3">
        <Row items={top} />
        <Row items={bottom} reverse />
      </div>
    </section>
  );
}
