import { createReadStream } from "node:fs";
import { Readable, Transform } from "node:stream";

// Échanges de l'agent avec le Core pour les sauvegardes (jeton d'appareil, jamais de cookie).

export type CloudBackup = { id: string; name: string; collection: string; size: number; media_count: number; obs_version: string; host: string; created_at: string };

const ERR: Record<string, string> = {
  quota: "Espace plein : 5 Go par compte. Supprime une sauvegarde dans SYXTEE Studio.",
  unauthorized: "Appareil non reconnu : reconnecte-le à ton compte.",
  length_required: "Envoi refusé (taille manquante).",
  aborted: "Envoi interrompu, réessaie.",
  not_found: "Sauvegarde introuvable.",
};
export const cloudError = (code: unknown) => ERR[String(code)] ?? "Le serveur a refusé la demande.";

export async function uploadArchive(core: string, token: string, file: string, size: number, meta: { name: string; collection: string; media: number; obs: string; host: string }, onProgress?: (sent: number, total: number) => void) {
  let sent = 0;
  const counter = new Transform({
    transform(c: Buffer, _e, cb) {
      onProgress?.((sent += c.length), size);
      cb(null, c);
    },
  });
  const q = new URLSearchParams({ name: meta.name, collection: meta.collection, media: String(meta.media), obs: meta.obs, host: meta.host });
  const res = await fetch(`${core}/v1/link/backups?${q}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/gzip", "content-length": String(size) },
    body: Readable.toWeb(createReadStream(file).pipe(counter)) as unknown as ReadableStream,
    duplex: "half",
  } as RequestInit).catch(() => null);
  if (!res) throw new Error("Serveur injoignable.");
  const j = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok || !j.id) throw new Error(cloudError(j.error));
  return j.id;
}

export async function downloadArchive(core: string, token: string, id: string): Promise<Readable> {
  const res = await fetch(`${core}/v1/link/backups/${id}`, { headers: { authorization: `Bearer ${token}` } }).catch(() => null);
  if (!res) throw new Error("Serveur injoignable.");
  if (!res.ok || !res.body) throw new Error(cloudError(((await res.json().catch(() => ({}))) as { error?: string }).error));
  return Readable.fromWeb(res.body as never);
}
