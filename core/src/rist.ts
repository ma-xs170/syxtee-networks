import { execFile } from "node:child_process";
import type { Relay } from "./relays.ts";
import { supervise, type Supervised } from "./supervisor.ts";

// Entrée RIST (Reliable Internet Stream Transport, VSF TR-06-1/-2) : le srt-live-server ne reçoit que du SRT/SRTLA.
// Chaque relais RIST a son propre port UDP (colonne rist_port) et un secret AES-256 (profil Main, tiré à la création,
// chiffré en base avec les autres clés). Le Core lance un ffmpeg par relais qui écoute ce port (librist), puis republie le
// flux en SRT dans le SLS sur publish_id (vidéo copiée sans réencodage, son en AAC) : OBS lit toujours en SRT, santé,
// aperçu, historique et régie marchent sans rien de plus.
// Sécurité : sans le secret, les paquets sont rejetés par librist (rien n'arrive au SLS). Un relais archivé, supprimé ou
// régénéré (nouveau secret) voit son écouteur arrêté ou relancé dans la seconde : l'ancien émetteur ne passe plus.

/** Arguments ffmpeg de l'écouteur RIST d'un relais : RIST (MPEG-TS) → MPEG-TS/SRT vers le relais. */
export function ristArgs(r: { port: number; secret: string }, output: string) {
  return [
    "-hide_banner", "-loglevel", "error",
    "-rist_profile", "main",
    "-secret", r.secret,
    "-encryption", "256",
    "-overrun_nonfatal", "1",
    "-i", `rist://@:${r.port}`,
    "-map", "0:v:0", "-map", "0:a:0?",
    "-c:v", "copy",
    // Toujours en stéréo : une source mono est doublée sur les deux canaux, une source stéréo reste telle quelle.
    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2",
    "-f", "mpegts", output,
  ];
}

/** Ce ffmpeg sait-il recevoir du RIST (compilé avec librist) ? */
export function ristSupported(ffmpeg = "ffmpeg"): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(ffmpeg, ["-hide_banner", "-protocols"], { timeout: 5000 }, (err, stdout) => resolve(!err && /^\s*rist\s*$/m.test(stdout)));
  });
}

type Listener = { proc: Supervised; signature: string };

export function createRist(o: {
  /** URL de sortie du relais pour un publish_id (SRT vers le SLS). */
  output: (publishId: string) => string;
  log: (m: string) => void;
  /** Remplaçable dans les tests. */
  superviseImpl?: typeof supervise;
}) {
  const run = o.superviseImpl ?? supervise;
  const listeners = new Map<string, Listener>(); // id du relais → écouteur ffmpeg

  return {
    /** Aligne les écouteurs sur les relais RIST autorisés (appelé à chaque réalignement du SLS). */
    setKeys(rows: Relay[]) {
      const want = new Map<string, Relay>();
      for (const r of rows) if (r.protocol === "rist" && !r.archived && r.rist_port && r.rist_secret) want.set(r.id, r);
      for (const [id, l] of listeners) {
        const r = want.get(id);
        if (r && l.signature === signature(r)) continue;
        l.proc.stop();
        listeners.delete(id);
        o.log(`rist ${id.slice(0, 8)} arrêté`);
      }
      for (const [id, r] of want) {
        if (listeners.has(id)) continue;
        const args = ristArgs({ port: r.rist_port!, secret: r.rist_secret! }, o.output(r.publish_id));
        listeners.set(id, { proc: run(`rist ${id.slice(0, 8)}`, "ffmpeg", args, o.log), signature: signature(r) });
        o.log(`rist ${id.slice(0, 8)} à l'écoute sur :${r.rist_port}`);
      }
    },

    listening: (relayId: string) => listeners.has(relayId),

    stopAll() {
      for (const l of listeners.values()) l.proc.stop();
      listeners.clear();
    },
  };
}

const signature = (r: Relay) => `${r.rist_port}|${r.rist_secret}|${r.publish_id}`;

export type Rist = ReturnType<typeof createRist>;
