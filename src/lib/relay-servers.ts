// Serveurs de relais (un Core par serveur). Seuls ceux marqués `available` acceptent de nouveaux relais.
// La latence des autres est estimée à partir de la distance (voir estimateRtt).

export type RelayServer = {
  id: string;
  city: string;
  country: string;
  /** Code ISO du pays, pour le drapeau. */
  cc: string;
  lat: number;
  lon: number;
  available: boolean;
  /** Serveur temporairement arrêté (migration, entretien) : affiché « Maintenance » et non « Bientôt ». */
  maintenance?: boolean;
};

export const RELAY_SERVERS: RelayServer[] = [
  { id: "bhs1", city: "Beauharnois", country: "Canada", cc: "CA", lat: 45.32, lon: -73.87, available: true },
  { id: "nyc1", city: "New York", country: "États-Unis", cc: "US", lat: 40.71, lon: -74.01, available: false, maintenance: true },
  { id: "mia1", city: "Miami", country: "États-Unis", cc: "US", lat: 25.76, lon: -80.19, available: false },
  { id: "par1", city: "Paris", country: "France", cc: "FR", lat: 48.86, lon: 2.35, available: false },
  { id: "gp1", city: "Guadeloupe", country: "France", cc: "GP", lat: 16.24, lon: -61.53, available: false },
  { id: "yul1", city: "Montréal", country: "Canada", cc: "CA", lat: 45.5, lon: -73.57, available: false },
  { id: "lon1", city: "Londres", country: "Royaume-Uni", cc: "GB", lat: 51.51, lon: -0.13, available: false },
  { id: "gru1", city: "São Paulo", country: "Brésil", cc: "BR", lat: -23.55, lon: -46.63, available: false },
];

export const serverById = (id: string) => RELAY_SERVERS.find((s) => s.id === id) ?? null;

/** Drapeau emoji d'un code pays ISO (deux lettres régionales). */
export const flag = (cc: string) => String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));

/** Distance orthodromique en km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * RTT estimé (ms) : aller-retour dans la fibre (~200 km/ms), routes réelles ~1,5 fois plus longues que la ligne droite,
 * plus ~10 ms d'accès (box, 4G). Ordre de grandeur seulement, affiché en gris.
 */
export const estimateRtt = (km: number) => Math.round((2 * km * 1.5) / 200 + 10);

export type LatencyTone = "good" | "fair" | "bad" | "none";
export const latencyTone = (ms: number | null): LatencyTone => (ms == null ? "none" : ms < 60 ? "good" : ms <= 120 ? "fair" : "bad");
