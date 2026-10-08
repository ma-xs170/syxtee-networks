import Link from "next/link";
import CloudBackdrop from "../home/CloudBackdrop";
import { Container } from "../ui";
import Highlight from "../ui/Highlight";
import DeviceFrame from "../device/DeviceFrame";
import { SHOTS } from "../device/shots";

// Accueil : hero sombre et épuré. Le site est le contrôle à distance d'OBS Studio, avec multistream et relais : un titre, une phrase, un bouton, la capture du contrôle.
// Le reste de la page suit le thème choisi.

const btn =
  "inline-flex h-12 max-sm:w-full items-center justify-center gap-3 whitespace-nowrap rounded-full px-7 text-base font-medium transition-[background-color,transform] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export default function Hero() {
  return (
    <section data-theme="dark" className="relative -mt-[4.0625rem] overflow-hidden border-b border-line bg-background text-foreground">
      <CloudBackdrop />
      <Container className="relative pb-10 pt-[7rem] sm:pb-28 sm:pt-[11rem]">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="rise h-hero" style={{ "--i": 0 } as React.CSSProperties}>
            Contrôle à distance d&apos;OBS Studio. <Highlight>Avec multistream et relais.</Highlight>
          </h1>
          <p className="rise mx-auto mt-6 max-w-lg text-base leading-relaxed text-foreground/75 sm:text-lg" style={{ "--i": 1 } as React.CSSProperties}>
            Pilote ton OBS depuis ton téléphone, diffuse vers toutes tes plateformes et garde un flux stable.
          </p>
          <div className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ "--i": 2 } as React.CSSProperties}>
            <Link href="/acces" className={`${btn} border border-line-strong bg-accent text-on-accent hover:bg-accent-hover`}>
              Demander l&apos;accès
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/tarifs" className="inline-flex min-h-11 items-center text-base underline underline-offset-4 hover:text-foreground/70">
              Voir les tarifs
            </Link>
          </div>
        </div>

        <div className="rise mx-auto mt-14 hidden max-w-4xl sm:mt-16 sm:block" style={{ "--i": 3 } as React.CSSProperties}>
          <DeviceFrame variant="desktop" shot={SHOTS.controleBureau} priority />
        </div>
      </Container>
    </section>
  );
}
