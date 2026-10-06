// Plugin OBS SYXTEE : version publiée (manifeste du Core), état « à jour » d'un poste, système du visiteur. Utilisable côté serveur et client.

export type PluginFile = { available: boolean; url: string | null; size: number | null; sha256: string | null; beta: boolean };
export type PluginLatest = { version: string; released_at: string | null; notes: string[]; macos: PluginFile; windows: PluginFile; linux: PluginFile };
export type OsId = "macos" | "windows" | "linux";

export const OS_LABEL: Record<OsId, string> = { macos: "macOS", windows: "Windows", linux: "Linux" };

/** Compare deux versions « x.y.z » : négatif si a < b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

/** « à jour » / « mise à jour disponible » / inconnu (poste jamais connecté depuis la version à version suivie, ou rien de publié). */
export function pluginState(version: string | null | undefined, latest: PluginLatest | null): "ok" | "outdated" | "unknown" {
  if (!version || !latest) return "unknown";
  return compareVersions(version, latest.version) < 0 ? "outdated" : "ok";
}

/** Système du visiteur d'après son navigateur. */
export function detectOs(ua: string, platform = ""): OsId | null {
  const s = `${ua} ${platform}`.toLowerCase();
  if (/iphone|ipad|ipod|android/.test(s)) return null; // pas d'OBS sur téléphone
  if (/win/.test(s)) return "windows";
  if (/mac/.test(s)) return "macos";
  if (/linux|x11|cros/.test(s)) return "linux";
  return null;
}

export function fmtMo(bytes: number | null | undefined): string {
  if (!bytes) return "";
  return `${(bytes / 1024 / 1024).toFixed(bytes > 100 * 1024 * 1024 ? 0 : 1).replace(".", ",")} Mo`;
}

/** « il y a 3 min », « il y a 2 h » : durée écoulée depuis une date ISO. */
export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "jamais";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

/** « 39 s », « 4 min », « 2 h 10 » : durée depuis un instant. */
export function since(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
}
