import sharp from "sharp";

// Couleur de la pastille de pseudo : tirée de l'avatar du streamer (couleur dominante), assombrie pour que le texte blanc reste lisible (AA).
// Calculée côté serveur, gardée en mémoire par URL (l'accueil est régénéré toutes les 5 minutes). Repli : violet Twitch.

export const FALLBACK_TINT = "#7c3aed";
const cache = new Map<string, string>();

const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

/** Couleur sûre pour du texte blanc : on garde la teinte, on force une saturation minimale et une luminosité maximale. */
function toTint(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  let l = (max + min) / 2;
  const d = max - min;
  let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r / 255) h = ((g - b) / 255 / d) % 6;
    else if (max === g / 255) h = (b - r) / 255 / d + 2;
    else h = (r - g) / 255 / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  s = Math.max(s, 0.45);
  l = Math.min(Math.max(l, 0.3), 0.4);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${hex((r1 + m) * 255)}${hex((g1 + m) * 255)}${hex((b1 + m) * 255)}`;
}

export async function avatarTint(url: string | null): Promise<string> {
  if (!url || !/^https:\/\//.test(url)) return FALLBACK_TINT;
  const hit = cache.get(url);
  if (hit) return hit;
  let tint = FALLBACK_TINT;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const { dominant } = await sharp(Buffer.from(await res.arrayBuffer())).resize(64, 64, { fit: "cover" }).stats();
      tint = toTint(dominant.r, dominant.g, dominant.b);
    }
  } catch {
    // avatar injoignable : on garde le repli
  }
  cache.set(url, tint);
  return tint;
}
