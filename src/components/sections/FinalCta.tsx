import Link from "next/link";
import CloudBackdrop from "../home/CloudBackdrop";
import { Container } from "../ui";
import Highlight from "../ui/Highlight";

// Appel final : section sombre (volutes grises), grande carte au filet fin, bouton pilule et lien souligné.

export default function FinalCta() {
  return (
    <section data-theme="dark" className="relative overflow-hidden bg-background py-28 text-foreground sm:py-36">
      <CloudBackdrop flip />
      <Container className="relative">
        <div className="tile relative mx-auto max-w-4xl rounded-[2rem] px-6 py-14 text-center sm:px-14 sm:py-20">

          <h2 className="h-hero mx-auto max-w-3xl">
            Prêt à streamer ? <Highlight>Demande ton accès.</Highlight>
          </h2>
          <div className="mt-10 flex flex-col items-center gap-4">
            <Link
              href="/acces"
              className="inline-flex h-12 items-center justify-center gap-3 whitespace-nowrap rounded-full btn-tonal px-8 text-base font-medium transition-[background-color,transform] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              Demander l&apos;accès
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/tarifs" className="text-base underline underline-offset-4 hover:text-foreground/70">
              Voir les tarifs
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
