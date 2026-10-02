import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

// Archive tar minimale (en-têtes ustar, noms de 100 caractères au plus), écrite et lue en flux : un média de plusieurs Go ne passe jamais
// entièrement en mémoire. Seule la lecture sert aux données reçues du serveur : elle est stricte (noms sûrs, tailles bornées).

const BLOCK = 512;

function header(name: string, size: number): Buffer {
  if (Buffer.byteLength(name) > 100) throw new Error(`nom trop long : ${name}`);
  const h = Buffer.alloc(BLOCK);
  h.write(name, 0, "utf8");
  h.write("0000644\0", 100);
  h.write("0000000\0", 108);
  h.write("0000000\0", 116);
  h.write(size.toString(8).padStart(11, "0") + "\0", 124);
  h.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, "0") + "\0", 136);
  h.write("        ", 148); // somme de contrôle : huit espaces pendant le calcul
  h.write("0", 156);
  h.write("ustar\0" + "00", 257);
  let sum = 0;
  for (const b of h) sum += b;
  h.write(sum.toString(8).padStart(6, "0") + "\0 ", 148);
  return h;
}

export type TarFile = { name: string; path?: string; data?: Buffer; size: number };

/** Entrées : fichiers du disque (path) ou contenus en mémoire (data). Renvoie le flux tar (non compressé). */
export function tarStream(files: TarFile[]): Readable {
  async function* gen() {
    for (const f of files) {
      yield header(f.name, f.size);
      if (f.data) yield f.data;
      else {
        let sent = 0;
        for await (const chunk of createReadStream(f.path!)) {
          sent += (chunk as Buffer).length;
          if (sent > f.size) throw new Error(`fichier modifié pendant la sauvegarde : ${f.name}`);
          yield chunk;
        }
        if (sent !== f.size) throw new Error(`fichier modifié pendant la sauvegarde : ${f.name}`);
      }
      const pad = (BLOCK - (f.size % BLOCK)) % BLOCK;
      if (pad) yield Buffer.alloc(pad);
    }
    yield Buffer.alloc(BLOCK * 2);
  }
  return Readable.from(gen());
}

export async function fileSize(path: string) {
  return (await stat(path)).size;
}

/** Noms acceptés à l'extraction : collection.json, manifest.json, media/<nom simple>. */
export const safeEntry = (name: string) => name === "collection.json" || name === "manifest.json" || /^media\/[A-Za-z0-9._-]{1,90}$/.test(name);

/**
 * Lit un flux tar (déjà décompressé) et appelle `onFile` pour chaque entrée acceptée. `onFile` reçoit le flux du contenu ;
 * les entrées refusées sont ignorées. `maxTotal` borne la taille cumulée (défense contre une archive piégée).
 */
export async function untar(input: Readable, onFile: (name: string, size: number, content: Readable) => Promise<void>, maxTotal = 6 * 1024 ** 3): Promise<void> {
  let buf: Buffer = Buffer.alloc(0);
  let total = 0;
  let current: { name: string; left: number; pad: number; accept: boolean; out: Transform; done: Promise<void> } | null = null;

  const finishCurrent = async () => {
    if (!current) return;
    current.out.end();
    await current.done;
    current = null;
  };

  for await (const chunk of input) {
    buf = buf.length ? Buffer.concat([buf, chunk as Buffer]) : (chunk as Buffer);
    for (;;) {
      if (current) {
        if (current.left > 0) {
          const n = Math.min(current.left, buf.length);
          if (n === 0) break;
          if (current.accept) {
            const ok = current.out.write(buf.subarray(0, n));
            if (!ok) await new Promise((r) => current!.out.once("drain", r));
          }
          current.left -= n;
          buf = buf.subarray(n);
          if (current.left > 0) break;
        }
        if (buf.length < current.pad) break;
        buf = buf.subarray(current.pad);
        await finishCurrent();
        continue;
      }
      if (buf.length < BLOCK) break;
      const h = buf.subarray(0, BLOCK);
      buf = buf.subarray(BLOCK);
      if (h.every((b) => b === 0)) continue; // bloc de fin
      const name = h.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
      const size = parseInt(h.subarray(124, 135).toString("ascii").replace(/\0.*$/, "").trim() || "0", 8);
      if (!Number.isFinite(size) || size < 0) throw new Error("archive invalide");
      total += size;
      if (total > maxTotal) throw new Error("archive trop grande");
      const type = String.fromCharCode(h[156] || 48);
      const accept = (type === "0" || type === "\0") && safeEntry(name);
      const out = new Transform({ transform: (c, _e, cb) => cb(null, c) });
      const done = accept ? onFile(name, size, out) : Promise.resolve();
      if (!accept) out.resume();
      current = { name, left: size, pad: (BLOCK - (size % BLOCK)) % BLOCK, accept, out, done };
      if (size === 0) {
        await finishCurrent();
      }
    }
  }
  if (current) throw new Error("archive tronquée");
}

/** Écrit un flux dans un fichier sous `root` (refuse de sortir de `root`). */
export async function writeInto(root: string, relative: string, content: Readable) {
  const full = resolve(root, relative);
  if (full !== resolve(root) && !full.startsWith(resolve(root) + sep)) throw new Error("chemin refusé");
  await mkdir(dirname(full), { recursive: true });
  await pipeline(content, createWriteStream(full));
  return full;
}
