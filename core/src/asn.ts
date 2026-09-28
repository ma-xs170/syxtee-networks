import { existsSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { Reader, type Response } from "mmdb-lib";
import { asnNumber } from "./link.ts";

// Opérateur d'une IP : base IPinfo Lite (CC BY-SA 4.0, attribution « Données opérateur : IPinfo (CC BY-SA 4.0) »).
// Fichier MMDB en cache local, retéléchargé chaque semaine. Aucune requête réseau par mesure.
// Aucun filtre de pays : un opérateur inconnu garde son nom brut et son ASN.

type LiteRecord = { asn?: string; as_name?: string; as_domain?: string; country_code?: string };

export type IpInfo = { operator: string | null; asn: number | null; asName: string | null };

const WEEK = 7 * 86_400_000;
// Antilles-Guyane + Saint-Barthélemy / Saint-Martin : marques « Caraïbe ».
const CARIBBEAN = new Set(["GP", "MQ", "GF", "BL", "MF"]);

/** Regroupe un AS sous la marque que connaissent les streamers. */
export function brand(r: LiteRecord | null): string | null {
  if (!r?.as_name && !r?.as_domain) return null;
  const s = `${r.as_name ?? ""} ${r.as_domain ?? ""}`.toLowerCase();
  const carib = CARIBBEAN.has(r.country_code ?? "") ? " Caraïbe" : "";
  if (/orange|france telecom/.test(s)) return `Orange${carib}`;
  if (/digicel/.test(s)) return "Digicel";
  if (/\bsfr\b|sfr\.|outremer telecom/.test(s)) return `SFR${carib}`;
  if (/free|iliad|proxad/.test(s)) return `Free${carib}`;
  if (/bouygues/.test(s)) return "Bouygues Telecom";
  if (/starlink|spacex/.test(s)) return "Starlink";
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
    if (!reader || !ip) return { operator: null, asn: null, asName: null };
    try {
      const r = reader.get(ip.replace(/^::ffff:/, "")) as LiteRecord | null;
      return { operator: brand(r), asn: asnNumber(r?.asn), asName: r?.as_name ?? null };
    } catch {
      return { operator: null, asn: null, asName: null };
    }
  }

  load();
  return {
    refresh,
    lookup,
    /** Marque de l'opérateur de cette IP, ou null (base absente, IP privée…). */
    operator: (ip: string | undefined): string | null => lookup(ip).operator,
  };
}

export type Asn = ReturnType<typeof createAsn>;
