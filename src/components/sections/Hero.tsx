import Link from "next/link";
import CloudBackdrop from "../home/CloudBackdrop";
import { Container } from "../ui";
import Highlight from "../ui/Highlight";
import { MultistreamDock, PlatformLogos } from "./Multistream";

// Accueil : hero sombre et épuré. Un titre, une phrase, un bouton, puis le multistream (le dock et les logos des plateformes).
// Le reste de la page suit le thème choisi.

const btn =
  "inline-flex h-12 items-center justify-center gap-3 whitespace-nowrap rounded-xl px-7 text-base font-medium transition-[background-color,transform] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export default function Hero() {
  return (
    <section data-theme="dark" className="relative -mt-[4.0625rem] overflow-hidden border-b border-line bg-background text-foreground">
      <CloudBackdrop />
      <Container className="relative pb-20 pt-[9rem] sm:pb-28 sm:pt-[11rem]">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="rise h-hero" style={{ "--i": 0 } as React.CSSProperties}>
            Un direct. <Highlight>Toutes tes plateformes.</Highlight>
          </h1>
          <p className="rise mx-auto mt-6 max-w-lg text-base leading-relaxed text-foreground/75 sm:text-lg" style={{ "--i": 1 } as React.CSSProperties}>
            Lance ou arrête chaque diffusion d&apos;un toucher, depuis ton téléphone.
          </p>
          <div className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ "--i": 2 } as React.CSSProperties}>
            <Link href="/acces" className={`${btn} border border-line-strong bg-accent text-on-accent hover:bg-accent-hover`}>
              Demander l&apos;accès
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/tarifs" className="text-base underline underline-offset-4 hover:text-foreground/70">
              Voir les tarifs
            </Link>
          </div>
        </div>

        <div className="rise mx-auto mt-16 max-w-md sm:mt-20" style={{ "--i": 3 } as React.CSSProperties}>
          <MultistreamDock />
        </div>
        <div className="rise mt-14" style={{ "--i": 4 } as React.CSSProperties}>
          <PlatformLogos />
        </div>
      </Container>
    </section>
  );
}
