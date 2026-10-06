import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { cleanBackup, DEFAULT_BACKUP, type BackupConfig } from "./backup.ts";

export type LinkConfig = {
  core: string;
  /** Site SYXTEE : page où l'utilisateur confirme la connexion de ce PC. */
  site: string;
  /** Jeton d'accès (1 h), renouvelé avec `refresh` ; `expires` : échéance en ms (0 : ancien jeton sans échéance). */
  token: string;
  refresh: string;
  expires: number;
  /** Flux (relais) de destination : celui que la source « Flux SYXTEE » lit. */
  destination: string;
  /** Scène de direct d'OBS (celle qui doit contenir la source « Flux SYXTEE »). */
  liveScene: string;
  /** Sauvegarde automatique par collection de scènes, et date de la dernière sauvegarde faite depuis ce poste. */
  autoBackup: Record<string, boolean>;
  lastBackup: Record<string, string>;
  /** Aperçu programme poussé vers le site (désactivable si le PC est chargé). */
  previewEnabled: boolean;
  /** Fait une fois après la connexion : la proposition de sauvegarde a été vue (acceptée ou repoussée). */
  onboarded: boolean;
  obs: { host: string; port: number; password: string };
  backup: BackupConfig;
};

export const DEFAULT_CORE = "https://15-235-25-77.sslip.io";
export const DEFAULT_SITE = "https://syxtee-networks.vercel.app";

export const defaults = (): LinkConfig => ({ core: DEFAULT_CORE, site: DEFAULT_SITE, token: "", refresh: "", expires: 0, destination: "", liveScene: "", autoBackup: {}, lastBackup: {}, previewEnabled: true, onboarded: false, obs: { host: "127.0.0.1", port: 4455, password: "" }, backup: DEFAULT_BACKUP });

/** Dictionnaire nettoyé : clés courtes, valeurs acceptées par `ok` seulement. */
function recordOf<T>(v: unknown, ok: (x: unknown) => boolean): Record<string, T> {
  const out: Record<string, T> = {};
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v as Record<string, unknown>).slice(0, 200)) if (k.length <= 200 && ok(x)) out[k] = x as T;
  return out;
}

/** Dossier de configuration : ~/.syxtee-link (SYXTEE_LINK_HOME pour les tests). */
export const dir = () => process.env.SYXTEE_LINK_HOME || join(homedir(), ".syxtee-link");
const file = () => join(dir(), "config.json");

export function load(): LinkConfig {
  const d = defaults();
  if (!existsSync(file())) return d;
  try {
    const j = JSON.parse(readFileSync(file(), "utf8")) as Partial<LinkConfig>;
    return {
      core: typeof j.core === "string" && /^https?:\/\//.test(j.core) ? j.core.replace(/\/$/, "") : d.core,
      site: typeof j.site === "string" && /^https:\/\//.test(j.site) ? j.site.replace(/\/$/, "") : d.site,
      token: typeof j.token === "string" ? j.token : "",
      refresh: typeof j.refresh === "string" ? j.refresh : "",
      expires: Number(j.expires) || 0,
      destination: typeof j.destination === "string" ? j.destination.slice(0, 64) : "",
      liveScene: typeof j.liveScene === "string" ? j.liveScene.slice(0, 200) : "",
      autoBackup: recordOf(j.autoBackup, (v) => v === true),
      lastBackup: recordOf(j.lastBackup, (v) => typeof v === "string" && !Number.isNaN(Date.parse(v))),
      previewEnabled: j.previewEnabled !== false,
      onboarded: j.onboarded === true,
      obs: { host: j.obs?.host || d.obs.host, port: Number(j.obs?.port) || d.obs.port, password: j.obs?.password ?? "" },
      backup: cleanBackup(j.backup),
    };
  } catch {
    return d;
  }
}

/** Écriture atomique, lisible par l'utilisateur seul (le fichier contient le jeton d'appareil et le mot de passe OBS). */
export function save(c: LinkConfig) {
  mkdirSync(dir(), { recursive: true, mode: 0o700 });
  const tmp = `${file()}.tmp`;
  writeFileSync(tmp, JSON.stringify(c, null, 2), { mode: 0o600 });
  renameSync(tmp, file());
  try {
    chmodSync(file(), 0o600);
  } catch {
    // Windows : pas de chmod, le dossier du profil est déjà privé.
  }
}
