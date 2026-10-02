import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { cleanBackup, DEFAULT_BACKUP, type BackupConfig } from "./backup.ts";

export type LinkConfig = {
  core: string;
  token: string;
  obs: { host: string; port: number; password: string };
  backup: BackupConfig;
};

export const DEFAULT_CORE = "https://15-235-25-77.sslip.io";

export const defaults = (): LinkConfig => ({ core: DEFAULT_CORE, token: "", obs: { host: "127.0.0.1", port: 4455, password: "" }, backup: DEFAULT_BACKUP });

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
      token: typeof j.token === "string" ? j.token : "",
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
