import { getCountry } from "countries-and-timezones";
import { COUNTRIES } from "@/lib/auth/profileSchema";

// Région du compte : pays (drapeau Apple via l'emoji) + fuseau horaire pour l'heure et le Bonjour du dashboard.

export const DEFAULT_TIMEZONE = "Europe/Paris";

/** Emoji drapeau d'un code pays ISO 3166-1 alpha-2 (deux indicateurs régionaux). */
export function flag(code: string) {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export type Region = { code: string; name: string; flag: string; timezones: string[] };

export function regionList(): Region[] {
  const names = new Intl.DisplayNames(["fr"], { type: "region" });
  return COUNTRIES.map((code) => ({ code, name: names.of(code) ?? code, flag: flag(code), timezones: getCountry(code)?.timezones ?? [] }))
    .filter((r) => r.timezones.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Fuseau valide pour ce pays : celui demandé s'il en fait partie, sinon le premier du pays. */
export function timezoneFor(country: string | null | undefined, wanted?: string | null) {
  const zones: string[] = (country && getCountry(country as never)?.timezones) || [];
  if (wanted && zones.includes(wanted)) return wanted;
  return zones[0] ?? null;
}

export function validTimezone(tz: string | null | undefined) {
  if (!tz) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** Heure serveur en ms (hors composant : le rendu reste lisible par le linter). */
export function serverNow() {
  return Date.now();
}

/** Heure locale (0–23) d'un instant dans un fuseau. Passe par formatToParts : le texte localisé (« 12 h ») n'est pas fiable. */
export function localHour(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone }).formatToParts(new Date(ms));
  const h = Number(parts.find((p) => p.type === "hour")?.value);
  return Number.isFinite(h) ? h % 24 : 0;
}

export type DayPart = { emoji: string; hello: string };

/** Moment de la journée d'après l'heure locale (0–23). */
export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return { emoji: "☀️", hello: "Bonjour" };
  if (hour >= 12 && hour < 14) return { emoji: "🍽️", hello: "Bon midi" };
  if (hour >= 14 && hour < 18) return { emoji: "🌤️", hello: "Bon après-midi" };
  return { emoji: "🌙", hello: "Bonne soirée" };
}
