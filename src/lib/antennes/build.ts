// Carte des antennes : construction des fichiers par territoire à partir des données ouvertes de l'Arcep.
// Sources (Licence Ouverte) :
// - « Mon réseau mobile », sites fournissant un service mobile (trimestriel) : data.arcep.fr/mobile/sites/<AAAA_Tn>/
// - « Sites indisponibles » (quotidien) : arcep.s3.rbx.io.cloud.ovh.net/sites-indisponibles/all/<date>/raw<date>.geojson
// Aucune dépendance (ni Next, ni Supabase) : utilisable par la route cron et par un script local.

export const ARCEP_SITES = "https://data.arcep.fr/mobile/sites";
export const ARCEP_S3 = "https://arcep.s3.rbx.io.cloud.ovh.net";

export type TerritoryId = "971" | "972" | "973" | "974" | "976" | "977" | "978" | "metropole";

export const TERRITORIES: { id: TerritoryId; name: string; center: [number, number]; zoom: number }[] = [
  { id: "971", name: "Guadeloupe", center: [-61.55, 16.2], zoom: 8.6 },
  { id: "972", name: "Martinique", center: [-61.02, 14.64], zoom: 9.2 },
  { id: "973", name: "Guyane", center: [-53.1, 4.4], zoom: 6.4 },
  { id: "974", name: "La Réunion", center: [55.53, -21.13], zoom: 9 },
  { id: "976", name: "Mayotte", center: [45.14, -12.82], zoom: 10 },
  { id: "977", name: "Saint-Barthélemy", center: [-62.83, 17.9], zoom: 12 },
  { id: "978", name: "Saint-Martin", center: [-63.06, 18.07], zoom: 11.5 },
  { id: "metropole", name: "Métropole", center: [2.4, 46.6], zoom: 5 },
];

// Bits du champ « flags » d'un site.
export const TECH = { g2: 1, g3: 2, g4: 4, g5: 8 } as const;
export const BANDS_5G = [
  { bit: 16, label: "700 MHz", col: "site_5g_700_m_hz" },
  { bit: 32, label: "800 MHz", col: "site_5g_800_m_hz" },
  { bit: 64, label: "1800 MHz", col: "site_5g_1800_m_hz" },
  { bit: 128, label: "2100 MHz", col: "site_5g_2100_m_hz" },
  { bit: 256, label: "3500 MHz", col: "site_5g_3500_m_hz" },
] as const;

/** Statut d'un site : 0 en service, 1 maintenance, 2 incident, 3 non publié par l'Arcep pour cet opérateur. */
export type Status = 0 | 1 | 2 | 3;

/** Site : [longitude, latitude, index opérateur, statut, flags techno/bandes, index commune]. */
export type Site = [number, number, number, Status, number, number];

export type Outage = {
  reason: "INT" | "MAINT";
  detail: string | null;
  start: string | null;
  end: string | null;
  /** Services hors service (ex. « Data 4G », « Voix 2G »). */
  down: string[];
};

export type TerritoryFile = {
  v: 1;
  territory: TerritoryId;
  name: string;
  generatedAt: string;
  sitesQuarter: string; // ex. 2026_T2
  statusDate: string | null; // date du fichier « Sites indisponibles » utilisé
  operators: { name: string; statusPublished: boolean; count: number }[];
  communes: string[];
  sites: Site[];
  /** Indisponibilités, par index de site. */
  outages: Record<number, Outage>;
};

// ───────────── CSV ─────────────

/** Décode un fichier CSV Arcep (UTF-8 pour l'outre-mer, Latin-1 pour la métropole selon les trimestres). */
export function decodeCsv(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** CSV séparé par « ; » sans guillemets imbriqués (format Arcep). */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const head = lines[0].split(";");
  return lines.slice(1).map((l) => {
    const cells = l.split(";");
    const row: Record<string, string> = {};
    head.forEach((h, i) => (row[h] = (cells[i] ?? "").replace(/^"|"$/g, "")));
    return row;
  });
}

const num = (s: string) => Number(s.replace(",", "."));
const DROM = new Set(["971", "972", "973", "974", "976", "977", "978"]);

/** Territoire d'une ligne du fichier des sites. */
export function territoryOf(row: Record<string, string>): TerritoryId | null {
  // Codes départements parfois sans zéro de tête (« 6 » pour 06).
  const dep = (row.insee_dep ?? "").trim().replace(/^(\d)$/, "0$1");
  if (DROM.has(dep)) return dep as TerritoryId;
  if (/^(\d{2}|2A|2B)$/.test(dep)) return "metropole";
  return null;
}

// ───────────── Sites indisponibles ─────────────

type OutageFeature = { properties: Record<string, string | number | null> };

const SERVICES: [string, string][] = [
  ["voix2g", "Voix 2G"],
  ["voix3g", "Voix 3G"],
  ["voix4g", "Voix 4G"],
  ["data3g", "Data 3G"],
  ["data4g", "Data 4G"],
  ["data5g", "Data 5G"],
];

/** Numéro de station ANFR comparable entre fichiers (zéros de tête présents ou non selon la source). */
export const stationKey = (s: unknown) => String(s ?? "").trim().replace(/^0+/, "");

