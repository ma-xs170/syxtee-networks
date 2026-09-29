import { createHmac } from "node:crypto";

// Type de lien d'une mesure : seul le réseau mobile (4G/5G) alimente la carte publique.
// Signaux, du plus fiable au moins fiable :
//   a) navigator.connection.type du téléphone (Chrome Android) : 'cellular' / 'wifi' ;
//   b) classe de l'ASN de l'IP (table ci-dessous, maintenue à la main) ;
//   c) préfixes IP (/24 en IPv4, /48 en IPv6) déjà vus depuis un Android en 'cellular' ou en 'wifi' ;
//   d) iPhone : l'IP a changé depuis l'ouverture de la page après « Coupe le Wi-Fi » (switched).
//   e) opérateur déclaré par le compte (iPhone), comparé à la marque de l'ASN.
// Une box fibre/ADSL ('fixed') compte comme du Wi-Fi. Le Relais privé iCloud (IP de sortie Apple, Cloudflare,
// Akamai, Fastly) masque l'opérateur : seule la déclaration permet alors de compter la mesure.

export type LinkType = "cellular" | "wifi" | "starlink" | "fixed" | "unknown";
export type AsnClass = "mobile" | "fixed" | "satellite" | "mixed";
export type PrefixStat = { cellular: number; wifi: number };
/** Étiquettes d'une mesure (colonne measurements.tags). */
export type Tag = "private_relay" | "declared" | "declared_mismatch" | "pending" | "asn_inferred";
export type LinkClass = { link_type: LinkType; conf: number; tags?: Tag[] };
/** Opérateur mobile déclaré par le compte (profiles.mobile_operator). */
export type Declared = "orange" | "sfr" | "digicel" | "free" | "other";
export const DECLARED: Declared[] = ["orange", "sfr", "digicel", "free", "other"];

/** Confiance minimale pour qu'une mesure 'cellular' compte sur la carte 4G/5G. */
export const MIN_CONF = 0.7;

// ASN → classe. Un opérateur qui fait fixe ET mobile sous le même ASN est « mixed » : on passe aux préfixes appris.
export const ASN_CLASSES: Record<number, AsnClass> = {
  14593: "satellite", // SpaceX Starlink
  51207: "mobile", // Free Mobile
  12322: "fixed", // Free (Proxad), box
  3215: "mixed", // Orange France
  15557: "mixed", // SFR
  5410: "mixed", // Bouygues Telecom
  3320: "mixed", // Deutsche Telekom
  21928: "mobile", // T-Mobile USA
  22394: "mobile", // Verizon Wireless
  7922: "fixed", // Comcast
  // Antilles, Guyane, Saint-Martin, Saint-Barthélemy (vérifiés dans RIPE / ARIN le 29/09/2026).
  16028: "mobile", // Orange Caraïbe (France Caraïbe Mobiles, « Orange Caraîbe Mobiles Network »)
  48252: "mixed", // Digicel Antilles Françaises Guyane
  20776: "mixed", // Outremer Telecom : SFR Caraïbe (mobile + box)
  210595: "mixed", // Free Caraïbe (Free SAS)
  33392: "mixed", // Dauphin Telecom (Saint-Martin, Saint-Barthélemy)
  36511: "mixed", // Dauphin Telecom Guadeloupe
  11081: "mixed", // UTS (Chippie), Saint-Martin partie hollandaise
  21351: "fixed", // Canal+ Telecom (ex-Mediaserv) : box seulement
};

/** ASN des sorties du Relais privé iCloud et de « Limiter le suivi de l'adresse IP » : l'opérateur réel est masqué. */
export const RELAY_ASNS = new Set([
  714, 6185, // Apple
  13335, 209242, // Cloudflare
  20940, 16625, 36183, // Akamai (36183 : Akamai Private Relay)
  54113, // Fastly
]);

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Marque (clé) d'un nom d'opérateur ou d'organisation : « Orange Caraibe », « Outremer Telecom »… */
export function brandKey(name: string | null | undefined): Exclude<Declared, "other"> | "bouygues" | "dauphin" | "uts" | "canal" | "starlink" | null {
  const s = fold(name ?? "");
  if (!s) return null;
  if (/orange|france telecom|\bfcm\b/.test(s)) return "orange";
  if (/digicel/.test(s)) return "digicel";
  if (/\bsfr\b|sfr\.|outremer|\bonly\b/.test(s)) return "sfr";
  if (/free|iliad|proxad|telco oi/.test(s)) return "free";
  if (/dauphin/.test(s)) return "dauphin";
  if (/\buts\b|chippie|united telecommunication/.test(s)) return "uts";
  if (/canal ?\+|canalplus|mediaserv/.test(s)) return "canal";
  if (/bouygues/.test(s)) return "bouygues";
  if (/starlink|spacex/.test(s)) return "starlink";
  return null;
}

