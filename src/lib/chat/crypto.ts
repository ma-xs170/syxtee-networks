import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Chiffrement des jetons de chat (AES-256-GCM). Clé : CHAT_TOKEN_KEY (n'importe quelle chaîne longue, dérivée en 32 octets).
// Format : iv.tag.texte, en base64url.

const secret = (process.env.CHAT_TOKEN_KEY ?? "").trim();
export const hasChatKey = secret.length >= 16;
const key = () => createHash("sha256").update(secret).digest();

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(blob: string) {
  const [iv, tag, body] = blob.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}
