import { readFileSync } from "node:fs";
import { cpus, freemem, loadavg, totalmem, uptime } from "node:os";

// Santé du VPS pour la vue d'ensemble admin : CPU (charge / cœurs), RAM, débit réseau (hors boucle locale).
// Le conteneur tourne en réseau « host » : /proc/net/dev voit les interfaces de la machine.

type NetTotals = { rx: number; tx: number; at: number };

/** Octets reçus / envoyés depuis le démarrage, toutes interfaces sauf lo et docker. null hors Linux. */
export function readNet(text?: string): NetTotals | null {
  let raw = text;
  if (raw === undefined) {
    try {
      raw = readFileSync("/proc/net/dev", "utf8");
    } catch {
      return null;
    }
  }
  let rx = 0;
  let tx = 0;
  for (const line of raw.split("\n").slice(2)) {
    const [name, rest] = line.split(":");
    if (!rest) continue;
    const iface = name.trim();
    if (iface === "lo" || iface.startsWith("docker") || iface.startsWith("veth") || iface.startsWith("br-")) continue;
    const f = rest.trim().split(/\s+/).map(Number);
    rx += f[0] ?? 0;
    tx += f[8] ?? 0;
  }
  return { rx, tx, at: Date.now() };
}

export function createSysStats() {
  let prev = readNet();
  let rate = { rxMbps: 0, txMbps: 0 };
  return {
    /** Relevé courant ; le débit est la moyenne depuis l'appel précédent (au moins 1 s d'écart). */
    snapshot() {
      const now = readNet();
      if (now && prev && now.at - prev.at >= 1000) {
        const s = (now.at - prev.at) / 1000;
        rate = { rxMbps: ((now.rx - prev.rx) * 8) / s / 1e6, txMbps: ((now.tx - prev.tx) * 8) / s / 1e6 };
        prev = now;
      }
      const cores = cpus().length || 1;
      return {
        cpu: { load1: loadavg()[0], cores, percent: Math.min(100, Math.round((loadavg()[0] / cores) * 100)) },
        memory: { totalMb: Math.round(totalmem() / 1048576), usedMb: Math.round((totalmem() - freemem()) / 1048576) },
        network: { rxMbps: Math.round(rate.rxMbps * 10) / 10, txMbps: Math.round(rate.txMbps * 10) / 10, available: now !== null },
        uptimeS: Math.round(uptime()),
      };
    },
  };
}
