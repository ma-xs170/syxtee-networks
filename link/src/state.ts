import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dir } from "./config.ts";

// Petits fichiers d'état partagés entre le plugin OBS, l'agent et le Gardien (processus séparés, même utilisateur).
//   session.json   écrit par le plugin : { pid, exited } (exited passe à true à la fermeture normale d'OBS ; un plantage le laisse à false)
//   stream.json    écrit par l'agent : { streaming, at } (le direct d'OBS était actif à ce moment)
//   resume.json    écrit par le Gardien après une relance : { at } (l'agent reprend le direct s'il est récent)
//   guardian.json  réglages du Gardien : { watch, resume }

export type Session = { pid: number; exited: boolean };
export type GuardianSettings = { watch: boolean; resume: boolean };

export const DEFAULT_SETTINGS: GuardianSettings = { watch: true, resume: true };

const path = (name: string) => join(dir(), name);

export function readJson<T>(name: string): T | null {
  try {
    if (!existsSync(path(name))) return null;
    return JSON.parse(readFileSync(path(name), "utf8")) as T;
  } catch {
    return null;
  }
}

export function writeJson(name: string, v: unknown) {
  const tmp = `${path(name)}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(v), { mode: 0o600 });
    renameSync(tmp, path(name));
  } catch {
    // dossier absent ou disque plein : l'état est un confort, jamais une raison de tomber
  }
}

export function removeFile(name: string) {
  rmSync(path(name), { force: true });
}

export function readSession(): Session | null {
  const s = readJson<Partial<Session>>("session.json");
  return s && Number.isInteger(s.pid) && typeof s.exited === "boolean" ? { pid: s.pid!, exited: s.exited } : null;
}

export function readSettings(): GuardianSettings {
  const s = readJson<Partial<GuardianSettings>>("guardian.json");
  return { watch: s?.watch !== false, resume: s?.resume !== false };
}

export const writeSettings = (s: GuardianSettings) => writeJson("guardian.json", s);

/** Direct d'OBS actif (écrit par l'agent à chaque changement). */
export const writeStreaming = (streaming: boolean) => writeJson("stream.json", { streaming, at: Date.now() });
export const readStreaming = () => readJson<{ streaming?: boolean; at?: number }>("stream.json")?.streaming === true;

/** Reprise du direct après une relance : valable 5 minutes. Lue une seule fois. */
export const RESUME_TTL_MS = 5 * 60_000;
export const writeResume = () => writeJson("resume.json", { at: Date.now() });
export function takeResume(now = Date.now()): boolean {
  const r = readJson<{ at?: number }>("resume.json");
  if (!r) return false;
  removeFile("resume.json");
  return typeof r.at === "number" && now - r.at < RESUME_TTL_MS && now >= r.at;
}