/** Index station ANFR → indisponibilité. Les lignes sans numéro de station ne peuvent pas être placées. */
export function indexOutages(features: OutageFeature[]) {
  const byStation = new Map<string, Outage>();
  for (const f of features) {
    const p = f.properties;
    const station = stationKey(p.station_anfr);
    if (!station) continue;
    byStation.set(station, {
      reason: p.raison === "MAINT" ? "MAINT" : "INT",
      detail: (p.detail as string) || null,
      start: (p.debut as string) || null,
      end: (p.fin as string) || null,
      down: SERVICES.filter(([k]) => p[k] === "HS").map(([, label]) => label),
    });
  }
  return byStation;
}

/** Opérateurs dont l'Arcep publie les indisponibilités (les 4 opérateurs nationaux, en métropole). */
export function statusPublished(territory: TerritoryId, operator: string) {
  return territory === "metropole" && ["Orange", "SFR", "Bouygues Telecom", "Free Mobile"].includes(operator);
}

// ───────────── Construction ─────────────

export function buildTerritories(
  rows: Record<string, string>[],
  outages: Map<string, Outage>,
  meta: { sitesQuarter: string; statusDate: string | null; generatedAt?: string },
): TerritoryFile[] {
  const files = new Map<TerritoryId, TerritoryFile & { opIndex: Map<string, number>; comIndex: Map<string, number> }>();
  for (const t of TERRITORIES) {
    files.set(t.id, {
      v: 1,
      territory: t.id,
      name: t.name,
      generatedAt: meta.generatedAt ?? new Date().toISOString(),
      sitesQuarter: meta.sitesQuarter,
      statusDate: meta.statusDate,
      operators: [],
      communes: [],
      sites: [],
      outages: {},
      opIndex: new Map(),
      comIndex: new Map(),
    });
  }

  for (const r of rows) {
    const t = territoryOf(r);
    if (!t) continue;
    const lon = num(r.longitude);
    const lat = num(r.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    const f = files.get(t)!;

    const opName = r.nom_op.trim();
    let op = f.opIndex.get(opName);
    if (op === undefined) {
      op = f.operators.length;
      f.opIndex.set(opName, op);
      f.operators.push({ name: opName, statusPublished: statusPublished(t, opName), count: 0 });
    }
    f.operators[op].count++;

    const com = (r.nom_com ?? "").trim();
    let ci = f.comIndex.get(com);
    if (ci === undefined) {
      ci = f.communes.length;
      f.comIndex.set(com, ci);
      f.communes.push(com);
    }

    let flags = 0;
    if (r.site_2g === "1") flags |= TECH.g2;
    if (r.site_3g === "1") flags |= TECH.g3;
    if (r.site_4g === "1") flags |= TECH.g4;
    if (r.site_5g === "1") flags |= TECH.g5;
    for (const b of BANDS_5G) if (r[b.col] === "1") flags |= b.bit;

    let status: Status = f.operators[op].statusPublished ? 0 : 3;
    const out = outages.get(stationKey(r.id_station_anfr));
    if (out && f.operators[op].statusPublished) {
      status = out.reason === "MAINT" ? 1 : 2;
      f.outages[f.sites.length] = out;
    }
    f.sites.push([Math.round(lon * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5, op, status, flags, ci]);
  }

  return [...files.values()].map((f): TerritoryFile => ({
    v: f.v,
    territory: f.territory,
    name: f.name,
    generatedAt: f.generatedAt,
    sitesQuarter: f.sitesQuarter,
    statusDate: f.statusDate,
    operators: f.operators,
    communes: f.communes,
    sites: f.sites,
    outages: f.outages,
  }));
}

// ───────────── Téléchargement ─────────────

/** Dernier trimestre publié (ex. « 2026_T2 »), lu dans l'index du dossier des sites. */
export async function latestQuarter(fetchImpl: typeof fetch = fetch) {
  const html = await (await fetchImpl(`${ARCEP_SITES}/`)).text();
  const all = [...html.matchAll(/href="(20\d{2}_T[1-4])\/index\.html"/g)].map((m) => m[1]).sort();
  if (!all.length) throw new Error("Arcep : aucun trimestre trouvé");
  return all[all.length - 1];
}

export async function downloadSites(quarter: string, fetchImpl: typeof fetch = fetch) {
  const rows: Record<string, string>[] = [];
  for (const part of ["Metropole", "Outremer"]) {
    const res = await fetchImpl(`${ARCEP_S3}/mobile/sites/${quarter}/${quarter}_sites_${part}.csv`);
    if (!res.ok) throw new Error(`Arcep sites ${part} : HTTP ${res.status}`);
    for (const row of parseCsv(decodeCsv(await res.arrayBuffer()))) rows.push(row); // pas de push(...) : 125 000 lignes
  }
  return rows;
}

/** Indisponibilités du jour (ou de la veille si le fichier du jour n'est pas encore publié). */
export async function downloadOutages(today = new Date(), fetchImpl: typeof fetch = fetch) {
  for (let i = 0; i < 3; i++) {
    const d = new Date(today.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    const res = await fetchImpl(`${ARCEP_S3}/sites-indisponibles/all/${d}/raw${d}.geojson`);
    if (res.ok) return { date: d, features: ((await res.json()) as { features: OutageFeature[] }).features };
  }
  return { date: null, features: [] as OutageFeature[] };
}

/** Pipeline complet : renvoie un fichier par territoire. */
export async function buildAll(fetchImpl: typeof fetch = fetch) {
  const quarter = await latestQuarter(fetchImpl);
  const [rows, outages] = await Promise.all([downloadSites(quarter, fetchImpl), downloadOutages(new Date(), fetchImpl)]);
  return buildTerritories(rows, indexOutages(outages.features), { sitesQuarter: quarter, statusDate: outages.date });
}
