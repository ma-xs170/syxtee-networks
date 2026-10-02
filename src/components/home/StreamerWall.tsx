import Image from "next/image";
import type { HomeStreamer } from "@/lib/streamers";
import { Container, CreateRelayLink } from "../ui";

// Accueil : « Rejoins les streamers qui diffusent avec SYXTEE ». Six cartes en vedette (chaînes en live d'abord, puis
// partenaires) et, dessous, le mur de tous les avatars. Données : comptes qui ont coché « Afficher ma chaîne » avec un
// Twitch vérifié (public_streamers). Rien ne s'affiche tant qu'il n'y a aucun streamer.

const FEATURED = 6;
const viewers = new Intl.NumberFormat("fr-FR");
const corner = "pointer-events-none absolute h-9 w-9 border-accent";

function Avatar({ s, className }: { s: HomeStreamer; className: string }) {
  return s.avatar ? (
    <Image src={s.avatar} alt="" width={160} height={160} className={`${className} object-cover`} />
  ) : (
    <span className={`${className} flex items-center justify-center bg-surface-2 text-lg font-semibold uppercase text-muted`}>{s.handle.charAt(0)}</span>
  );
}

export default function StreamerWall({ streamers }: { streamers: HomeStreamer[] }) {
  if (streamers.length === 0) return null;
  const ranked = [...streamers].sort((a, b) => Number(!!b.live) - Number(!!a.live) || Number(b.partner) - Number(a.partner));
  const featured = ranked.slice(0, FEATURED);
  const wall = ranked.slice(FEATURED);

  return (
    <section aria-labelledby="mur-titre" className="border-b border-line py-24">
      <Container>
        <h2 id="mur-titre" className="h-section max-w-3xl">
          Rejoins les streamers qui diffusent avec SYXTEE
        </h2>
        <div className="mt-8">
          <CreateRelayLink />
        </div>

        <div className="relative mt-12 px-3 py-3">
          <span aria-hidden="true" className={`${corner} left-0 top-0 border-l-[5px] border-t-[5px]`} />
          <span aria-hidden="true" className={`${corner} right-0 top-0 border-r-[5px] border-t-[5px]`} />
          {wall.length > 0 && (
            <>
              <span aria-hidden="true" className={`${corner} bottom-0 left-0 border-b-[5px] border-l-[5px]`} />
              <span aria-hidden="true" className={`${corner} bottom-0 right-0 border-b-[5px] border-r-[5px]`} />
            </>
          )}

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {featured.map((s) => (
              <li key={s.handle}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-full flex-col items-center gap-3 rounded-xl border border-line bg-surface p-4 text-center transition-colors hover:border-line-strong hover:bg-surface-2"
                >
                  <Avatar s={s} className="aspect-square w-full max-w-36 rounded-lg" />
                  <span className="min-w-0 max-w-full">
                    <span className="block truncate text-base font-medium">{s.handle}</span>
                    <span className="mt-1 block text-sm text-muted">{s.firstName ? `${s.firstName}, streamer Twitch` : "Streamer Twitch"}</span>
                    {s.live ? (
                      <span className="mt-1.5 inline-flex items-center gap-1.5 text-sm">
                        <span className="live-dot" aria-hidden="true" />
                        <span className="tabular-nums">{viewers.format(s.live.viewers)} viewers</span>
                      </span>
                    ) : (
                      s.partner && <span className="mt-1.5 block text-sm text-accent">Partenaire</span>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>

          {wall.length > 0 && (
            <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2">
              {wall.map((s) => (
                <li key={s.handle}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`Chaîne Twitch de ${s.handle}`} title={s.handle} className="block overflow-hidden rounded-md transition-transform hover:scale-110 focus-visible:scale-110 motion-reduce:transition-none">
                    <Avatar s={s} className="aspect-square w-full" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </section>
  );
}
