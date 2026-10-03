import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Clés des relais au repos : jamais en clair dans Supabase.
// - Empreinte SHA-256 (hex) de chaque clé : colonnes UNIQUE, pour retrouver un relais à partir d'une clé reçue
//   (MediaMTX, journal du SLS) sans la stocker en clair.
// - Clés en clair chiffrées en AES-256-GCM (colonne keys_enc) avec RELAY_KEYS_SECRET (variable d'environnement du VPS) :
//   le Core les déchiffre pour déclarer les paires dans le SLS et afficher les URLs au propriétaire.
// Perdre RELAY_KEYS_SECRET = plus aucune URL affichable (il faudrait régénérer toutes les clés) : à sauvegarder.

export type SecretKeys = {
  publish_id: string;
  play_id: string;
  out_publish_id: string;
  out_play_id: string;
  cam_key: string | null;
  /** Secret AES du relais RIST (profil Main), absent sur les autres protocoles. */
  rist_secret?: string | null;
};

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** Empreintes des clés, telles qu'enregistrées en base. */
export function keyHashes(k: SecretKeys) {
  return {
    publish_hash: hashKey(k.publish_id),
    play_hash: hashKey(k.play_id),
    out_publish_hash: hashKey(k.out_publish_id),
    out_play_hash: hashKey(k.out_play_id),
    cam_hash: k.cam_key ? hashKey(k.cam_key) : null,
  };
}

/** Clé AES-256 lue depuis RELAY_KEYS_SECRET (64 caractères hex ou base64 de 32 octets). */
export function parseSecret(s: string): Buffer {
  const buf = /^[0-9a-f]{64}$/i.test(s) ? Buffer.from(s, "hex") : Buffer.from(s, "base64");
  if (buf.length !== 32) throw new Error("RELAY_KEYS_SECRET : 32 octets attendus (openssl rand -hex 32)");
  return buf;
}

export function createSealer(secret: Buffer) {
  return {
    /** « v1.<iv>.<chiffré>.<tag> » en base64url. */
    seal(k: SecretKeys): string {
      const iv = randomBytes(12);
      const c = createCipheriv("aes-256-gcm", secret, iv);
      const ct = Buffer.concat([c.update(JSON.stringify(k), "utf8"), c.final()]);
      return ["v1", iv.toString("base64url"), ct.toString("base64url"), c.getAuthTag().toString("base64url")].join(".");
    },
    /** Déchiffre ; lève une erreur si la valeur a été modifiée ou chiffrée avec un autre secret. */
    open(sealed: string): SecretKeys {
      const [v, iv, ct, tag] = sealed.split(".");
      if (v !== "v1" || !iv || !ct || !tag) throw new Error("keys_enc : format inconnu");
      const d = createDecipheriv("aes-256-gcm", secret, Buffer.from(iv, "base64url"));
      d.setAuthTag(Buffer.from(tag, "base64url"));
      const json = Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
      return JSON.parse(json) as SecretKeys;
    },
  };
}

export type Sealer = ReturnType<typeof createSealer>;