/** Nom affiché d'une marque déclarée, avec « Caraïbe » aux Antilles-Guyane. */
export function declaredName(d: Declared | null | undefined, caribbean: boolean): string | null {
  if (!d || d === "other") return null;
  if (d === "digicel") return "Digicel";
  const n = { orange: "Orange", sfr: "SFR", free: "Free" }[d];
  return caribbean ? `${n} Caraïbe` : n;
}

/** Position aux Antilles françaises, Saint-Martin, Saint-Barthélemy ou en Guyane. */
export const isCaribbean = (lat: number | null | undefined, lng: number | null | undefined) =>
  lat != null && lng != null && ((lat >= 14.3 && lat <= 18.2 && lng >= -63.3 && lng <= -60.7) || (lat >= 2 && lat <= 6 && lng >= -54.7 && lng <= -51.5));

/** Classe d'un ASN : table, sinon indices dans le nom (mobile / satellite / câble…), sinon null (inconnu). */
export function asnClass(asn: number | null, name: string | null): AsnClass | null {
  if (asn !== null && ASN_CLASSES[asn]) return ASN_CLASSES[asn];
  const s = (name ?? "").toLowerCase();
  if (!s) return null;
  if (/starlink|spacex|oneweb|viasat|hughes/.test(s)) return "satellite";
  if (/\bmobile\b|wireless|cellular|\bgsm\b|\blte\b/.test(s)) return "mobile";
  if (/\bcable\b|fib(re|er)|broadband|\bdsl\b|\bftth\b/.test(s)) return "fixed";
  return null;
}

/** Numéro d'ASN depuis « AS14593 » (IPinfo) ou un nombre. */
export const asnNumber = (v: string | number | null | undefined) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/^AS/i, ""));
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Préfixe d'apprentissage : /24 en IPv4, /48 en IPv6. null pour une IP privée ou illisible. */
export function ipPrefix(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const v = ip.replace(/^::ffff:/i, "");
  const v4 = v.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b, c] = v4.slice(1, 4).map(Number);
    if (a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 100 && b >= 64 && b <= 127)) return null;
    return `${a}.${b}.${c}.0/24`;
  }
  if (!v.includes(":")) return null;
  const [head, tail = ""] = v.split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  if (!v.includes("::") && h.length !== 8) return null;
  const groups = [...h, ...Array(8 - h.length - t.length).fill("0"), ...t];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) return null;
  const first = parseInt(groups[0], 16);
  if ((first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || v === "::1") return null;
  return `${groups.slice(0, 3).map((g) => parseInt(g, 16).toString(16)).join(":")}::/48`;
}

/** Jeton opaque du réseau (préfixe IP) : l'iPhone le renvoie pour qu'on voie s'il a changé de réseau. */
export const netToken = (salt: string, prefix: string | null) => (prefix ? createHmac("sha256", salt).update(`net:${prefix}`).digest("base64url").slice(0, 16) : "");

/** Classement d'une mesure.
 * `device` = navigator.connection.type ; `switched` = IP changée après « Coupe le Wi-Fi » ;
 * `relay` = IP de sortie du Relais privé iCloud ; `pending` = base IPinfo indisponible (reclassé plus tard) ;
 * `declared` = opérateur déclaré par le compte ; `operator` = marque de l'ASN (pour la comparer à la déclaration). */
