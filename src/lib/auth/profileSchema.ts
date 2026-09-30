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
  kick: handle(/^[A-Za-z0-9_]{3,25}$/, "Kick"),
  youtube: handle(/^[A-Za-z0-9._-]{3,30}$/, "YouTube"),
  tiktok: handle(/^[A-Za-z0-9._]{2,24}$/, "TikTok"),
  instagram: handle(/^[A-Za-z0-9._]{1,30}$/, "Instagram"),
  x: handle(/^[A-Za-z0-9_]{1,15}$/, "X"),
  show_on_site: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  show_first_name: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Codes pays ISO 3166-1 alpha-2 (noms affichés via Intl.DisplayNames). */
export const COUNTRIES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );
