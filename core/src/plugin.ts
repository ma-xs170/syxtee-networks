import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Plugin OBS SYXTEE : dernière version publiée. Les installeurs sont posés dans DATA_DIR/downloads (servis par /dl/),
// avec un manifeste manifest.json écrit par `npm run plugin` (link/scripts/build-plugin.mjs).
//   { "version": "0.4.0", "released_at": "2026-10-07T10:00:00Z", "notes": ["…"],
//     "mac": { "file": "SYXTEE-Link-mac.pkg", "sha256": "…" }, "windows": { "file": "SYXTEE-Link-windows.exe", "sha256": "…", "beta": true } }

export type PluginFile = { available: boolean; url: string | null; size: number | null; sha256: string | null; beta: boolean };
export type PluginLatest = {
  version: string;
  released_at: string | null;
  notes: string[];
  macos: PluginFile;
  windows: PluginFile;
  linux: PluginFile;
};

const NONE: PluginFile = { available: false, url: null, size: null, sha256: null, beta: false };
const FILES = { mac: /^SYXTEE-Link-mac\.pkg$/, windows: /^SYXTEE-Link-windows\.exe$/ } as const;

/** Version « x.y.z » (chiffres seulement), sinon vide : le manifeste vient d'un fichier posé à la main, on ne lui fait pas confiance. */
const clean = (v: unknown) => (typeof v === "string" && /^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(v) ? v : "");

/** Compare deux versions « x.y.z » : négatif si a < b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

export function readLatest(dataDir: string): PluginLatest | null {
  const dir = join(dataDir, "downloads");
  let m: { version?: unknown; released_at?: unknown; notes?: unknown; mac?: Record<string, unknown>; windows?: Record<string, unknown> };
  try {
    m = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  } catch {
    return null;
  }
  const version = clean(m.version);
  if (!version) return null;
  const file = (entry: Record<string, unknown> | undefined, key: keyof typeof FILES): PluginFile => {
    const name = typeof entry?.file === "string" ? entry.file : "";
    if (!FILES[key].test(name) || !existsSync(join(dir, name))) return NONE;
    const sha = typeof entry?.sha256 === "string" && /^[0-9a-f]{64}$/.test(entry.sha256) ? entry.sha256 : null;
    return { available: true, url: `/dl/${name}`, size: statSync(join(dir, name)).size, sha256: sha, beta: entry?.beta === true };
  };
  return {
    version,
    released_at: typeof m.released_at === "string" && !Number.isNaN(Date.parse(m.released_at)) ? m.released_at : null,
    notes: Array.isArray(m.notes) ? m.notes.filter((n): n is string => typeof n === "string").map((n) => n.slice(0, 200)).slice(0, 12) : [],
    macos: file(m.mac, "mac"),
    windows: file(m.windows, "windows"),
    linux: NONE,
  };
}
