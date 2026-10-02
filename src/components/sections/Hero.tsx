import Link from "next/link";
import { relays, site } from "@/lib/site";
import HeroStreet from "../home/HeroStreet";
import { Container, CreateRelayLink } from "../ui";
import Highlight from "../ui/Highlight";

export default function Hero() {
  const online = relays.filter((r) => r.status === "online");

  return (
    <section className="overflow-hidden border-b border-line">
      <Container className="relative grid items-center gap-14 pb-16 pt-12 sm:pb-24 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div>
            <p className="inline-flex items-center gap-3 rounded-full border border-line bg-accent/[0.08] px-4 py-1.5 font-mono text-xs uppercase tracking-[0.15em] text-muted">
              <span className="live-dot" />
              {online.length > 0 ? `Relais ${online.map((r) => r.city).join(" · ")} en ligne` : "Bientôt en ligne"}
            </p>
          </div>

          <h1 className="rise mt-8 h-hero" style={{ "--i": 1 } as React.CSSProperties}>
            Le live IRL pro.
            <br />
            <Highlight>Sans le budget pro.</Highlight>
          </h1>

          <p className="rise mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg" style={{ "--i": 2 } as React.CSSProperties}>
            Un relais SRTLA ou RTMP pour streamer en IRL : bonding 4G, 5G, Wi-Fi et Starlink.
          </p>

          <div className="rise mt-10 flex flex-col gap-3 sm:flex-row" style={{ "--i": 3 } as React.CSSProperties}>
            <CreateRelayLink />
            <Link
              href={site.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              Demander une invitation
            </Link>
          </div>
        </div>

        <HeroStreet />
      </Container>
    </section>
  );
}
