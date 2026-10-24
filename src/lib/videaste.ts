// Annuaire des vidéastes : règles de la fiche, vérifiées côté serveur avant toute publication.

export const PRICE_UNITS = { heure: "l'heure", "demi-journee": "la demi-journée", journee: "la journée", projet: "le projet" } as const;
export type PriceUnit = keyof typeof PRICE_UNITS;
export type CardStatus = "draft" | "pending" | "published" | "rejected";

export type CardInput = { displayName: string; region: string; country: string; priceFrom: number | null; priceTo: number | null; priceUnit: PriceUnit; bio: string; specialties: string[] };

/** Adresses et numéros interdits dans la fiche : le contact passe par SYXTEE, jamais par la fiche. */
const CONTACT = [
  { re: /[\w.+-]+@[\w-]+\.[\w.-]+/i, what: "une adresse e-mail" },
  { re: /(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|fr|net|org|io|tv|gg|me|co)\b/i, what: "un lien" },
  { re: /(?:\+?\d[\s.-]?){9,}/, what: "un numéro de téléphone" },
  { re: /\b(?:whats?app|telegram|snap(?:chat)?|signal|discord)\b/i, what: "un autre moyen de contact" },
  { re: /(?:^|\s)@[\w.]{3,}/, what: "un pseudo de réseau social" },
];

/** Problèmes à corriger avant publication (liste vide : la fiche passe les règles). */
export function cardProblems(c: CardInput): string[] {
  const out: string[] = [];
  const text = [c.displayName, c.region, c.bio, ...c.specialties].join("\n");
  for (const { re, what } of CONTACT) if (re.test(text)) out.push(`La fiche contient ${what} : retire-le, le contact passe par SYXTEE.`);
  if (c.priceFrom !== null && c.priceTo !== null && c.priceTo < c.priceFrom) out.push("Le prix maximum est plus bas que le minimum.");
  if (c.priceFrom === null && c.priceTo === null) out.push("Indique au moins un prix (même « à partir de »).");
  return out;
}

/** « 150 à 300 € la journée », « à partir de 150 € la journée », « 200 € le projet ». */
export function priceLabel(c: { priceFrom: number | null; priceTo: number | null; priceUnit: PriceUnit }): string {
  const unit = PRICE_UNITS[c.priceUnit];
  const { priceFrom: a, priceTo: b } = c;
  if (a !== null && b !== null) return a === b ? `${a} € ${unit}` : `${a} à ${b} € ${unit}`;
  if (a !== null) return `à partir de ${a} € ${unit}`;
  return b !== null ? `jusqu'à ${b} € ${unit}` : "Sur devis";
}

/** Spécialités saisies « mariage, clip, live » : nettoyées, sans doublon, 6 au plus. */
export function parseSpecialties(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[,;\n]/)) {
    const s = part.trim().replace(/\s+/g, " ").slice(0, 30);
    if (s) seen.add(s);
  }
  return [...seen].slice(0, 6);
}
