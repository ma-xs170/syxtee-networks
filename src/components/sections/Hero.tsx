import Link from "next/link";
import { relays } from "@/lib/site";
import HeroStreet from "../home/HeroStreet";
import { Container, DiscordButton } from "../ui";

export default function Hero() {
  const online = relays.filter((r) => r.status === "online");

  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <Container className="relative grid items-center gap-14 py-20 sm:py-28 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="inline-flex items-center gap-3 rounded-full border border-line bg-white/[0.03] px-4 py-1.5 font-mono text-xs uppercase tracking-[0.15em] text-muted">
            <span className="live-dot" />
            {online.length > 0 ? `Relais ${online.map((r) => r.city).join(" · ")} en ligne` : "Bientôt en ligne"}
          </p>

          <h1 className="mt-8 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Le live IRL pro.
            <br />
            <span className="text-muted">Sans le budget pro.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            SYXTEE NETWORKS, c&apos;est un relais SRTLA pour streamer en extérieur avec ton téléphone.
            Tes connexions 4G, 5G et Wi-Fi combinées pour moins de coupures, et le flux récupéré
            directement dans ton OBS.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <DiscordButton />
            <Link
              href="/fonctionnement"
              className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-medium hover:bg-white/5"
            >
              Comment ça marche
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
