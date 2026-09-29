// Règles et jauge de solidité du mot de passe (client + serveur). La vérification des fuites est dans pwned.ts.

export const PASSWORD_MIN = 10;
/** Supabase (bcrypt) ignore tout au-delà de 72 octets : on refuse plutôt que de tronquer en silence. */
export const PASSWORD_MAX_BYTES = 72;

const COMMON = ["password", "motdepasse", "azerty", "qwerty", "123456", "syxtee", "soleil", "bonjour", "admin", "welcome", "iloveyou", "football"];

export type Strength = 0 | 1 | 2; // faible, moyen, fort
export const STRENGTH_LABEL = ["Faible", "Moyen", "Fort"] as const;

/** Estimation simple : longueur, variété des caractères, motifs évidents. */
export function passwordStrength(pw: string): Strength {
  if (pw.length < PASSWORD_MIN) return 0;
  const lower = pw.toLowerCase();
  if (COMMON.some((w) => lower.includes(w)) || /(0123|1234|2345|3456|4567|5678|6789|abcd)/i.test(pw)) return 0;
  if (new Set(pw).size < 5) return 0;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if ((pw.length >= 14 && classes >= 3) || (pw.length >= 12 && classes === 4) || pw.length >= 20) return 2;
  return classes >= 2 ? 1 : 0;
}

/** Message d'erreur si le mot de passe est refusé, sinon null. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `Mot de passe : ${PASSWORD_MIN} caractères minimum.`;
  if (new TextEncoder().encode(pw).length > PASSWORD_MAX_BYTES) return "Mot de passe trop long (72 caractères maximum).";
  if (passwordStrength(pw) === 0) return "Mot de passe trop faible : allonge-le ou mélange lettres, chiffres et symboles.";
  return null;
}
