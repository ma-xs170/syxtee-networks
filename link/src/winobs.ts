import { execFile, spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

// Gardien sur Windows : trouver, fermer, rouvrir OBS et garder le PC éveillé, avec les seuls outils fournis par Windows (tasklist, taskkill, reg, PowerShell).

/** Commande PowerShell passée en -EncodedCommand (UTF-16 LE en base64) : aucun souci de guillemets ni d'accents. */
export const encodePs = (script: string) => Buffer.from(script, "utf16le").toString("base64");
export const psArgs = (script: string) => ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodePs(script)];

/** pid de obs64.exe s'il tourne, sinon null. */
export const findObsWin = () =>
  new Promise<number | null>((resolve) => {
    execFile("tasklist", ["/FI", "IMAGENAME eq obs64.exe", "/FO", "CSV", "/NH"], { windowsHide: true }, (err, out) => {
      const pid = Number(/^"obs64\.exe","(\d+)"/im.exec(String(out))?.[1]);
      resolve(!err && pid > 0 ? pid : null);
    });
  });

/** Fermeture normale (WM_CLOSE) ou, si `force`, arrêt immédiat d'OBS gelé. */
export function killObsWin(pid: number, force: boolean) {
  execFile("taskkill", ["/PID", String(pid), ...(force ? ["/F", "/T"] : [])], { windowsHide: true }, () => {});
}

/**
 * Garde le PC éveillé (veille système, écran verrouillé possible) : un PowerShell caché demande ES_CONTINUOUS | ES_SYSTEM_REQUIRED
 * et s'arrête de lui-même quand le Gardien disparaît, pour ne jamais laisser le PC éveillé sans raison.
 */
export function keepAwakeWin(parentPid: number): ChildProcess {
  const script = [
    "Add-Type -MemberDefinition '[DllImport(\"kernel32.dll\")] public static extern uint SetThreadExecutionState(uint f);' -Name P -Namespace W",
    "[void][W.P]::SetThreadExecutionState(0x80000001)",
    `while (Get-Process -Id ${Math.trunc(parentPid)} -ErrorAction SilentlyContinue) { Start-Sleep -Seconds 5 }`,
  ].join("\n");
  return spawn("powershell.exe", psArgs(script), { stdio: "ignore", windowsHide: true });
}

const regQuery = (key: string) =>
  new Promise<string>((resolve) => {
    execFile("reg", ["query", key, "/ve"], { windowsHide: true }, (err, out) => resolve(err ? "" : String(out)));
  });

/** obs64.exe : chemin noté par le plugin, sinon dossier d'installation lu dans le registre, sinon emplacements habituels. */
export async function findObsExe(known: string | null): Promise<string | null> {
  if (known && existsSync(known)) return known;
  const dirs: string[] = [];
  for (const key of ["HKLM\\SOFTWARE\\OBS Studio", "HKLM\\SOFTWARE\\WOW6432Node\\OBS Studio", "HKCU\\SOFTWARE\\OBS Studio"]) {
    const m = /REG_SZ\s+(.+?)\s*$/m.exec(await regQuery(key));
    if (m) dirs.push(m[1]);
  }
  for (const base of [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], "C:\\Program Files"]) if (base) dirs.push(join(base, "obs-studio"));
  for (const d of dirs) {
    const exe = join(d, "bin", "64bit", "obs64.exe");
    if (existsSync(exe)) return exe;
  }
  return null;
}

/** Rouvre OBS. Son dossier de travail doit être bin\64bit, sinon OBS ne trouve pas ses fichiers. */
export async function launchObsWin(clearSentinel: () => number, known: string | null) {
  if ((await findObsWin()) !== null) throw new Error("OBS est déjà ouvert.");
  const exe = await findObsExe(known);
  if (!exe) throw new Error("OBS est introuvable sur ce PC.");
  clearSentinel();
  const child = spawn(exe, ["--disable-missing-files-check"], { cwd: dirname(exe), detached: true, stdio: "ignore" });
  child.on("error", () => {});
  child.unref();
}
