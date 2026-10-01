import { site } from "@/lib/site";
import { Container, CreateRelayLink } from "../ui";
import Highlight from "../ui/Highlight";

export default function FinalCta() {
  return (
    <section className="bg-field bg-field-bottom py-24">
      <Container>
        <div className="panel-lg relative overflow-hidden px-6 py-20 text-center sm:py-28">
        <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative">
        <h2 className="h-hero mx-auto max-w-3xl">
          Prêt à streamer ? <Highlight>Crée ton relais.</Highlight>
        </h2>
        <div className="mt-10">
          <CreateRelayLink />
        </div>
        <p className="mx-auto mt-6 max-w-lg text-sm text-muted">
          Une question ? Le support se passe sur le{" "}
          <a href={site.discord} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4">
            Discord
          </a>
          .
        </p>
        </div>
        </div>
      </Container>
    </section>
  );
}
