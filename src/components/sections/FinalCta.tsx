import { Container, DiscordButton } from "../ui";

export default function FinalCta() {
  return (
    <section className="py-28">
      <Container className="text-center">
        <h2 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">Prêt à sortir streamer ?</h2>
        <p className="mx-auto mt-5 max-w-lg text-base text-muted">
          Accès, questions, support : tout se passe sur le Discord SYXTEE NETWORKS.
        </p>
        <div className="mt-10">
          <DiscordButton />
        </div>
      </Container>
    </section>
  );
}
