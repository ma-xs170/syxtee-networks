import Image from "next/image";
import L from "../L";
import { siDji, siKick, siObsstudio, siTwitch, siWebrtc, siYoutube } from "@/lib/brand-icons";
import { avatarTint, FALLBACK_TINT } from "@/lib/avatar-color";
import type { HomeStreamer } from "@/lib/streamers";

// Accueil : « Ils nous font confiance. » Une rangée d'avatars ronds, décalés en hauteur, avec le pseudo Twitch en pastille ; elle défile
// lentement et s'arrête au survol. Données : comptes qui ont coché « Afficher ma chaîne » avec un
// Twitch (public_streamers). Rien ne s'affiche tant qu'il n'y a aucun streamer. Immobile sous prefers-reduced-motion.

type Card = { key: string; s: HomeStreamer; platform: "twitch" | "kick" | "youtube"; handle: string; url: string; tint?: string; dup?: boolean };

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
      <span className="relative -mt-4 flex max-w-full items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-white" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${c.tint ?? FALLBACK_TINT} 78%, #000), ${c.tint ?? FALLBACK_TINT})` }}>
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
type Brand = { key: string; name: string; href: string; node: React.ReactNode };
// Même hauteur, même graisse, même corps pour tous : seul le contenu change.
const glyph = (icon: { path: string }, size = 28) => (
  <svg viewBox="0 0 24 24" width={size} height={size} preserveAspectRatio="xMidYMid meet" fill="currentColor" aria-hidden="true" className="shrink-0"><path d={icon.path} /></svg>
);
const word = (t: string) => <span className="text-[1.65rem] font-bold leading-none tracking-tight">{t}</span>;
const BRANDS: Brand[] = [
  { key: "srtla", name: "SRTLA", href: "https://github.com/BELABOX/srtla", node: word("SRTLA") },
  { key: "srt", name: "SRT", href: "https://www.srtalliance.org", node: word("SRT") },
  { key: "rtmp", name: "RTMP", href: "https://en.wikipedia.org/wiki/Real-Time_Messaging_Protocol", node: word("RTMP") },
  { key: "rist", name: "RIST", href: "https://www.rist.tv", node: word("RIST") },
  { key: "webrtc", name: "WebRTC", href: "https://webrtc.org", node: (<>{glyph(siWebrtc)}{word("WebRTC")}</>) },
  { key: "dji", name: "DJI", href: "https://www.dji.com", node: <span className="-my-4 flex">{glyph(siDji, 72)}</span> },
  { key: "moblin", name: "Moblin", href: "https://github.com/eerimoq/moblin", node: (<><Image src="/images/moblin/icon.png" alt="" width={56} height={56} className="size-7 shrink-0 rounded-md grayscale" />{word("Moblin")}</>) },
  { key: "obs", name: "OBS Studio", href: "https://obsproject.com", node: (<>{glyph(siObsstudio)}{word("OBS Studio")}</>) },
  { key: "twitch", name: "Twitch", href: "https://www.twitch.tv", node: (<>{glyph(siTwitch)}{word("Twitch")}</>) },
  { key: "youtube", name: "YouTube", href: "https://www.youtube.com", node: (<>{glyph(siYoutube)}{word("YouTube")}</>) },
  { key: "kick", name: "Kick", href: "https://kick.com", node: (<>{glyph(siKick)}{word("Kick")}</>) },
];

function BrandStrip() {
  return (
    <section aria-labelledby="techno-titre" className="pb-20 pt-0 sm:pb-24">
      <h2 id="techno-titre" className="px-4 text-center text-xl font-medium"><L fr="Technologies implémentées" en="Supported technologies" /></h2>
      <div className="mx-auto mt-10 max-w-5xl overflow-hidden px-4" style={{ maskImage: "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)" }}>
        <div className="marquee-wrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="marquee marquee-l">
            {[0, 1].map((copy) => (
              <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1 ? true : undefined}>
                {[...BRANDS, ...BRANDS].map((b, i) => (
                  <li key={`${b.key}-${i}`} className="shrink-0">
                    <a
                      href={b.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${b.name} (nouvel onglet)`}
                      {...(copy === 1 || i >= BRANDS.length ? { tabIndex: -1 } : {})}
                      className="flex h-10 items-center gap-2.5 px-8 text-foreground/55 transition-colors duration-200 hover:text-foreground focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:px-12"
                    >
                      {b.node}
                    </a>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function StreamerWall({ streamers }: { streamers: HomeStreamer[] }) {
  if (streamers.length === 0) return null;
  const ranked = [...streamers].sort((a, b) => Number(!!b.live) - Number(!!a.live) || Number(b.partner) - Number(a.partner));
  // Une carte par chaîne Twitch.
  const cards: Card[] = ranked.flatMap((s) => s.channels.filter((ch) => ch.platform === "twitch").map((ch) => ({ key: `${s.handle}-${ch.platform}`, s, platform: ch.platform, handle: ch.handle, url: ch.url })));
  if (cards.length === 0) return null;
  // Pastille de pseudo teintée selon la couleur dominante de l'avatar.
  const tints = await Promise.all(cards.map((c) => avatarTint(c.s.avatar)));
  cards.forEach((c, i) => { c.tint = tints[i]; });
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
        <L fr="Ils nous font confiance." en="They trust us." />
      </h2>
      <p className="mx-auto mt-4 max-w-[48ch] px-4 text-center text-base leading-relaxed text-muted"><L fr="Des streamers IRL qui diffusent avec SYXTEE." en="IRL streamers who broadcast with SYXTEE." /></p>
      <div className="mt-14" style={{ maskImage: fade, WebkitMaskImage: fade }}>
        <Row items={row} />
      </div>
    </section>
    </>
  );
}
