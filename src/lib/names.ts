// Prénom + nom affichés à la place du pseudo (qui reste en base comme identifiant technique).

type Names = { first_name?: string | null; last_name?: string | null };

const clean = (s: string | null | undefined) => s?.trim() || "";

/** Vrai si le compte a renseigné son prénom et son nom (sinon, modale obligatoire). */
export const hasNames = (p: Names | null | undefined) => !!(clean(p?.first_name) && clean(p?.last_name));

/** « Mathis N. » (prénom + initiale du nom). */
export function shortName(p: Names | null | undefined, fallback = "") {
  const f = clean(p?.first_name);
  const l = clean(p?.last_name);
  if (!f) return fallback;
  return l ? `${f} ${l.charAt(0).toUpperCase()}.` : f;
}

/** « Mathis Nicolas ». */
export const fullName = (p: Names | null | undefined, fallback = "") => [clean(p?.first_name), clean(p?.last_name)].filter(Boolean).join(" ") || fallback;

/** Initiales pour l'avatar : « MN ». */
export function initials(p: Names | null | undefined, fallback = "?") {
  const s = `${clean(p?.first_name).charAt(0)}${clean(p?.last_name).charAt(0)}`.toUpperCase();
  return s || fallback.charAt(0).toUpperCase() || "?";
}
