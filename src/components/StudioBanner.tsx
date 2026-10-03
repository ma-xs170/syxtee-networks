import Link from "next/link";
import StudioWire from "./illustrations/StudioWire";
import Wordmark from "./Wordmark";
import { Container } from "./ui";

// Bandeau « SYXTEE MIX » en bas des pages principales : la régie de diffusion, dans le navigateur.
export default function StudioBanner() {
  return (
    <section aria-labelledby="mix-banner" className="border-b border-line py-16">
      <Container>
        <div className="panel-lg grid items-center gap-8 p-6 sm:p-10 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Wordmark name="MIX" />
            <h2 id="mix-banner" className="h-section mt-3">
              SYXTEE MIX, ta régie dans le navigateur.
            </h2>
            <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted">
              Scènes, multiview, mixeur audio, secours automatique si l&apos;image se fige et mode podcast qui suit la voix. Sans installer OBS.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/syxtee-mix" className="btn btn-primary">
                Découvrir Mix
              </Link>
              <Link href="/mix" className="btn btn-secondary">
                Ouvrir Mix
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
