import Link from "next/link";
import StudioWire from "./illustrations/StudioWire";
import Wordmark from "./Wordmark";
import { Container } from "./ui";

// Bandeau « SYXTEE COMMUTATEUR » en bas des pages principales : la régie de diffusion, dans le navigateur.
export default function StudioBanner() {
  return (
    <section aria-labelledby="mix-banner" className="border-b border-line py-16">
      <Container>
        <div className="panel-lg grid items-center gap-8 p-6 sm:p-10 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Wordmark name="COMMUTATEUR" />
            <h2 id="mix-banner" className="h-section mt-3">
              SYXTEE COMMUTATEUR, toutes tes caméras sur un écran.
            </h2>
            <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted">
              Multiview, PROGRAM et PREVIEW, transitions, mixeur audio, protection et un seul lien pour OBS.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <span className="inline-flex h-12 items-center rounded-xl border border-line px-5 font-mono text-xs uppercase tracking-[0.14em] text-muted">À venir</span>
              <Link href="/syxtee-mix" className="btn btn-secondary">
                Découvrir le commutateur
              </Link>
            </div>
          </div>
          <div className="mx-auto h-48 w-full max-w-sm md:h-60">
            <StudioWire />
          </div>
        </div>
      </Container>
    </section>
  );
}
