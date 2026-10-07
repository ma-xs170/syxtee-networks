import { Transform, type Readable } from "node:stream";

// Lecture d'une archive tar (ustar) déjà décompressée, en flux : sert à convertir les anciennes sauvegardes (.tgz) en fichiers partagés.
// Lecture stricte : seuls manifest.json, collection.json et media/<nom simple> sont acceptés, les tailles sont bornées.

const BLOCK = 512;
export const safeEntry = (name: string) => name === "collection.json" || name === "manifest.json" || /^media\/[A-Za-z0-9._-]{1,90}$/.test(name);

export async function untar(input: Readable, onFile: (name: string, size: number, content: Readable) => Promise<void>, maxTotal = 6 * 1024 ** 3): Promise<void> {
  let buf: Buffer = Buffer.alloc(0);
  let total = 0;
  let current: { left: number; pad: number; accept: boolean; out: Transform; done: Promise<void> } | null = null;

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
      if (h.every((b) => b === 0)) continue;
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
      current = { left: size, pad: (BLOCK - (size % BLOCK)) % BLOCK, accept, out, done };
      if (size === 0) await finishCurrent();
    }
  }
  if (current) throw new Error("archive tronquée");
}
