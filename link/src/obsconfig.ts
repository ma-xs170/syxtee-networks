import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Où OBS range sa configuration, et comment se connecter à son serveur WebSocket sans rien demander à l'utilisateur.

export function obsRoot(): string {
  if (process.env.OBS_CONFIG_DIR) return process.env.OBS_CONFIG_DIR;
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", "obs-studio");
  if (process.platform === "win32") return join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "obs-studio");
  return join(homedir(), ".config", "obs-studio");
}

export const scenesDir = () => join(obsRoot(), "basic", "scenes");

/** Collections de scènes d'OBS (nom du fichier sans .json), hors sauvegardes .bak. */
export function listCollections(): string[] {
  const dir = scenesDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort((a, b) => a.localeCompare(b));
}

/** Collection de scènes ouverte dans OBS (global.ini ou user.ini, clé SceneCollection), sinon la première de la liste. */
export function currentCollection(): string {
  const all = listCollections();
  for (const f of ["user.ini", "global.ini"]) {
    try {
      const m = /^SceneCollection=(.*)$/m.exec(readFileSync(join(obsRoot(), f), "utf8"));
      const name = m?.[1].trim();
      if (name && all.includes(name)) return name;
    } catch {
      /* fichier absent : suivant */
    }
  }
  return all[0] ?? "";
}

export type WsConfig = { enabled: boolean; port: number; password: string; authRequired: boolean };

/** Réglages du serveur WebSocket d'OBS (plugin_config/obs-websocket/config.json), ou null si OBS ne les a pas encore écrits. */
export function readObsWebsocket(): WsConfig | null {
  const file = join(obsRoot(), "plugin_config", "obs-websocket", "config.json");
  try {
    const j = JSON.parse(readFileSync(file, "utf8")) as { server_enabled?: boolean; server_port?: number; server_password?: string; auth_required?: boolean };
    return { enabled: j.server_enabled === true, port: Number(j.server_port) || 4455, password: String(j.server_password ?? ""), authRequired: j.auth_required !== false };
  } catch {
    return null;
  }
}
