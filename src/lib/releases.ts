// Numéros de version des notes de version : majeur.mineur.correctif, incrémentés automatiquement.

export type Version = { major: number; minor: number; patch: number };
export type Bump = "patch" | "minor" | "major";

export const BUMPS: { id: Bump; label: string; hint: string }[] = [
  { id: "patch", label: "Correctif", hint: "petits ajustements et corrections" },
  { id: "minor", label: "Nouveauté", hint: "nouvelle fonction" },
  { id: "major", label: "Majeure", hint: "grosse évolution" },
];

/** Version suivante : majeure remet mineur et correctif à 0, mineure remet le correctif à 0. Sans version précédente, part de 0.0.0. */
export function nextVersion(latest: Version | null, bump: Bump): Version {
  const v = latest ?? { major: 0, minor: 0, patch: 0 };
  if (bump === "major") return { major: v.major + 1, minor: 0, patch: 0 };
  if (bump === "minor") return { major: v.major, minor: v.minor + 1, patch: 0 };
  return { major: v.major, minor: v.minor, patch: v.patch + 1 };
}

export const formatVersion = (v: Version) => `${v.major}.${v.minor}.${v.patch}`;
