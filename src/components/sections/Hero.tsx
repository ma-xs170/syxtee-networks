import Image from "next/image";
import Link from "next/link";
import { rich } from "@/lib/rich";
import { site } from "@/lib/site";
import type { HomeStreamer } from "@/lib/streamers";
import CloudBackdrop from "../home/CloudBackdrop";
import DeviceFrame from "../device/DeviceFrame";
import { SHOTS } from "../device/shots";
import { Container } from "../ui";
import RotatingHighlight from "../home/RotatingHighlight";

// Accueil : hero clair (rouge, blanc, noir) quel que soit le thème du site, comme les sites de streaming : fond rouge
// qui s'éclaircit vers le bas, boutons noirs, puis une rangée d'avatars de streamers. Le reste de la page suit le thème choisi.

const corner = "pointer-events-none absolute h-9 w-9 border-accent sm:h-12 sm:w-12";
const btn =
  "inline-flex h-12 items-center justify-center gap-3 whitespace-nowrap rounded-xl px-7 text-base font-medium transition-[background-color,transform] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export default function Hero({ streamers = [] }: { streamers?: HomeStreamer[] }) {
  const faces = streamers.filter((s) => s.avatar).slice(0, 4);
  return (
    <section data-theme="dark" className="relative -mt-[4.0625rem] overflow-hidden border-b border-line bg-background text-foreground">
      {/* Nuages et grain, sous la barre de menu (la section remonte derrière elle). */}
      <CloudBackdrop />
      <Container className="relative pb-16 pt-[8.5rem] sm:pb-24 sm:pt-[10rem]">
        <div className="relative mx-auto max-w-4xl px-6 py-12 text-center sm:px-14 sm:py-16">
          <span aria-hidden="true" className={`${corner} left-0 top-0 border-l-[5px] border-t-[5px]`} />
          <span aria-hidden="true" className={`${corner} right-0 top-0 border-r-[5px] border-t-[5px]`} />
          <span aria-hidden="true" className={`${corner} bottom-0 left-0 border-b-[5px] border-l-[5px]`} />
          <span aria-hidden="true" className={`${corner} bottom-0 right-0 border-b-[5px] border-r-[5px]`} />

          <Link
            href="/controle-a-distance"
            className="rise group mx-auto mb-7 inline-flex max-w-full items-center gap-3 rounded-3xl border border-foreground/20 bg-background/60 py-1.5 pl-1.5 pr-4 text-left text-sm leading-snug sm:rounded-full backdrop-blur-sm transition-colors hover:bg-background/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            style={{ "--i": 0 } as React.CSSProperties}
          >
            <span className="rounded-full bg-accent px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-on-accent">Nouveau</span>
            <span className="min-w-0">
              <strong className="font-semibold">Pilote OBS</strong> depuis ton téléphone
            </span>
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">↗</span>
          </Link>

          <h1 className="rise h-hero" style={{ "--i": 1 } as React.CSSProperties}>
            Streame en direct, où que tu sois.
            <br />
            <RotatingHighlight />
          </h1>

          <p className="rise mx-auto mt-6 max-w-xl text-base leading-relaxed text-foreground/75 sm:text-lg" style={{ "--i": 2 } as React.CSSProperties}>
            {rich("SYXTEE **réunit plusieurs connexions** (4G, 5G, Wi-Fi, Starlink) en **un seul flux stable** vers Twitch, YouTube ou Kick, et te laisse **piloter OBS depuis ton téléphone**.")}
          </p>

          <div className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ "--i": 3 } as React.CSSProperties}>
            <Link href="/acces" className={`${btn} bg-accent text-on-accent border border-line-strong hover:bg-accent-hover`}>
              Demander l&apos;accès
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/tarifs" className={`${btn} border border-foreground/20 bg-background/60 text-foreground backdrop-blur-sm hover:bg-background/90`}>
              Voir les tarifs
            </Link>
          </div>
        </div>

        {/* Hero → grand écran seul : la vue d'ensemble du contrôle d'OBS, au premier regard ; le téléphone vient en section 02. */}
        <div className="rise mx-auto mt-14 max-w-4xl sm:mt-16" style={{ "--i": 4 } as React.CSSProperties}>
          <DeviceFrame variant="desktop" shot={SHOTS.controleBureau} priority />
        </div>

        {/* Quelques avatars de streamers inscrits (consentement + Twitch vérifié), rien sans au moins un. */}
        {faces.length > 0 && (
          <div className="rise mt-14 flex items-center justify-center gap-4" style={{ "--i": 5 } as React.CSSProperties}>
            <ul className="flex -space-x-3" aria-hidden="true">
              {faces.map((s) => (
                <li key={s.handle}>
                  <Image src={s.avatar!} alt="" width={56} height={56} className="h-12 w-12 rounded-full border-2 border-background object-cover sm:h-14 sm:w-14" />
                </li>
              ))}
            </ul>
            <p className="text-base text-foreground/75 sm:text-lg">Ils diffusent déjà avec nous</p>
          </div>
        )}
      </Container>
    </section>
  );
}
