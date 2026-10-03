import { DiscordLogo } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { rich } from "@/lib/rich";
import { site } from "@/lib/site";
import type { HomeStreamer } from "@/lib/streamers";
import HeroCrowd, { hasCrowd } from "../home/HeroCrowd";
import CloudBackdrop from "../home/CloudBackdrop";
import StudioDemo from "../studio/StudioDemo";
import { CREATE_RELAY_HREF, Container } from "../ui";
import RotatingHighlight from "../home/RotatingHighlight";

// Accueil : hero clair (rouge, blanc, noir) quel que soit le thème du site, comme les sites de streaming : fond rouge
// qui s'éclaircit vers le bas, portraits de streamers en trame de points, boutons noirs, et un panneau sombre
// (la démo de SYXTEE STUDIO) à la place de la capture d'écran. Le reste de la page suit le thème choisi.

const corner = "pointer-events-none absolute h-9 w-9 border-accent sm:h-12 sm:w-12";
const btn =
  "inline-flex h-12 items-center justify-center gap-3 whitespace-nowrap rounded-xl px-7 text-base font-medium transition-[background-color,transform] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export default function Hero({ streamers = [] }: { streamers?: HomeStreamer[] }) {
  const crowd = hasCrowd(streamers);
  return (
    <section data-theme="light" className="relative -mt-[4.75rem] overflow-hidden border-b border-line bg-background text-foreground">
      {/* Nuages et grain, sous la barre de menu (la section remonte derrière elle). */}
      <CloudBackdrop />
      <Container className="relative pb-16 pt-[8.5rem] sm:pb-24 sm:pt-[10rem]">
        <div className="relative mx-auto max-w-4xl px-6 py-12 text-center sm:px-14 sm:py-16">
          <span aria-hidden="true" className={`${corner} left-0 top-0 border-l-[5px] border-t-[5px]`} />
          <span aria-hidden="true" className={`${corner} right-0 top-0 border-r-[5px] border-t-[5px]`} />
          <span aria-hidden="true" className={`${corner} bottom-0 left-0 border-b-[5px] border-l-[5px]`} />
          <span aria-hidden="true" className={`${corner} bottom-0 right-0 border-b-[5px] border-r-[5px]`} />

          <Link
            href="/docs/rist"
            className="rise group mx-auto mb-7 inline-flex max-w-full items-center gap-3 rounded-3xl border border-foreground/20 bg-background/60 py-1.5 pl-1.5 pr-4 text-left text-sm leading-snug sm:rounded-full backdrop-blur-sm transition-colors hover:bg-background/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            style={{ "--i": 0 } as React.CSSProperties}
          >
            <span className="rounded-full bg-foreground px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-background">Nouveau</span>
            <span className="min-w-0">
              <strong className="font-semibold">RIST</strong> : SYXTEE, premier site à l&apos;offrir aux particuliers
            </span>
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">↗</span>
          </Link>

          <h1 className="rise h-hero" style={{ "--i": 1 } as React.CSSProperties}>
            Le live IRL pro.
            <br />
            <RotatingHighlight />
          </h1>

          <p className="rise mx-auto mt-6 max-w-xl text-base leading-relaxed text-foreground/75 sm:text-lg" style={{ "--i": 2 } as React.CSSProperties}>
            {rich("Un **relais SRTLA, RTMP ou RIST** pour streamer en IRL : **bonding** 4G, 5G, Wi-Fi et Starlink.")}
          </p>

          <div className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ "--i": 3 } as React.CSSProperties}>
            <Link href={CREATE_RELAY_HREF} className={`${btn} bg-foreground text-background hover:bg-foreground/85`}>
              Commencer
              <span aria-hidden="true">↗</span>
            </Link>
            <Link
              href={site.discord}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btn} border border-foreground/20 bg-background/60 text-foreground backdrop-blur-sm hover:bg-background/90`}
            >
              <DiscordLogo size={22} weight="fill" aria-hidden="true" />
              Rejoindre la communauté Discord
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>

        {/* Les portraits montent derrière la fenêtre, qui les recouvre par le bas. La fenêtre est entière, sans fondu. */}
        <div className={crowd ? "mt-6" : "mt-10"}>
          <HeroCrowd streamers={streamers} />
          <div className="relative z-10 mx-auto max-w-5xl">
            <StudioDemo />
          </div>
        </div>
      </Container>
    </section>
  );
}
