import Link from "next/link";
import { relays } from "@/lib/site";
import HeroStreet from "../home/HeroStreet";
import { Container, CreateRelayLink } from "../ui";
import Highlight from "../ui/Highlight";

export default function Hero() {
  const online = relays.filter((r) => r.status === "online");

  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <Container className="relative grid items-center gap-14 py-16 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="inline-flex items-center gap-3 rounded-full border border-line bg-white/[0.03] px-4 py-1.5 font-mono text-xs uppercase tracking-[0.15em] text-muted">
            <span className="live-dot" />
            {online.length > 0 ? `Relais ${online.map((r) => r.city).join(" · ")} en ligne` : "Bientôt en ligne"}
          </p>

          <h1 className="mt-8 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Le live IRL pro.
            <br />
            <Highlight>Sans le budget pro.</Highlight>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Un relais SRTLA ou RTMP pour streamer en IRL : bonding 4G, 5G, Wi-Fi et Starlink, mire de coupure, santé du flux.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <CreateRelayLink />
            <Link
              href="/offres"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-line px-5 py-3 text-sm font-medium transition-colors hover:bg-white/5"
            >
              Voir les offres
            </Link>
          </div>
        </div>

        <div className="relative">
          <HeroStreet />
        </div>
      </Container>
    </section>
  );
}