export function classify(s: {
  device?: string | null;
  asn?: number | null;
  asName?: string | null;
  operator?: string | null;
  prefix?: PrefixStat | null;
  switched?: boolean;
  relay?: boolean;
  pending?: boolean;
  declared?: Declared | null;
}): LinkClass {
  const cls = asnClass(s.asn ?? null, s.asName ?? null);
  const declared = s.declared && s.declared !== "other" ? s.declared : null;
  // a) Signal de l'appareil : prioritaire.
  if (s.device === "cellular") return { link_type: "cellular", conf: 0.95 };
  if (s.device === "wifi" || s.device === "ethernet") return { link_type: cls === "satellite" ? "starlink" : "wifi", conf: 0.95 };
  // Relais privé iCloud : l'IP est celle d'Apple / Cloudflare / Akamai / Fastly. Seule la déclaration tranche.
  if (s.relay || (s.asn != null && RELAY_ASNS.has(s.asn))) {
    return declared ? { link_type: "cellular", conf: 0.75, tags: ["private_relay", "declared"] } : { link_type: "unknown", conf: 0.2, tags: ["private_relay"] };
  }
  // Base IPinfo absente : on ne conclut rien, la mesure sera reclassée.
  if (s.pending) return { link_type: "unknown", conf: 0.2, tags: ["pending"] };
  // b) ASN.
  if (cls === "satellite") return { link_type: "starlink", conf: 0.9 };
  if (cls === "fixed") return { link_type: "fixed", conf: 0.85 };
  const brand = brandKey(s.operator ?? s.asName);
  const agrees = !!declared && brand === declared;
  const contradicts = !!declared && !!brand && brand !== declared;
  if (cls === "mobile") return agrees ? { link_type: "cellular", conf: 0.9, tags: ["declared"] } : { link_type: "cellular", conf: 0.85 };
  // c) Préfixe appris depuis les Android.
  const p = s.prefix;
  const n = p ? p.cellular + p.wifi : 0;
  if (p && n >= 3) {
    const share = p.cellular / n;
    const conf = Math.round(Math.min(0.9, 0.7 + n * 0.02) * 100) / 100;
    if (share >= 0.8) return { link_type: "cellular", conf };
    if (share <= 0.2) return { link_type: "fixed", conf };
  }
  // e) Opérateur déclaré : même marque → mobile ; autre marque sur un ASN mixte → box d'un autre opérateur (Wi-Fi).
  if (agrees) return { link_type: "cellular", conf: 0.9, tags: ["declared"] };
  if (contradicts) return { link_type: "fixed", conf: 0.8, tags: ["declared_mismatch"] };
  // d) iPhone : réseau changé après avoir coupé le Wi-Fi, sur un ASN mixte ou inconnu.
  if (s.switched) return { link_type: "cellular", conf: 0.75 };
  // ASN inconnu (ni mobile, ni fixe connu) : la déclaration compte, avec une confiance moindre.
  if (declared && cls === null) return { link_type: "cellular", conf: 0.75, tags: ["declared"] };
  return { link_type: "unknown", conf: cls === "mixed" ? 0.4 : 0.2 };
}

/** Compte une mesure dans la carte 4G/5G ? */
export const countsOnMap = (c: LinkClass) => c.link_type === "cellular" && c.conf >= MIN_CONF;

export type PrefixDb = {
  load(): Promise<{ prefix: string; cellular: number; wifi: number }[]>;
  save(rows: { prefix: string; cellular: number; wifi: number }[]): Promise<void>;
};

/** Table ip_prefix_class : gardée en mémoire, apprise en continu depuis les Android, écrite périodiquement. */
export function createPrefixes(db?: PrefixDb, log: (m: string) => void = () => {}) {
  const map = new Map<string, PrefixStat>();
  const dirty = new Set<string>();
  return {
    async load() {
      if (!db) return;
      try {
        for (const r of await db.load()) map.set(r.prefix, { cellular: r.cellular, wifi: r.wifi });
      } catch (e) {
        log(`préfixes IP illisibles : ${(e as Error).message}`);
      }
    },
    get: (prefix: string | null) => (prefix ? (map.get(prefix) ?? null) : null),
    /** Seul navigator.connection.type (Android) enseigne un préfixe. */
    learn(prefix: string | null, device: string | null | undefined) {
      if (!prefix || (device !== "cellular" && device !== "wifi" && device !== "ethernet")) return;
      const s = map.get(prefix) ?? { cellular: 0, wifi: 0 };
      if (device === "cellular") s.cellular++;
      else s.wifi++;
      map.set(prefix, s);
      dirty.add(prefix);
    },
    async flush() {
      if (!db || !dirty.size) return;
      const rows = [...dirty].map((prefix) => ({ prefix, ...map.get(prefix)! }));
      dirty.clear();
      try {
        await db.save(rows);
      } catch (e) {
        log(`préfixes IP : écriture impossible (${(e as Error).message})`);
        rows.forEach((r) => dirty.add(r.prefix));
      }
    },
  };
}

export type Prefixes = ReturnType<typeof createPrefixes>;
