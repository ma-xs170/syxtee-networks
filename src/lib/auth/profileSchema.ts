import { z } from "zod";

// Validation du profil (/bienvenue et /compte). Mêmes règles que les contraintes SQL de public.profiles.

const handle = (re: RegExp, label: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, ""))
    .refine((v) => v === "" || re.test(v), `Pseudo ${label} invalide.`)
    .transform((v) => (v === "" ? null : v));

/** Prénom ou nom : 1 à 50 caractères après trim, lettres (accents compris), espaces, tirets, apostrophes. Casse conservée. */
export const personName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} obligatoire.`)
    .max(50, `${label} : 50 caractères maximum.`)
    .regex(/^[\p{L}\p{M}' ’-]+$/u, `${label} invalide : lettres, espaces, tirets et apostrophes uniquement.`)
    .refine((v) => /\p{L}/u.test(v), `${label} invalide : au moins une lettre.`);

const name = personName;

/** Prénom + nom (inscription, modale des comptes existants, profil). */
export const namesSchema = z.object({ first_name: name("Prénom"), last_name: name("Nom") });

export const profileSchema = z.object({
  bio: z
    .string()
    .trim()
    .max(160, "Bio : 160 caractères maximum.")
    .transform((v) => (v === "" ? null : v)),
  country: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[A-Z]{2}$/.test(v), "Pays invalide.")
    .transform((v) => (v === "" ? null : v)),
  twitch: handle(/^[A-Za-z0-9_]{3,25}$/, "Twitch"),
  kick: handle(/^[A-Za-z0-9_]{3,25}$/, "Kick"),
  youtube: handle(/^[A-Za-z0-9._-]{3,30}$/, "YouTube"),
  tiktok: handle(/^[A-Za-z0-9._]{2,24}$/, "TikTok"),
  instagram: handle(/^[A-Za-z0-9._]{1,30}$/, "Instagram"),
  x: handle(/^[A-Za-z0-9_]{1,15}$/, "X"),
  show_on_site: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  show_first_name: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export { COUNTRIES } from "@/lib/countries";
