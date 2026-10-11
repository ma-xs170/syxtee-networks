import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ipsFile, type Link } from "./links.ts";
import type { Target } from "./pipeline.ts";

/** Vrai si le binaire srtla_send est installé (à compiler depuis les sources de srtla). */
export function hasSrtlaSend(bin = "srtla_send"): boolean {
  try { execFileSync("which", [bin], { stdio: "ignore" }); return true; } catch { return false; }
}

/** Lance srtla_send : reçoit le SRT local sur localPort, le répartit sur les liens vers le Core. Usage : srtla_send LISTEN_PORT HOST PORT IPS_FILE. */
export function startSrtlaSend(t: Extract<Target, { kind: "srtla" }>, links: Link[], bin = "srtla_send"): ChildProcess {
  if (links.length === 0) throw new Error("Aucun lien réseau actif pour le bonding.");
  const file = join(mkdtempSync(join(tmpdir(), "syxtee-srtla-")), "ips");
  writeFileSync(file, ipsFile(links));
  return spawn(bin, [String(t.localPort), t.host, String(t.port), file], { stdio: "ignore" });
}
