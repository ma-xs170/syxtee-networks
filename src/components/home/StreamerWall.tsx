import Image from "next/image";
import type { HomeStreamer } from "@/lib/streamers";

// Accueil : « Ils streament avec SYXTEE. » Deux rangées de cartes (avatar, @pseudo, lien vers la chaîne) qui défilent
// lentement en sens inverse, et s'arrêtent au survol. Données : comptes qui ont coché « Afficher ma chaîne » avec un
// Twitch vérifié (public_streamers). Rien ne s'affiche tant qu'il n'y a aucun streamer. Immobile sous prefers-reduced-motion.

function Avatar({ s }: { s: HomeStreamer }) {
  return s.avatar ? (
    <Image src={s.avatar} alt="" width={104} height={104} className="h-[3.25rem] w-[3.25rem] shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg font-semibold uppercase text-muted">{s.handle.charAt(0)}</span>
  );
}

function Card({ s }: { s: HomeStreamer }) {
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mr-3 flex w-64 shrink-0 items-center gap-4 rounded-xl border border-line bg-surface px-5 py-4 transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:w-72"
    >
      <Avatar s={s} />
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-mono text-base">
          <span className="truncate">@{s.handle}</span>
          {s.live && <span className="live-dot shrink-0" role="img" aria-label="En direct" />}
        </span>
        <span className="mt-0.5 block text-sm text-muted">
          Voir la chaîne <span aria-hidden="true">→</span>
        </span>
      </span>
    </a>
  );
}

/** Rangée en boucle : la liste est répétée jusqu'à remplir l'écran, puis doublée (la moitié sort pendant que l'autre entre). */
function Row({ items, reverse }: { items: HomeStreamer[]; reverse?: boolean }) {
  const base = Array.from({ length: Math.max(1, Math.ceil(8 / items.length)) }, () => items).flat();
  return (
    <div className="marquee-wrap overflow-x-auto motion-reduce:overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className={`marquee ${reverse ? "marquee-r" : "marquee-l"}`}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0" aria-hidden={copy === 1 ? true : undefined}>
            {base.map((s, i) => (
              <Card key={`${s.handle}-${i}`} s={s} />
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
  const top = ranked.filter((_, i) => i % 2 === 0);
  const bottom = ranked.filter((_, i) => i % 2 === 1);

  return (
    <section aria-labelledby="mur-titre" className="border-b border-line py-24 sm:py-32">
      <h2 id="mur-titre" className="h-section px-4 text-center">
        Ils streament avec SYXTEE.
      </h2>
      <div className="mt-14 space-y-3">
        <Row items={top} />
        <Row items={bottom.length ? bottom : top} reverse />
      </div>
    </section>
  );
}
