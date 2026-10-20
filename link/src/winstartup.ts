import { execFile, spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { dir } from "./config.ts";

// Enregistrement du Gardien sur Windows : clé « Run » de l'utilisateur (aucun droit administrateur), lancée sans fenêtre par un petit script VBS.
// L'équivalent de KeepAlive de launchd est un superviseur : le processus lancé à l'ouverture de session relance le Gardien s'il s'arrête.

export const RUN_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
export const RUN_NAME = "SYXTEEGuardian";
const SUPERVISOR_PID = "guardian.pid";
const RESTART_DELAY_MS = 10_000;

const vbsPath = () => join(dir(), "guardian.vbs");

/** Ligne de commande du Gardien. En essai (Node), le script est donné en premier argument. */
export function guardianArgs(execPath: string, script: string | null, extra: string[] = []): string[] {
  return [execPath, ...(script ? [...process.execArgv, script] : []), "guardian", ...extra];
}

/** Script VBS qui lance le Gardien sans fenêtre de console (les guillemets s'y doublent). */
export function guardianVbs(args: string[]): string {
  const cmd = args.map((a) => `"${a.replace(/"/g, '""')}"`).join(" ");
  return `CreateObject("WScript.Shell").Run "${cmd.replace(/"/g, '""')}", 0, False\r\n`;
}

const run = (cmd: string, args: string[]) =>
  new Promise<{ ok: boolean; out: string }>((resolve) => execFile(cmd, args, { windowsHide: true }, (err, out, errOut) => resolve({ ok: !err, out: String(err ? errOut || err.message : out).trim() })));

/** Arrête le superviseur et le Gardien qu'il a lancé (le plugin ne peut pas être mis à jour tant que l'exécutable est ouvert). */
export async function stopGuardianWin(): Promise<void> {
  let pid = 0;
  try {
    pid = Number(readFileSync(join(dir(), SUPERVISOR_PID), "utf8"));
  } catch {
    // pas de Gardien en cours
  }
  if (pid > 0 && pid !== process.pid) await run("taskkill", ["/PID", String(pid), "/F", "/T"]);
  rmSync(join(dir(), SUPERVISOR_PID), { force: true });
}

export async function installGuardianWin(): Promise<string> {
  const isNode = basename(process.execPath).toLowerCase().startsWith("node");
  const script = isNode ? process.argv[1] : null;
  mkdirSync(dir(), { recursive: true, mode: 0o700 });
  const logFile = join(dir(), "guardian.log");
  // Journal borné : repart de zéro au-delà de 1 Mo.
  try {
    if (statSync(logFile).size > 1_000_000) rmSync(logFile);
  } catch {
    // pas encore de journal
  }
  await stopGuardianWin();
  writeFileSync(vbsPath(), guardianVbs(guardianArgs(process.execPath, script)));
  const reg = await run("reg", ["add", RUN_KEY, "/v", RUN_NAME, "/t", "REG_SZ", "/d", `wscript.exe //B //Nologo "${vbsPath()}"`, "/f"]);
  if (!reg.ok) return `Gardien non enregistré (${reg.out}).`;
  const child = spawn("wscript.exe", ["//B", "//Nologo", vbsPath()], { detached: true, stdio: "ignore", windowsHide: true });
  child.on("error", () => {});
  child.unref();
  return "Gardien enregistré : il démarre avec ta session.";
}

export async function uninstallGuardianWin(): Promise<string> {
  await stopGuardianWin();
  await run("reg", ["delete", RUN_KEY, "/v", RUN_NAME, "/f"]);
  rmSync(vbsPath(), { force: true });
  return "Gardien retiré.";
}

/**
 * Superviseur : lancé par la clé Run, il démarre le Gardien (`guardian --child`) et le relance s'il s'arrête, au plus une fois toutes les 10 s.
 * Un seul superviseur à la fois : un second lancement (double ouverture de session) s'arrête aussitôt.
 */
export function superviseGuardian(log: (m: string) => void): { stop(): void } {
  const pidFile = join(dir(), SUPERVISOR_PID);
  try {
    const other = Number(readFileSync(pidFile, "utf8"));
    if (other > 0 && other !== process.pid) {
      try {
        process.kill(other, 0);
        log(`Gardien déjà lancé (pid ${other})`);
        process.exit(0);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "EPERM") process.exit(0);
        // pid périmé : on reprend la main
      }
    }
  } catch {
    // premier lancement
  }
  mkdirSync(dir(), { recursive: true, mode: 0o700 });
  writeFileSync(pidFile, String(process.pid));
  const isNode = basename(process.execPath).toLowerCase().startsWith("node");
  const [exe, ...rest] = guardianArgs(process.execPath, isNode ? process.argv[1] : null, ["--child"]);
  let stopped = false;
  let child: ReturnType<typeof spawn> | null = null;
  const start = () => {
    if (stopped) return;
    const out = openSync(join(dir(), "guardian.log"), "a");
    child = spawn(exe, rest, { stdio: ["ignore", out, out], windowsHide: true });
    closeSync(out);
    child.on("exit", (code) => {
      child = null;
      log(`Gardien arrêté (code ${code}) : relance dans ${RESTART_DELAY_MS / 1000} s`);
      if (!stopped) setTimeout(start, RESTART_DELAY_MS);
    });
    child.on("error", (e) => log(`Gardien : lancement impossible (${e.message})`));
  };
  start();
  return {
    stop() {
      stopped = true;
      child?.kill();
      rmSync(pidFile, { force: true });
    },
  };
}
