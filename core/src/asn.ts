import { existsSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { Reader, type Response } from "mmdb-lib";
import { asnNumber, brandKey } from "./link.ts";

// Opérateur d'une IP : base IPinfo Lite (CC BY-SA 4.0, attribution « Données opérateur : IPinfo (CC BY-SA 4.0) »).
// Fichier MMDB en cache local, retéléchargé chaque semaine. Aucune requête réseau par mesure.
// Aucun filtre de pays : un opérateur inconnu garde son nom brut et son ASN.

type LiteRecord = { asn?: string; as_name?: string; as_domain?: string; country_code?: string };

/** `failed` : base IPinfo absente ou illisible pour une IP publique (la mesure sera reclassée plus tard). */
export type IpInfo = { operator: string | null; asn: number | null; asName: string | null; failed?: boolean };

const WEEK = 7 * 86_400_000;
// Antilles-Guyane + Saint-Barthélemy / Saint-Martin : marques « Caraïbe ».
const CARIBBEAN = new Set(["GP", "MQ", "GF", "BL", "MF"]);

/** Regroupe un AS sous la marque que connaissent les streamers (nom de l'organisation, puis pays). */
export function brand(r: LiteRecord | null): string | null {
  if (!r?.as_name && !r?.as_domain) return null;
  const raw = `${r.as_name ?? ""} ${r.as_domain ?? ""}`;
  const carib = CARIBBEAN.has(r.country_code ?? "") || /cara[iï]be|antilles|guyane/i.test(raw) ? " Caraïbe" : "";
  switch (brandKey(raw)) {
    case "orange":
      return `Orange${carib}`;
    case "digicel":
      return "Digicel";
    case "sfr":
      return `SFR${carib}`;
    case "free":
      return `Free${carib}`;
    case "dauphin":
      return "Dauphin Telecom";
    case "uts":
      return "UTS";
    case "canal":
      return "Canal+ Telecom";
    case "bouygues":
      return "Bouygues Telecom";
    case "starlink":
      return "Starlink";
  }
  return (r.as_name ?? r.as_domain ?? "").slice(0, 60) || null;
}

export function createAsn(opts: { file: string; token: string; log: (m: string) => void; fetchImpl?: typeof fetch }) {
  const { file, token, log } = opts;
  const fetchImpl = opts.fetchImpl ?? fetch;
  let reader: Reader<Response> | null = null;

  function load() {
    if (!existsSync(file)) return;
    try {
      reader = new Reader<Response>(readFileSync(file));
    } catch (e) {
      log(`base IPinfo illisible : ${(e as Error).message}`);
    }
  }

  /** Télécharge la base si elle manque ou a plus d'une semaine. */
  async function refresh() {
    if (!token) return;
    if (existsSync(file) && Date.now() - statSync(file).mtimeMs < WEEK) {
      if (!reader) load();
      return;
    }
    try {
      const res = await fetchImpl(`https://ipinfo.io/data/ipinfo_lite.mmdb?token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      new Reader<Response>(buf); // vérifie le fichier avant de remplacer l'ancien
      writeFileSync(`${file}.tmp`, buf);
      renameSync(`${file}.tmp`, file);
      reader = new Reader<Response>(buf);
      log(`base IPinfo Lite à jour (${Math.round(buf.length / 1e6)} Mo)`);
    } catch (e) {
      log(`téléchargement IPinfo impossible : ${(e as Error).message}`);
      if (!reader) load();
    }
  }

  function lookup(ip: string | undefined): IpInfo {
    if (!ip) return { operator: null, asn: null, asName: null };
    if (!reader) return { operator: null, asn: null, asName: null, failed: true };
    try {
      const r = reader.get(ip.replace(/^::ffff:/, "")) as LiteRecord | null;
      return { operator: brand(r), asn: asnNumber(r?.asn), asName: r?.as_name ?? null };
    } catch {
      return { operator: null, asn: null, asName: null, failed: true };
    }
  }

  load();
  return {
    refresh,
    lookup,
    /** Base chargée : les recherches peuvent aboutir. */
    ready: () => reader !== null,
    /** Pays (code ISO à 2 lettres) de cette IP, ou null. */
    country(ip: string | undefined): string | null {
      if (!reader || !ip) return null;
      try {
        return (reader.get(ip.replace(/^::ffff:/, "")) as LiteRecord | null)?.country_code ?? null;
      } catch {
        return null;
      }
    },
    /** Marque de l'opérateur de cette IP, ou null (base absente, IP privée…). */
    operator: (ip: string | undefined): string | null => lookup(ip).operator,
  };
}

export type Asn = ReturnType<typeof createAsn>;
