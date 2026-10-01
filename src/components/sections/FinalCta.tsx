import { site } from "@/lib/site";
import { Container, CreateRelayLink } from "../ui";
import Highlight from "../ui/Highlight";

export default function FinalCta() {
  return (
    <section className="py-28">
      <Container className="text-center">
        <h2 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
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
      </Container>
    </section>
  );
}
