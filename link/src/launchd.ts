import { execFile } from "node:child_process";
import { chmodSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { dir } from "./config.ts";

// Enregistrement du Gardien auprès de launchd (macOS) : un LaunchAgent de l'utilisateur, relancé s'il s'arrête, sans mot de passe.

export const LABEL = "fr.syxtee.guardian";
const plistPath = () => join(homedir(), "Library", "LaunchAgents", `${LABEL}.plist`);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Fichier .plist du Gardien. En essai (Node), le script est donné en premier argument. */
export function guardianPlist(execPath: string, script: string | null, logFile: string): string {
  const args = [execPath, ...(script ? [...process.execArgv, script] : []), "guardian"];
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key><array>${args.map((a) => `<string>${esc(a)}</string>`).join("")}</array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>ProcessType</key><string>Interactive</string>
  <key>StandardOutPath</key><string>${esc(logFile)}</string>
  <key>StandardErrorPath</key><string>${esc(logFile)}</string>
</dict></plist>
`;
}

const launchctl = (args: string[]) => new Promise<string>((resolve) => execFile("launchctl", args, (err, out, errOut) => resolve(err ? String(errOut || err.message) : String(out))));

export async function installGuardian(): Promise<string> {
  if (process.platform !== "darwin") return "Le Gardien n'est disponible que sur macOS pour l'instant.";
  const isNode = basename(process.execPath).startsWith("node");
  const logFile = join(dir(), "guardian.log");
  mkdirSync(dir(), { recursive: true, mode: 0o700 });
  // Journal borné : repart de zéro au-delà de 1 Mo.
  try {
    if (statSync(logFile).size > 1_000_000) rmSync(logFile);
  } catch {
    // pas encore de journal
  }
  mkdirSync(join(homedir(), "Library", "LaunchAgents"), { recursive: true });
  writeFileSync(plistPath(), guardianPlist(process.execPath, isNode ? process.argv[1] : null, logFile), { mode: 0o644 });
  chmodSync(plistPath(), 0o644);
  const domain = `gui/${process.getuid!()}`;
  await launchctl(["bootout", `${domain}/${LABEL}`]);
  const out = await launchctl(["bootstrap", domain, plistPath()]);
  return out.trim() ? `Gardien enregistré (${out.trim()})` : "Gardien enregistré : il démarre avec ta session.";
}

export async function uninstallGuardian(): Promise<string> {
  if (process.platform !== "darwin") return "Rien à retirer.";
  await launchctl(["bootout", `gui/${process.getuid!()}/${LABEL}`]);
  rmSync(plistPath(), { force: true });
  return "Gardien retiré.";
}
