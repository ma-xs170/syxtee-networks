import Image from "next/image";
import type { HomeStreamer } from "@/lib/streamers";
import { Container } from "../ui";
import Highlight from "../ui/Highlight";

// « Ils nous font confiance » : comptes qui ont coché « Afficher ma chaîne » avec un Twitch vérifié.
// Les chaînes en live passent en premier (rangée fixe, badge EN LIVE + viewers), les autres défilent dessous.

const MIN_PER_ROW = 6;
const viewersFmt = new Intl.NumberFormat("fr-FR");

function StreamerAvatar({ s }: { s: HomeStreamer }) {
  return s.avatar ? (
    <Image src={s.avatar} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line font-mono text-lg uppercase">{s.handle.charAt(0)}</span>
  );
}

function StreamerCard({ streamer, hidden = false }: { streamer: HomeStreamer; hidden?: boolean }) {
  const live = streamer.live;
  return (
    <a
      href={streamer.url}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
      className={`flex w-[260px] items-center gap-4 rounded-2xl border bg-black p-4 transition-colors hover:bg-white/5 ${live ? "border-live/50" : "border-line"}`}
    >
      <span className="relative">
        <StreamerAvatar s={streamer} />
        {live && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-black bg-live" aria-hidden="true" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-mono text-sm text-white">
          @{streamer.handle}
          {streamer.firstName && <span className="font-sans text-muted"> · {streamer.firstName}</span>}
        </span>
        {live ? (
          <span className="mt-1 flex items-center gap-2 text-sm">
            <span className="rounded bg-live px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-white">EN LIVE</span>
            <span className="tabular-nums text-muted">{viewersFmt.format(live.viewers)} viewers</span>
          </span>
        ) : (
          <span className="mt-1 block text-sm text-muted">Voir la chaîne →</span>
        )}
      </span>
    </a>
  );
}

function Row({ items, total, reverse, duration }: { items: HomeStreamer[]; total: number; reverse?: boolean; duration: string }) {
  // Deux copies identiques : l'animation se décale de -50 % pour boucler sans saut.
  const loop = [...items, ...items];
  return (
    <div className="fade-x overflow-hidden">
      <div className={`marquee marquee-hover-pause ${reverse ? "marquee-reverse" : ""}`} style={{ animationDuration: duration }}>
        {loop.map((s, i) => (
          <div key={i} className="pr-4">
            <StreamerCard streamer={s} hidden={reverse || i >= total} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Streamers({ streamers }: { streamers: HomeStreamer[] }) {
  if (streamers.length === 0) return null;
  const live = streamers.filter((s) => s.live);
  const rest = streamers.filter((s) => !s.live);

  let items = rest;
  while (items.length > 0 && items.length < MIN_PER_ROW) items = [...items, ...rest];

  return (
    <section id="streamers" className="overflow-hidden border-b border-line py-24">
      <Container>
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-5xl">
          Ils nous font <Highlight>confiance.</Highlight>
        </h2>
      </Container>

      {live.length > 0 && (
        <Container className="mt-14">
          <p className="flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-muted">
            <span className="live-dot" />
            En live maintenant
          </p>
          <ul className="mt-6 flex flex-wrap justify-center gap-4">
            {live.map((s) => (
              <li key={s.url}>
                <StreamerCard streamer={s} />
              </li>
            ))}
          </ul>
        </Container>
      )}

      {rest.length > 0 && (
        <div className="mt-14 space-y-4">
          <Row items={items} total={rest.length} duration="45s" />
          <Row items={items} total={rest.length} reverse duration="55s" />
        </div>
      )}
    </section>
  );
}
