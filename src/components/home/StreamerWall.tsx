import Image from "next/image";
import { siDji, siKick, siObsstudio, siTwitch, siWebrtc, siYoutube } from "@/lib/brand-icons";
import type { HomeStreamer } from "@/lib/streamers";

// Accueil : « Ils nous font confiance. » Une rangée d'avatars ronds, décalés en hauteur, avec le pseudo Twitch en pastille ; elle défile
// lentement et s'arrête au survol. Données : comptes qui ont coché « Afficher ma chaîne » avec un
// Twitch (public_streamers). Rien ne s'affiche tant qu'il n'y a aucun streamer. Immobile sous prefers-reduced-motion.

type Card = { key: string; s: HomeStreamer; platform: "twitch" | "kick" | "youtube"; handle: string; url: string; dup?: boolean };

function Card({ c, i }: { c: Card; i: number }) {
  const { s } = c;
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      {...(c.dup ? { "aria-hidden": true, tabIndex: -1 } : {})}
      className={`group mx-5 flex w-36 shrink-0 flex-col items-center transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground ${i % 2 ? "mt-16" : ""}`}
    >
      {s.avatar ? (
        <Image src={s.avatar} alt="" width={224} height={224} className="size-28 rounded-full border border-line object-cover sm:size-32" />
      ) : (
        <span className="flex size-28 items-center justify-center rounded-full border border-line bg-surface-2 text-3xl font-semibold uppercase text-muted sm:size-32">{s.handle.charAt(0)}</span>
      )}
      <span className="relative -mt-4 flex max-w-full items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #6d3bd2, #9146ff)" }}>
        <span className="truncate">{c.handle}</span>
        {s.live && <span className="live-dot shrink-0" role="img" aria-label="En direct" />}
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
              <Card key={`${c.key}-${i}`} c={c} i={i} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Bandeau des technologies que SYXTEE implémente pour les streamers (en haut de la section) : logos en gris, qui défilent lentement. Sans logo vectoriel ici : mot-symbole (protocoles) ou icône de l'app (Moblin).
type Brand = { key: string; node: React.ReactNode };
// Même hauteur, même graisse, même corps pour tous : seul le contenu change.
const glyph = (icon: { path: string }, size = 28) => (
  <svg viewBox="0 0 24 24" width={size} height={size} preserveAspectRatio="xMidYMid meet" fill="currentColor" aria-hidden="true" className="shrink-0"><path d={icon.path} /></svg>
);
const word = (t: string) => <span className="text-[1.65rem] font-bold leading-none tracking-tight">{t}</span>;
const BRANDS: Brand[] = [
  { key: "srtla", node: word("SRTLA") },
  { key: "srt", node: word("SRT") },
  { key: "rtmp", node: word("RTMP") },
  { key: "rist", node: word("RIST") },
  { key: "webrtc", node: (<>{glyph(siWebrtc)}{word("WebRTC")}</>) },
  { key: "dji", node: <span className="-my-4 flex">{glyph(siDji, 72)}</span> },
  { key: "moblin", node: (<><Image src="/images/moblin/icon.png" alt="" width={56} height={56} className="size-7 shrink-0 rounded-md grayscale" />{word("Moblin")}</>) },
  { key: "obs", node: (<>{glyph(siObsstudio)}{word("OBS Studio")}</>) },
  { key: "twitch", node: (<>{glyph(siTwitch)}{word("Twitch")}</>) },
  { key: "youtube", node: (<>{glyph(siYoutube)}{word("YouTube")}</>) },
  { key: "kick", node: (<>{glyph(siKick)}{word("Kick")}</>) },
];

function BrandStrip() {
  return (
    <section aria-labelledby="techno-titre" className="py-20 sm:py-28">
      <h2 id="techno-titre" className="px-4 text-center text-xl font-medium">Technologies implémentées</h2>
      <div className="mx-auto mt-14 max-w-5xl overflow-hidden px-4">
        <div className="marquee-wrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="marquee marquee-l">
            {[0, 1].map((copy) => (
              <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1 ? true : undefined}>
                {[...BRANDS, ...BRANDS].map((b, i) => (
                  <li key={`${b.key}-${i}`} className="flex h-10 shrink-0 items-center gap-2.5 px-8 text-foreground/55 sm:px-12">{b.node}</li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function StreamerWall({ streamers }: { streamers: HomeStreamer[] }) {
  if (streamers.length === 0) return null;
  const ranked = [...streamers].sort((a, b) => Number(!!b.live) - Number(!!a.live) || Number(b.partner) - Number(a.partner));
  // Une carte par chaîne Twitch.
  const cards: Card[] = ranked.flatMap((s) => s.channels.filter((ch) => ch.platform === "twitch").map((ch) => ({ key: `${s.handle}-${ch.platform}`, s, platform: ch.platform, handle: ch.handle, url: ch.url })));
  if (cards.length === 0) return null;
  // La liste est répétée (copies masquées aux lecteurs d'écran) jusqu'à remplir la largeur ; un nombre pair garde l'alternance haut/bas.
  const row: Card[] = [];
  while (row.length < 10 || row.length % 2) row.push(...cards.map((c) => ({ ...c, dup: row.length > 0 })));
  const fade = "linear-gradient(to right, transparent, #000 22%, #000 78%, transparent)";

  return (
    <>
    <BrandStrip />
    <section aria-labelledby="mur-titre" className="relative isolate overflow-hidden border-b border-line py-24 sm:py-32">
      {/* Dégradé violet Twitch en haut de section. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: "radial-gradient(70% 60% at 50% 0%, color-mix(in srgb, #9146ff 38%, transparent), transparent 75%)" }} />
      <svg viewBox="0 0 24 24" width="44" height="44" fill="currentColor" role="img" aria-label="Twitch" className="mx-auto mb-6 block" style={{ color: `#${siTwitch.hex}` }}>
        <path d={siTwitch.path} />
      </svg>
      <h2 id="mur-titre" className="h-section px-4 text-center">
        Ils nous font confiance.
      </h2>
      <p className="mx-auto mt-4 max-w-[48ch] px-4 text-center text-base leading-relaxed text-muted">Des streamers IRL qui diffusent avec SYXTEE.</p>
      <div className="mt-14" style={{ maskImage: fade, WebkitMaskImage: fade }}>
        <Row items={row} />
      </div>
    </section>
    </>
  );
}
