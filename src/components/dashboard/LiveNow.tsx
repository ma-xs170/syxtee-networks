"use client";

import { ArrowLink, Tile, TileLabel } from "./ui";
import { useLiveStatus } from "./LiveStatus";
import StreamPreview from "./StreamPreview";

// Aperçu en direct sur la vue d'ensemble : les sources en live (2 max), vidéo en temps réel. Rien tant qu'aucun relais n'est en direct.
export default function LiveNow({ sources }: { sources: { id: string; name: string }[] }) {
  const { state, coreUrl } = useLiveStatus();
  const liveIds = new Set(state?.relays?.filter((r) => r.live).map((r) => r.id) ?? []);
  const live = sources.filter((s) => liveIds.has(s.id)).slice(0, 2);
  if (live.length === 0 || !coreUrl) return null;
  return (
    <Tile aria-labelledby="live-now">
      <TileLabel id="live-now" right={<ArrowLink href="/dashboard/apercu">Ouvrir l'aperçu</ArrowLink>}>
        Aperçu en direct
      </TileLabel>
      <ul className={`mt-4 grid gap-4 ${live.length > 1 ? "md:grid-cols-2" : ""}`}>
        {live.map((s) => (
          <li key={s.id}>
            <p className="mb-2 font-mono text-xs text-muted">{s.name}</p>
            <StreamPreview coreUrl={coreUrl} relayId={s.id} />
          </li>
        ))}
      </ul>
    </Tile>
  );
}
