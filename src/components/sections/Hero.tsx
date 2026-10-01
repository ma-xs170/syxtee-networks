import Link from "next/link";
import { relays } from "@/lib/site";
import HeroStreet from "../home/HeroStreet";
import { Container, CreateRelayLink } from "../ui";
import Highlight from "../ui/Highlight";

export default function Hero() {
  const online = relays.filter((r) => r.status === "online");

  return (
    <section className="bg-field overflow-hidden border-b border-line">
            <Container className="relative grid items-center gap-14 pb-16 pt-12 sm:pb-24 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="inline-flex items-center gap-3 rounded-full border border-line bg-accent/[0.08] px-4 py-1.5 font-mono text-xs uppercase tracking-[0.15em] text-muted">
            <span className="live-dot" />
            {online.length > 0 ? `Relais ${online.map((r) => r.city).join(" · ")} en ligne` : "Bientôt en ligne"}
          </p>

          <h1 className="mt-8 h-hero">
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
              className="btn btn-secondary"
            >
              Voir les offres
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden panel-lg shadow-[0_0_80px_-30px_var(--glow)]">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full border border-accent/40" />
            <span className="h-2.5 w-2.5 rounded-full border border-accent/40" />
            <span className="h-2.5 w-2.5 rounded-full border border-accent/40" />
            <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">relais / srtla</span>
          </div>
          <HeroStreet />
        </div>
      </Container>
    </section>
  );
}
