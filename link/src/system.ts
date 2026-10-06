import { execFile } from "node:child_process";
import { release, type as osType } from "node:os";

/** Système du PC, pour l'écran d'autorisation et le registre des postes (ex. « macOS 24.1.0 »). */
export const osLabel = () => `${osType() === "Darwin" ? "macOS" : osType() === "Windows_NT" ? "Windows" : osType()} ${release()}`.slice(0, 40);

/** Ouvre une adresse https ou http locale dans le navigateur par défaut (arguments en tableau : aucune interprétation par un shell). */
export function openUrl(url: string) {
  if (!/^https:\/\/|^http:\/\/127\.0\.0\.1:/.test(url) || process.env.SYXTEE_LINK_NO_OPEN) return;
  if (process.platform === "darwin") execFile("open", [url], () => {});
  else if (process.platform === "win32") execFile("rundll32", ["url.dll,FileProtocolHandler", url], () => {});
  else execFile("xdg-open", [url], () => {});
}

/**
 * Boîte de dialogue native (macOS) : propose de sauvegarder les scènes juste après la connexion. Renvoie true si l'utilisateur accepte.
 * Ailleurs (ou si la boîte ne peut pas s'afficher), renvoie false : l'interface locale montre la même proposition.
 */
export function askBackup(): Promise<boolean> {
  if (process.platform !== "darwin" || process.env.SYXTEE_LINK_NO_OPEN) return Promise.resolve(false);
  const script =
    'display dialog "SYXTEE Link est connecté à ton compte.\\n\\nSauvegarder tes scènes OBS (avec leurs médias) sur ton espace de 5 Go avant de commencer ?" ' +
    'buttons {"Plus tard", "Sauvegarder mes scènes"} default button 2 with title "SYXTEE Link" with icon note';
  return new Promise((resolve) => {
    execFile("osascript", ["-e", script], { timeout: 10 * 60_000 }, (err, stdout) => resolve(!err && /Sauvegarder mes scènes/.test(stdout)));
  });
}
