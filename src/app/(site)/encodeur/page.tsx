import type { Metadata } from "next";
import EncoderDashboardDemo from "@/components/encoder/EncoderDashboardDemo";
import Glow from "@/components/landing/Glow";
import RelayBox from "@/components/landing/RelayBox";
import VisualSlot from "@/components/landing/VisualSlot";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import GlassIcon from "@/components/ui/GlassIcon";
import GridBackground from "@/components/ui/GridBackground";
import SectionHeader from "@/components/ui/SectionHeader";
import StatusPill from "@/components/ui/StatusPill";
import WordsReveal from "@/components/ui/WordsReveal";
import { product } from "@/config/product";
import { deviceImage } from "@/lib/device-images";

export const metadata: Metadata = {
  title: "Encodeur",
  description: "SYXTEE Encodeur : le boîtier où tu branches ta caméra et qui diffuse ton direct de n'importe où, en bondant toutes tes connexions. En développement.",
  alternates: { canonical: "/encodeur" },
};

const bento = [
  { icon: "relay" as const, title: "Bonding en direct", text: "Coupe une connexion : le débit, la latence et le graphique réagissent tout de suite, et les autres connexions compensent." },
  { icon: "health" as const, title: "Slate automatique", text: "Si tout lâche, une mire s'affiche pour tes viewers et le direct reprend dès que le réseau revient." },
  { icon: "obs-cloud" as const, title: "Mises à jour à distance", text: "Le firmware se met à jour depuis le tableau de bord, sans rien brancher ni redémarrer à la main." },
];

export default function EncodeurPage() {
  const { specs } = product;
  const rows: [string, string][] = [
    ["Connexions bondées", `Jusqu'à ${specs.bondedConnections}`],
    ["Latence moyenne", `${specs.latencyMs} ms`],
    ["Protocoles", specs.protocols.join(", ")],
    ["Ports", specs.ports.join(", ")],
    ["Alimentation", specs.power],
  ];
  return (
    <>
      <Glow />
      {/* Présentation */}
      <section id="presentation" className="relative -mt-[4.0625rem] scroll-mt-20 overflow-hidden border-b border-line pb-20 pt-[8.5rem] sm:pb-28 sm:pt-[9.5rem]">
        <GridBackground />
        <Container className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <StatusPill variant="dev" />
            <h1 className="h-serif mx-auto mt-8 text-[clamp(3rem,8vw,5.5rem)]">
              <WordsReveal text="SYXTEE Encodeur." em={["Encodeur."]} />
            </h1>
            <p className="mx-auto mt-6 max-w-[560px] text-lg leading-relaxed text-foreground/85">{product.tagline}</p>
            <p className="mx-auto mt-4 max-w-[560px] text-base leading-relaxed text-muted">{product.pitch}</p>
          </div>
          <div className="mx-auto mt-14 max-w-4xl opacity-95">
            <VisualSlot name="encoder-hero" fallback={<RelayBox />} />
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-[1.3fr_1fr]">
            <dl className="bento-cell divide-y divide-line p-6 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-3 first:pt-0 last:pb-0">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-mono">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="bento-cell flex flex-col justify-between p-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Prix</p>
                <p className="mt-2 text-3xl font-medium tracking-tight text-foreground/80">Bientôt disponible</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">Le plus accessible du marché : pas de matériel pro hors de prix, pas d&apos;abonnement compliqué.</p>
              </div>
              <div className="mt-6"><ButtonLink href="/acces" className="w-full">Être prévenu</ButtonLink></div>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-4xl text-xs text-muted">Caractéristiques indicatives, susceptibles d&apos;évoluer avant la sortie.</p>
        </Container>
      </section>

      {/* Interface : démo du tableau de bord */}
      <section id="interface" className="scroll-mt-20 py-24 sm:py-32">
        <Container>
          <SectionHeader icon="health" title={<>Toute ta mobilité, dans un seul <em>tableau de bord.</em></>} subtitle="Branche ta caméra, suis chaque connexion et pilote ton direct. Essaie : tout est simulé, rien à installer." />
          <div className="mt-16">
            <EncoderDashboardDemo images={{ laptop: deviceImage("laptop"), phone: deviceImage("phone") }} />
          </div>
          <div className="mt-20 grid gap-4 md:grid-cols-3">
            {bento.map((b) => (
              <article key={b.title} className="bento-cell flex flex-col p-7">
                <GlassIcon name={b.icon} size={56} />
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{b.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
