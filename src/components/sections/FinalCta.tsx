import Link from "next/link";
import { site } from "@/lib/site";
import CloudBackdrop from "../home/CloudBackdrop";
import { CREATE_RELAY_HREF, Container } from "../ui";
import Highlight from "../ui/Highlight";

// Appel final : section claire (blanc en haut, nuages rouges animés en bas), titre dans un cadre de viseur, bouton noir
// et lien souligné, comme la fin de page des sites de streaming.

const corner = "pointer-events-none absolute h-9 w-9 border-accent sm:h-12 sm:w-12";

export default function FinalCta() {
  return (
    <section data-theme="light" className="relative overflow-hidden bg-background py-28 text-foreground sm:py-36">
      <CloudBackdrop flip />
      <Container className="relative">
        <div className="relative mx-auto max-w-4xl px-6 py-14 text-center sm:px-14 sm:py-20">
          <span aria-hidden="true" className={`${corner} left-0 top-0 border-l-[5px] border-t-[5px]`} />
          <span aria-hidden="true" className={`${corner} right-0 top-0 border-r-[5px] border-t-[5px]`} />
          <span aria-hidden="true" className={`${corner} bottom-0 left-0 border-b-[5px] border-l-[5px]`} />
          <span aria-hidden="true" className={`${corner} bottom-0 right-0 border-b-[5px] border-r-[5px]`} />

          <h2 className="h-hero mx-auto max-w-3xl">
            Prêt à streamer ? <Highlight>Crée ton relais.</Highlight>
          </h2>
          <div className="mt-10 flex flex-col items-center gap-4">
            <Link
              href={CREATE_RELAY_HREF}
              className="inline-flex h-12 items-center justify-center gap-3 whitespace-nowrap rounded-xl border border-line-strong bg-accent px-8 text-base font-medium text-on-accent transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              Commencer
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/fonctionnement" className="text-base underline underline-offset-4 hover:text-foreground/70">
              En savoir plus sur les fonctionnalités
            </Link>
          </div>
          <p className="mx-auto mt-8 max-w-lg text-sm text-foreground/70">
            Une question ? Le support se passe sur le{" "}
            <a href={site.discord} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-4">
              Discord
            </a>
            .
          </p>
        </div>
      </Container>
    </section>
  );
}
