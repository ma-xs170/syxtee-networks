// Export des journaux en un seul .txt (de A à Z) : infos du poste, journal de l'agent, journal du Gardien et journal complet de la dernière session OBS.
// Les adresses de lecture des flux (streamid), mots de passe et jetons sont masqués avant écriture.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir, hostname, release, platform } from "node:os";
import { join } from "node:path";
import { VERSION } from "./agent.ts";
import { dir } from "./config.ts";

export function obsLogsDir(): string {
  if (process.platform === "win32") return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "obs-studio", "logs");
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", "obs-studio", "logs");
  return join(homedir(), ".config", "obs-studio", "logs");
}

export function redact(t: string): string {
  return t
    .replace(/(streamid=)[^&\s"']+/gi, "$1***")
    .replace(/(passphrase=)[^&\s"']+/gi, "$1***")
    .replace(/(authorization:\s*bearer\s+)\S+/gi, "$1***")
    .replace(/\b(syx_[A-Za-z0-9_-]{16,})\b/g, "***")
    .replace(/((?:password|token|refresh|secret|key)["']?\s*[:=]\s*["']?)[^\s"',}&]{6,}/gi, "$1***");
}

const read = (f: string) => {
  try {
    return readFileSync(f, "utf8");
  } catch {
    return "(fichier absent ou illisible)\n";
  }
};

/** Dernier journal OBS (le plus récent par date de modification), ou null. */
export function latestObsLog(root = obsLogsDir()): string | null {
  try {
    const files = readdirSync(root).filter((f) => f.endsWith(".txt")).map((f) => ({ f, t: statSync(join(root, f)).mtimeMs }));
    files.sort((a, b) => b.t - a.t);
    return files[0] ? join(root, files[0].f) : null;
  } catch {
    return null;
  }
}

export function buildLogReport(extra: { sessionLogs?: string[] } = {}): string {
  const bar = (t: string) => `\n${"=".repeat(78)}\n${t}\n${"=".repeat(78)}\n`;
  const out: string[] = [];
  out.push(`SYXTEE Link ${VERSION} : journaux complets`);
  out.push(`Généré le ${new Date().toLocaleString("fr-FR")}`);
  out.push(`Poste : ${hostname()} · ${platform()} ${release()}`);
  const helper = join(dir(), "helper.log");
  out.push(bar(`Agent SYXTEE Link (${helper})`) + read(helper));
  const guardian = join(dir(), "guardian.log");
  if (existsSync(guardian)) out.push(bar(`Gardien SYXTEE (${guardian})`) + read(guardian));
  if (extra.sessionLogs?.length) out.push(bar("Activité de la session en cours") + extra.sessionLogs.join("\n") + "\n");
  const obs = latestObsLog();
  if (obs) out.push(bar(`OBS : dernière session (${obs})`) + read(obs));
  return redact(out.join("\n"));
}

/** Écrit le rapport dans le dossier Téléchargements et renvoie son chemin. */
export function exportLogs(extra: { sessionLogs?: string[] } = {}): string {
  const d = join(homedir(), "Downloads");
  mkdirSync(d, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const file = join(d, `SYXTEE-Link-journaux-${stamp}.txt`);
  writeFileSync(file, buildLogReport(extra), { mode: 0o600 });
  return file;
}
