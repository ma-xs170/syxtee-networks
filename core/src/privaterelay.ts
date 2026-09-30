import { existsSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";

// Relais privé iCloud (et « Limiter le suivi de l'adresse IP ») : l'iPhone sort par une IP d'Apple, de Cloudflare,
// d'Akamai ou de Fastly, et l'opérateur réel est masqué. Liste officielle des IP de sortie, publiée par Apple :
// https://mask-api.icloud.com/egress-ip-ranges.csv (~12 Mo, ~285 000 blocs), retéléchargée chaque jour et gardée
// en cache dans data/. En mémoire : blocs fusionnés (~7 000 intervalles), recherche par dichotomie.

export const EGRESS_URL = "https://mask-api.icloud.com/egress-ip-ranges.csv";
const DAY = 86_400_000;

type Range4 = [number, number];
type Range6 = [bigint, bigint];

/** IPv4 en entier, ou null. */
export function v4(ip: string): number | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const p = m.slice(1).map(Number);
  return p.some((x) => x > 255) ? null : ((p[0] * 256 + p[1]) * 256 + p[2]) * 256 + p[3];
}

/** IPv6 en entier 128 bits, ou null. */
export function v6(ip: string): bigint | null {
  if (!ip.includes(":")) return null;
  const [head, tail = ""] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  if (!ip.includes("::") && h.length !== 8) return null;
  const g = [...h, ...Array(8 - h.length - t.length).fill("0"), ...t];
  if (g.length !== 8 || g.some((x) => !/^[0-9a-f]{1,4}$/i.test(x))) return null;
  return g.reduce((a, x) => (a << 16n) | BigInt(parseInt(x, 16)), 0n);
}

function merge<T extends number | bigint>(list: [T, T][], succ: (x: T) => T): [T, T][] {
  list.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const out: [T, T][] = [];
  for (const r of list) {
    const last = out[out.length - 1];
    if (last && r[0] <= succ(last[1])) {
      if (r[1] > last[1]) last[1] = r[1];
    } else out.push([r[0], r[1]]);
  }
  return out;
}

/** Lit le CSV d'Apple (« préfixe,pays,région,ville, ») en intervalles fusionnés. */
export function parseEgress(csv: string) {
  const a4: Range4[] = [];
  const a6: Range6[] = [];
  for (const line of csv.split("\n")) {
    const cidr = line.split(",", 1)[0]?.trim();
    if (!cidr) continue;
    const [ip, lenS] = cidr.split("/");
    const len = Number(lenS);
    const n4 = v4(ip);
    if (n4 !== null && len >= 0 && len <= 32) {
      const start = n4 - (n4 % 2 ** (32 - len));
      a4.push([start, start + 2 ** (32 - len) - 1]);
      continue;
    }
    const n6 = v6(ip);
    if (n6 !== null && len >= 0 && len <= 128) {
      const size = 1n << BigInt(128 - len);
      const start = n6 - (n6 % size);
      a6.push([start, start + size - 1n]);
    }
  }
  return { v4: merge(a4, (x) => x + 1), v6: merge(a6, (x) => x + 1n) };
}

function inRanges<T extends number | bigint>(ranges: [T, T][], x: T) {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [a, b] = ranges[mid];
    if (x < a) hi = mid - 1;
    else if (x > b) lo = mid + 1;
    else return true;
  }
  return false;
}

export type Egress = ReturnType<typeof parseEgress>;

export function createPrivateRelay(opts: { file: string; log: (m: string) => void; fetchImpl?: typeof fetch }) {
  const { file, log } = opts;
  const fetchImpl = opts.fetchImpl ?? fetch;
  let ranges: Egress | null = null;

  function load() {
    if (!existsSync(file)) return;
    try {
      ranges = parseEgress(readFileSync(file, "utf8"));
    } catch (e) {
      log(`liste Relais privé illisible : ${(e as Error).message}`);
    }
  }

  /** Télécharge la liste si elle manque ou a plus d'un jour. */
  async function refresh() {
    if (existsSync(file) && Date.now() - statSync(file).mtimeMs < DAY) {
      if (!ranges) load();
      return;
    }
    try {
      const res = await fetchImpl(EGRESS_URL, { signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csv = await res.text();
      const parsed = parseEgress(csv);
      if (parsed.v4.length + parsed.v6.length < 100) throw new Error("liste vide ou tronquée");
      writeFileSync(`${file}.tmp`, csv);
      renameSync(`${file}.tmp`, file);
      ranges = parsed;
      log(`Relais privé iCloud : ${parsed.v4.length + parsed.v6.length} plages de sortie`);
    } catch (e) {
      log(`téléchargement de la liste Relais privé impossible : ${(e as Error).message}`);
      if (!ranges) load();
    }
  }

  load();
  return {
    refresh,
    /** Cette IP est-elle une sortie du Relais privé iCloud ? */
    has(ip: string | null | undefined) {
      if (!ranges || !ip) return false;
      const s = ip.replace(/^::ffff:/i, "");
      const n4 = v4(s);
      if (n4 !== null) return inRanges(ranges.v4, n4);
      const n6 = v6(s);
      return n6 !== null && inRanges(ranges.v6, n6);
    },
    ready: () => ranges !== null,
  };
}

export type PrivateRelay = ReturnType<typeof createPrivateRelay>;
