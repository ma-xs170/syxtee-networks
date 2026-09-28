import { createHmac } from "node:crypto";

// Type de lien d'une mesure : seul le réseau mobile (4G/5G) alimente la carte publique.
// Signaux, du plus fiable au moins fiable :
//   a) navigator.connection.type du téléphone (Chrome Android) : 'cellular' / 'wifi' ;
//   b) classe de l'ASN de l'IP (table ci-dessous, maintenue à la main) ;
//   c) préfixes IP (/24 en IPv4, /48 en IPv6) déjà vus depuis un Android en 'cellular' ou en 'wifi' ;
//   d) iPhone : l'IP a changé depuis l'ouverture de la page après « Coupe le Wi-Fi » (switched).
// Une box fibre/ADSL ('fixed') compte comme du Wi-Fi.

export type LinkType = "cellular" | "wifi" | "starlink" | "fixed" | "unknown";
export type AsnClass = "mobile" | "fixed" | "satellite" | "mixed";
export type PrefixStat = { cellular: number; wifi: number };
export type LinkClass = { link_type: LinkType; conf: number };

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
};

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

/** Classement d'une mesure. `device` = navigator.connection.type ; `switched` = IP changée après « Coupe le Wi-Fi ». */
export function classify(s: { device?: string | null; asn?: number | null; asName?: string | null; prefix?: PrefixStat | null; switched?: boolean }): LinkClass {
  const cls = asnClass(s.asn ?? null, s.asName ?? null);
  // a) Signal de l'appareil : prioritaire.
  if (s.device === "cellular") return { link_type: "cellular", conf: 0.95 };
  if (s.device === "wifi" || s.device === "ethernet") return { link_type: cls === "satellite" ? "starlink" : "wifi", conf: 0.95 };
  // b) ASN.
  if (cls === "satellite") return { link_type: "starlink", conf: 0.9 };
  if (cls === "fixed") return { link_type: "fixed", conf: 0.85 };
  if (cls === "mobile") return { link_type: "cellular", conf: 0.85 };
  // c) Préfixe appris depuis les Android.
  const p = s.prefix;
  const n = p ? p.cellular + p.wifi : 0;
  if (p && n >= 3) {
    const share = p.cellular / n;
    const conf = Math.round(Math.min(0.9, 0.7 + n * 0.02) * 100) / 100;
    if (share >= 0.8) return { link_type: "cellular", conf };
    if (share <= 0.2) return { link_type: "fixed", conf };
  }
  // d) iPhone : réseau changé après avoir coupé le Wi-Fi, sur un ASN mixte ou inconnu.
  if (s.switched) return { link_type: "cellular", conf: 0.75 };
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
