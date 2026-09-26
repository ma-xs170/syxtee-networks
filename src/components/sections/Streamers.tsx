import Image from "next/image";
import { streamers, type Streamer } from "@/lib/site";
import { Container } from "../ui";

const MIN_PER_ROW = 6;

function StreamerCard({ streamer, hidden }: { streamer: Streamer; hidden: boolean }) {
  return (
    <div className="pr-4" aria-hidden={hidden || undefined}>
      <a
        href={streamer.url}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={hidden ? -1 : undefined}
        className="flex w-[260px] items-center gap-4 rounded-2xl border border-line bg-black p-4 transition-colors hover:bg-white/5"
      >
        {streamer.avatar ? (
          <Image
            src={streamer.avatar}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line font-mono text-lg uppercase">
            {streamer.handle.charAt(0)}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate font-mono text-sm text-white">@{streamer.handle}</span>
          <span className="mt-1 block text-sm text-muted">Voir la chaîne →</span>
        </span>
      </a>
    </div>
  );
}

function Row({ items, reverse, duration }: { items: Streamer[]; reverse?: boolean; duration: string }) {
  // Deux copies identiques : l'animation se décale de -50 % pour boucler sans saut.
  const loop = [...items, ...items];
  return (
    <div className="fade-x overflow-hidden">
      <div
        className={`marquee marquee-hover-pause ${reverse ? "marquee-reverse" : ""}`}
        style={{ animationDuration: duration }}
      >
        {loop.map((streamer, i) => (
          <StreamerCard key={i} streamer={streamer} hidden={reverse || i >= streamers.length} />
        ))}
      </div>
    </div>
  );
}

export default function Streamers() {
  if (streamers.length === 0) return null;

  let items = streamers;
  while (items.length < MIN_PER_ROW) items = [...items, ...streamers];

  return (
    <section id="streamers" className="overflow-hidden border-b border-line py-24">
      <Container>
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-5xl">
          Ils streament avec SYXTEE.
        </h2>
      </Container>
      <div className="mt-14 space-y-4">
        <Row items={items} duration="45s" />
        <Row items={items} reverse duration="55s" />
      </div>
    </section>
  );
}
