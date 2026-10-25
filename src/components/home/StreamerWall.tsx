import Image from "next/image";
import { Heart } from "@phosphor-icons/react/dist/ssr";
import L from "../L";
import { siDji, siKick, siObsstudio, siTwitch, siWebrtc, siYoutube } from "@/lib/brand-icons";
import { GRAIN } from "@/lib/glow";
import Avatar from "./Avatar";
import CountUp from "./CountUp";
import type { HomeStreamer } from "@/lib/streamers";

// Accueil : « Ils nous font confiance. » Une rangée d'avatars ronds, décalés en hauteur, avec le pseudo Twitch en pastille ; elle défile
// lentement et s'arrête au survol. Données : comptes qui ont coché « Afficher ma chaîne » avec un
// Twitch (public_streamers). Rien ne s'affiche tant qu'il n'y a aucun streamer. Immobile sous prefers-reduced-motion.

type Card = { key: string; s: HomeStreamer; platform: "twitch" | "kick" | "youtube"; handle: string; url: string; dup?: boolean };

function Card({ c }: { c: Card }) {
  const { s } = c;
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      {...(c.dup ? { "aria-hidden": true, tabIndex: -1 } : {})}
      className="group mx-2.5 flex w-[17rem] shrink-0 items-center gap-3.5 rounded-xl border border-line bg-black/35 px-4 py-3.5 backdrop-blur-sm transition-colors duration-200 hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <Avatar src={s.avatar} name={s.handle} />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-mono text-[15px] font-medium text-foreground">
          <span className="truncate">@{c.handle.toLowerCase()}</span>
          {s.live && <span className="live-dot shrink-0" role="img" aria-label="En direct" />}
          {s.partner && <span className="shrink-0 rounded-full border border-foreground/25 px-1.5 py-px font-mono text-[9px] uppercase leading-4 tracking-[0.14em] text-foreground/80"><L fr="Partenaire" en="Partner" /></span>}
        </span>
        <span className="mt-0.5 block text-sm text-muted transition-colors group-hover:text-foreground"><L fr="Voir la chaîne" en="View channel" /> →</span>
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

// Bandeau des technologies que SYXTEE implémente pour les streamers (en haut de la section) : logos en gris, qui défilent lentement. Sans logo vectoriel ici : mot-symbole (protocoles) ou icône de l'app (Moblin).
type Brand = { key: string; name: string; href: string; node: React.ReactNode };
// Même hauteur, même graisse, même corps pour tous : seul le contenu change.
const glyph = (icon: { path: string }, size = 28) => (
  <svg viewBox="0 0 24 24" width={size} height={size} preserveAspectRatio="xMidYMid meet" fill="currentColor" aria-hidden="true" className="shrink-0"><path d={icon.path} /></svg>
);
const word = (t: string) => <span className="text-[1.65rem] font-bold leading-none tracking-tight">{t}</span>;
const BRANDS: Brand[] = [
  { key: "srtla", name: "SRTLA", href: "https://github.com/BELABOX/srtla", node: word("SRTLA") },
  { key: "srt", name: "SRT", href: "https://www.srtalliance.org", node: <Image src="/images/logo-srt.webp" alt="" width={374} height={95} className="h-7 w-auto opacity-55 transition-opacity duration-200 group-hover:opacity-100" /> },
  { key: "rtmp", name: "RTMP", href: "https://en.wikipedia.org/wiki/Real-Time_Messaging_Protocol", node: word("RTMP") },
  { key: "rist", name: "RIST", href: "https://www.rist.tv", node: (<><svg viewBox="240 0 1030 620" className="h-6 w-auto shrink-0 opacity-55 transition-opacity duration-200 group-hover:opacity-100" fill="none" stroke="currentColor" strokeWidth="120" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{[0, 291, 590].map((x, n) => <path key={x} d={`M${307 + x} 64L${607 + x} 308L${307 + x} 552`} className="rist-chevron" style={{ animationDelay: `${n * 120}ms` }} />)}</svg>{word("RIST")}</>) },
  { key: "webrtc", name: "WebRTC", href: "https://webrtc.org", node: (<>{glyph(siWebrtc)}{word("WebRTC")}</>) },
  { key: "dji", name: "DJI", href: "https://www.dji.com", node: <span className="-my-4 flex">{glyph(siDji, 72)}</span> },
  { key: "moblin", name: "Moblin", href: "https://github.com/eerimoq/moblin", node: (<><Image src="/images/moblin/icon.png" alt="" width={56} height={56} className="size-7 shrink-0 rounded-md grayscale transition-[filter] duration-300 group-hover:animate-[moblin-wiggle_0.7s_ease-in-out] group-hover:grayscale-0 motion-reduce:animate-none" />{word("Moblin")}</>) },
  { key: "obs", name: "OBS Studio", href: "https://obsproject.com", node: (<>{glyph(siObsstudio)}{word("OBS Studio")}</>) },
  { key: "twitch", name: "Twitch", href: "https://www.twitch.tv", node: (<>{glyph(siTwitch)}{word("Twitch")}</>) },
  { key: "youtube", name: "YouTube", href: "https://www.youtube.com", node: (<>{glyph(siYoutube)}{word("YouTube")}</>) },
  { key: "kick", name: "Kick", href: "https://kick.com", node: (<>{glyph(siKick)}{word("Kick")}</>) },
];

function BrandStrip() {
  return (
    <section aria-labelledby="techno-titre" className="pb-20 pt-0 sm:pb-24">
      <h2 id="techno-titre" className="px-4 text-center text-xl font-medium"><L fr="Technologies implémentées" en="Supported technologies" /></h2>
      <div className="mx-auto mt-5 max-w-5xl overflow-hidden px-4 py-5" style={{ maskImage: "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)" }}>
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
                      className="group flex h-10 items-center gap-2.5 px-8 text-foreground/55 transition-colors duration-200 hover:text-foreground focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:px-12"
                    >
                      <span className="flex items-center gap-2.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 group-hover:scale-110 group-focus-visible:-translate-y-1 group-focus-visible:scale-110 motion-reduce:transform-none">{b.node}</span>
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

const PARTNERS: { name: string; src: string; w: number; h: number; href?: string }[] = [
  { name: "THE MOUV", src: "/images/partner-the-mouv.webp", w: 640, h: 267, href: "https://www.instagram.com/themouv2.0/" },
  { name: "LAWCY MUSIC", src: "/images/partner-lawcy-music.webp", w: 640, h: 273, href: "https://www.youtube.com/@lawcy-music" },
];

/** Partenaires : logos blancs sur fond sombre. Chaque logo tient dans une boîte de taille fixe (object-contain) : aucun ne déborde ni ne dépasse les autres. */
function Partners() {
  return (
    <section aria-labelledby="partenaires-titre" className="pb-20 sm:pb-24">
      <h2 id="partenaires-titre" className="px-4 text-center text-xl font-medium"><L fr="Partenaires" en="Partners" /></h2>
      <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-12 gap-y-6 px-4">
        {PARTNERS.map((p) => {
          const logo = <Image src={p.src} alt={p.name} width={p.w} height={p.h} className="size-full object-contain opacity-70 transition-opacity duration-200 group-hover:opacity-100" />;
          const box = "group flex h-11 w-28 items-center justify-center";
          return (
            <li key={p.name}>
              {p.href ? (
                <a href={p.href} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} (nouvel onglet)`} className={`${box} focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground`}>{logo}</a>
              ) : (
                <div className={box}>{logo}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function StreamerWall({ streamers }: { streamers: HomeStreamer[] }) {
  if (streamers.length === 0) return null;
  const ranked = [...streamers].sort((a, b) => Number(!!b.live) - Number(!!a.live) || Number(b.partner) - Number(a.partner));
  // Une carte par chaîne Twitch.
  const cards: Card[] = ranked.flatMap((s) => s.channels.filter((ch) => ch.platform === "twitch").map((ch) => ({ key: `${s.handle}-${ch.platform}`, s, platform: ch.platform, handle: ch.handle, url: ch.url })));
  if (cards.length === 0) return null;
  // Deux rangées qui défilent en sens inverse : une carte sur deux dans chacune, répétées (copies masquées aux lecteurs d'écran) jusqu'à remplir la largeur.
  const fill = (list: Card[]) => {
    const out: Card[] = [];
    while (out.length < 8) out.push(...list.map((c) => ({ ...c, dup: out.length > 0 })));
    return out;
  };
  const top = cards.filter((_, i) => i % 2 === 0);
  const bottom = cards.filter((_, i) => i % 2 === 1);
  const rowTop = fill(top);
  const rowBottom = fill(bottom.length ? bottom : [...cards].reverse());
  const fade = "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)";

  return (
    <>
    <Partners />
    <BrandStrip />
    <section aria-labelledby="mur-titre" className="relative isolate overflow-hidden border-b border-line py-24 sm:py-32">
      {/* Fond violet Twitch : large, saturé en haut, qui se fond vers le bas ; quadrillage très discret qui s'estompe avec lui. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: `${GRAIN}, radial-gradient(130% 85% at 50% 0%, color-mix(in srgb, #9146ff 30%, transparent) 0%, color-mix(in srgb, #9146ff 24%, transparent) 25%, color-mix(in srgb, #9146ff 15%, transparent) 50%, color-mix(in srgb, #9146ff 7%, transparent) 72%, transparent 100%), linear-gradient(to bottom, color-mix(in srgb, #9146ff 10%, transparent), transparent 70%)` }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ backgroundImage: "linear-gradient(to right, color-mix(in srgb, var(--foreground) 4%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 4%, transparent) 1px, transparent 1px)", backgroundSize: "72px 72px", maskImage: "linear-gradient(to bottom, #000, transparent 75%)", WebkitMaskImage: "linear-gradient(to bottom, #000, transparent 75%)" }} />
      <svg viewBox="0 0 24 24" width="44" height="44" fill="currentColor" role="img" aria-label="Twitch" className="mx-auto mb-6 block" style={{ color: `#${siTwitch.hex}` }}>
        <path d={siTwitch.path} />
      </svg>
      <h2 id="mur-titre" className="h-section px-4 text-center">
        <L fr="Ils nous font confiance." en="They trust us." />
      </h2>
      <p className="mx-auto mt-4 max-w-[48ch] px-4 text-center text-base leading-relaxed text-muted"><L fr="Des streamers IRL qui diffusent avec SYXTEE." en="IRL streamers who broadcast with SYXTEE." /></p>
      <div className="mt-14 space-y-5" style={{ maskImage: fade, WebkitMaskImage: fade }}>
        <Row items={rowTop} />
        <Row items={rowBottom} reverse />
      </div>
    </section>
    </>
  );
}

/** Heures de direct déjà transmises sur SYXTEE (somme des sessions live). Rien ne s'affiche tant que le chiffre est inconnu ou nul. */
const HEARTS = [
  { left: "8%", size: 14, delay: "0s", dur: "9s" },
  { left: "18%", size: 20, delay: "3s", dur: "11s" },
  { left: "29%", size: 12, delay: "6s", dur: "8s" },
  { left: "41%", size: 18, delay: "1.5s", dur: "10s" },
  { left: "58%", size: 14, delay: "4.5s", dur: "9s" },
  { left: "69%", size: 22, delay: "0.8s", dur: "12s" },
  { left: "79%", size: 12, delay: "5.5s", dur: "8.5s" },
  { left: "90%", size: 18, delay: "2.5s", dur: "10.5s" },
];

/** Heures de direct déjà transmises sur SYXTEE (somme des sessions live). Rien ne s'affiche tant que le chiffre est inconnu ou nul.
 *  Halo rouge en fond et petits cœurs qui montent doucement (fixes sous prefers-reduced-motion). */
export function HoursStat({ hours }: { hours: number | null }) {
  if (!hours || hours < 1) return null;
  return (
    <section aria-label="Heures de direct transmises" className="relative isolate overflow-hidden border-b border-line py-24 text-center sm:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 motion-reduce:hidden">
        {HEARTS.map((h, i) => (
          <Heart key={i} weight="fill" size={h.size} className="heart-float absolute bottom-0 text-bad" style={{ left: h.left, animationDelay: h.delay, animationDuration: h.dur }} />
        ))}
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted"><L fr="Déjà" en="Already" /></p>
      <p className="mt-6 flex items-baseline justify-center gap-2">
        <span className="text-[clamp(4.5rem,12vw,8rem)] font-semibold leading-none tracking-tight tabular-nums"><CountUp to={Math.round(hours)} /></span>
        <span className="text-[clamp(1.75rem,4vw,3rem)] font-medium text-muted">h</span>
      </p>
      <p className="mt-6 flex items-center justify-center gap-2 text-lg text-muted"><L fr="De direct. C'est grâce à vous" en="Of live. It's thanks to you" /><Heart size={20} weight="fill" aria-hidden="true" className="text-bad" /></p>
    </section>
  );
}
