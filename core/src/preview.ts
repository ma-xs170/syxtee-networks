import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Relay } from "./relays.ts";
import { supervise, type Supervised } from "./supervisor.ts";

// Aperçu : une vignette JPEG toutes les N secondes par flux live. ffmpeg ne décode que les images-clés
// (-skip_frame nokey) : quelques % de CPU par flux, quelle que soit la définition.

export function previewArgs(o: { host: string; port: number; playId: string; out: string; intervalS: number }) {
  return [
    "-hide_banner", "-loglevel", "error",
    "-skip_frame", "nokey",
    "-i", `srt://${o.host}:${o.port}?streamid=${o.playId}&mode=caller&latency=200000`,
    "-map", "0:v:0", "-an",
    "-vf", `fps=1/${o.intervalS},scale=640:-2`,
    "-q:v", "6",
    "-f", "image2", "-update", "1", "-y", o.out,
  ];
}

export function createPreviews(o: { dir: string; host: string; port: number; intervalS: number; log: (m: string) => void }) {
  mkdirSync(o.dir, { recursive: true });
  const running = new Map<string, Supervised>();
  const path = (relayId: string) => join(o.dir, `${relayId}.jpg`);

  return {
    path,
    /** Aligne les processus sur la liste des flux live. */
    sync(live: Relay[]) {
      const want = new Map(live.map((k) => [k.id, k]));
      for (const [id, p] of running) {
        if (!want.has(id)) {
          p.stop();
          running.delete(id);
        }
      }
      for (const [id, k] of want) {
        if (running.has(id)) continue;
        const args = previewArgs({ host: o.host, port: o.port, playId: k.play_id, out: path(id), intervalS: o.intervalS });
        running.set(id, supervise(`aperçu ${id.slice(0, 8)}`, "ffmpeg", args, o.log));
      }
    },
    stopAll() {
      for (const p of running.values()) p.stop();
      running.clear();
    },
  };
}
