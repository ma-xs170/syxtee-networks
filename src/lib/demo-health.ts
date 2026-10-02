import type { HealthDemo, Sample } from "@/components/dashboard/StreamHealth";

// Données d'exemple de la « Santé du flux » (démo du site et captures). Déterministes : aucun appel au Core.

const NOW = Date.UTC(2026, 9, 2, 20, 0, 0);
const COUNT = 90;

const history: Sample[] = Array.from({ length: COUNT }, (_, i) => ({
  t: NOW - (COUNT - i) * 10_000,
  bitrate: 6000 + Math.sin(i / 5) * 380 + Math.sin(i * 1.7) * 140,
  rtt: 42 + Math.sin(i / 7) * 6,
  dropped: i % 29 === 0 ? 3 : 0,
  congestion: 0.04,
  links: 4,
}));

export const DEMO_HEALTH: HealthDemo = {
  live: {
    live: true,
    since: NOW - 5_400_000,
    sample: { ...history[history.length - 1], bitrate: 6120, rtt: 41, congestion: 0.03, dropped: 0 },
    peers: [
      { connection_id: "a", bitrate: 2450 },
      { connection_id: "b", bitrate: 1980 },
      { connection_id: "c", bitrate: 1210 },
      { connection_id: "d", bitrate: 480 },
    ],
  },
  history,
};
