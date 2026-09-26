// Simulation (déterministe) de la santé d'un flux reçu par le relais, en fonction du temps t (secondes).
// Valeurs réalistes pour un live IRL à 6 000 kbit/s bien stabilisé par le bonding.

/** Débit reçu (kbit/s) : stable autour de 6 000, avec de petites variations. */
export const bitrate = (t: number) => 6000 + 90 * Math.sin(t * 1.3) + 55 * Math.sin(t * 3.7 + 1) + 35 * Math.sin(t * 7.1 + 2);

/** Congestion (%) : faible, jamais négative. */
export const congestion = (t: number) => Math.max(0, 1.1 + 0.7 * Math.sin(t * 0.9) + 0.45 * Math.sin(t * 2.3 + 0.5));

/** Paquets récupérés (renvoyés après une perte) : compteur qui ne fait que monter. */
export const recovered = (t: number) => 128 + Math.floor(t * 2.4);

/** Courbe de débit : `n` points sur les `span` dernières secondes, normalisés entre 0 (bas) et 1 (haut). */
export function bitrateCurve(t: number, n = 48, span = 12, min = 5600, max = 6400) {
  return Array.from({ length: n }, (_, i) => {
    const v = bitrate(t - span + (span * i) / (n - 1));
    return Math.min(1, Math.max(0, (v - min) / (max - min)));
  });
}
