// Rapport de live : note de stabilité de 0 à 100 et formulation, calculées uniquement à partir des mesures du relais.

export type ReportInput = { duration_s: number; avg_kbps: number; reconnects: number; bitrate_series: number[] };

export type Stability = { score: number; label: string };

/** Direct trop court pour être noté : en dessous, la note ne veut rien dire. */
const MIN_SECONDS = 120;

/**
 * Note de stabilité : on part de 100 et on retire
 * - les coupures : 8 points par coupure et par heure de direct (40 au plus) ;
 * - les creux : 0,8 point par pourcent de relevés tombés sous la moitié du débit moyen (40 au plus).
 */
export function stability(s: ReportInput): Stability | null {
  if (s.duration_s < MIN_SECONDS) return null;
  const hours = Math.max(s.duration_s / 3600, 0.1);
  const cuts = Math.min(40, (s.reconnects / hours) * 8);
  const series = s.bitrate_series;
  const dips = s.avg_kbps > 0 && series.length >= 4 ? (series.filter((p) => p < s.avg_kbps * 0.5).length / series.length) * 100 * 0.8 : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - cuts - Math.min(40, dips))));
  const label = score >= 90 ? "Très stable" : score >= 75 ? "Stable" : score >= 55 ? "Correct" : "Instable";
  return { score, label };
}

/** Jeton du lien public : 32 caractères URL-safe tirés d'un aléa de 24 octets. */
export const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;
