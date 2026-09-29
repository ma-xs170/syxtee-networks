import "server-only";
import { createHash } from "node:crypto";

// Mot de passe déjà vu dans une fuite de données ? API « Pwned Passwords » de Have I Been Pwned en k-anonymat :
// seuls les 5 premiers caractères du SHA-1 partent, jamais le mot de passe ni son empreinte complète.
// En cas de panne de l'API, on laisse passer (longueur minimale et jauge restent appliquées).

export async function isPwned(password: string): Promise<boolean> {
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const suffix = hash.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      headers: { "Add-Padding": "true", "User-Agent": "SYXTEE-NETWORKS" },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) return false;
    return (await res.text()).split("\n").some((line) => {
      const [s, count] = line.trim().split(":");
      return s === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}
