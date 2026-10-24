import { LIMITS, RATES } from "../config/devis.ts";

// Devis automatique : fonction pure, utilisée par le formulaire (estimation en direct) et par le serveur (qui recalcule, sans croire le navigateur).

export type QuoteInput = {
  /** Nombre de directs. */
  lives: number;
  /** Durée de chaque direct, en heures. */
  hours: number;
  /** Régie à distance + bonding SRTLA. */
  remote: boolean;
  /** Vidéaste sur place. */
  crew: boolean;
  /** Distance domicile du vidéaste → lieu, aller simple, en km. */
  km: number;
};

export type QuoteLine = { label: string; detail: string; cents: number };
export type Quote = { input: QuoteInput; lines: QuoteLine[]; totalCents: number };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
/** Heures par quarts d'heure. */
const q = (h: number) => Math.round(h * 4) / 4;

export const eur = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} €`;
const hh = (h: number) => `${String(h).replace(".", ",")} h`;

/** Entrée ramenée dans les bornes permises. */
export function cleanQuote(i: Partial<QuoteInput>): QuoteInput {
  return {
    lives: Math.round(clamp(i.lives ?? 1, 1, LIMITS.maxLives)),
    hours: q(clamp(i.hours ?? 2, 1, LIMITS.maxHours)),
    remote: i.remote !== false,
    crew: !!i.crew,
    km: Math.round(clamp(i.km ?? 0, 0, LIMITS.maxKm)),
  };
}

export function computeQuote(raw: Partial<QuoteInput>): Quote {
  const input = cleanQuote(raw);
  const { lives, hours, remote, crew, km } = input;
  const x = lives > 1 ? ` × ${lives} directs` : "";
  const lines: QuoteLine[] = [
    { label: "Diffusion en direct", detail: `${hh(hours)}${x} · serveurs et supervision du réseau`, cents: Math.round(RATES.streamPerHour * hours) * lives },
  ];
  if (remote) lines.push({ label: "Bonding SRTLA et régie à distance", detail: `${hh(hours)}${x}`, cents: Math.round(RATES.remotePerHour * hours) * lives });
  if (crew) {
    const crewHours = Math.max(RATES.crewMinHours, hours + RATES.crewPrepHours);
    lines.push({ label: "Vidéaste sur place", detail: `${hh(crewHours)}${x} · préparation comprise`, cents: Math.round(RATES.crewPerHour * crewHours) * lives });
    if (km > 0) lines.push({ label: "Déplacement du vidéaste", detail: `${km} km aller, ${km * 2} km aller-retour${x}`, cents: km * 2 * RATES.travelPerKm * lives });
  }
  lines.push({ label: "Liaison internet de secours", detail: `1 par direct${x}`, cents: RATES.linkPerLive * lives });
  lines.push({ label: "eSIM de données", detail: `1 par direct${x}`, cents: RATES.esimPerLive * lives });
  return { input, lines, totalCents: lines.reduce((a, l) => a + l.cents, 0) };
}

/** Texte joint à la demande de devis (e-mail et base). */
export function quoteText(qt: Quote): string {
  return ["Estimation automatique :", ...qt.lines.map((l) => `- ${l.label} (${l.detail}) : ${eur(l.cents)}`), `Total estimé : ${eur(qt.totalCents)} (TVA non applicable, art. 293 B du CGI)`].join("\n");
}
