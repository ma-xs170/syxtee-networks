import type { ReactNode } from "react";
import DataCenter from "../illustrations/DataCenter";
import ObsScreen from "../illustrations/ObsScreen";
import PhoneMoblin from "../illustrations/PhoneMoblin";
import RelayServer from "../illustrations/RelayServer";
import { Container } from "../ui";
import { HealthArt, KeyArt, PreviewArt } from "./BentoArt";

// « Ce que ton relais fait pour toi » : 7 cases, 7 contenus. Desktop : 3 colonnes (2+1, 1+1+1, 1+2). Mobile : une colonne.
// Les cases larges (span 2) passent en deux colonnes (dessin, texte) ; les fonds varient : noir, grille, dégradé.

type Cell = { title: string; text: string; art: ReactNode; wide?: boolean; tone: "plain" | "grid" | "glow" };

const cells: Cell[] = [
  { title: "SRTLA, RTMP ou RIST", text: "SRTLA pour le bonding en mouvement. RIST (nouveau) pour un encodeur pro. RTMP pour une caméra DJI, GoPro ou OBS.", art: <RelayServer />, wide: true, tone: "grid" },
  { title: "Bonding multi-réseaux", text: "4G, 5G, Wi-Fi et Starlink combinés. Si un réseau lâche, les autres continuent.", art: <PhoneMoblin />, tone: "plain" },
  { title: "Studio dans le navigateur", text: "Compose tes scènes, enregistre et diffuse vers Twitch, Kick ou YouTube, sans OBS.", art: <ObsScreen />, tone: "glow" },
  { title: "Santé du flux", text: "Débit, pertes et latence en direct, dans ton dashboard.", art: <HealthArt />, tone: "plain" },
  { title: "Aperçu et stats", text: "Ton flux en temps réel, et l'historique de tes lives.", art: <PreviewArt />, tone: "grid" },
  { title: "Clés uniques et sécurisées", text: "Une clé par relais, chiffrée côté serveur. Un second publieur est refusé.", art: <KeyArt />, tone: "plain" },
  { title: "Serveur à Beauharnois", text: "D'autres villes arrivent bientôt, avec la latence affichée avant de choisir.", art: <DataCenter />, wide: true, tone: "glow" },
];

const TONE: Record<Cell["tone"], string> = {
  plain: "bg-background",
  grid: "bg-background",
  glow: "bg-gradient-to-br from-accent/[0.07] via-background to-background",
};

export default function RelayBento() {
  return (
    <section id="relais" aria-labelledby="bento-titre" className="bg-field border-b border-line py-24">
      <Container>
        <h2 id="bento-titre" className="max-w-2xl h-section">
          Ce que ton relais fait pour toi.
        </h2>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {cells.map((c, i) => (
            <article
              key={c.title}
              className={`group relative flex flex-col gap-6 p-6 transition-colors hover:bg-surface sm:p-8 ${TONE[c.tone]} ${c.wide ? "md:col-span-2 md:flex-row md:items-center" : ""}`}
            >
              {c.tone === "grid" && <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />}
              <div className={`hover-play relative h-36 w-full transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.03] ${c.wide ? "md:h-44 md:w-1/2" : ""}`}>
                {c.art}
              </div>
              <div className={`relative ${c.wide ? "md:w-1/2" : ""}`}>
                <p className="mb-3 font-mono text-xs tabular-nums text-accent">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="text-xl font-semibold">{c.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{c.text}</p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
