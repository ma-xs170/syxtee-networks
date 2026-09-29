import { readFileSync } from "node:fs";

// Mire SYXTEE (écran de coupure) en SVG, rendue par rsvgoverlay dans la régie. Repère 1280 × 720, mis à l'échelle.
// Charte du site : noir pur, filaire blanc, Geist / Geist Mono (assets/fonts, installées dans l'image régie),
// rouge seulement pour l'état « en direct », surlignage blanc sur le mot clé du titre.
// L'heure est ajoutée en direct par clockoverlay (coin haut-droit, voir CLOCK), pas ici.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const SANS = "Geist, DejaVu Sans, sans-serif";
const MONO = "Geist Mono, DejaVu Sans Mono, monospace";
const FG = "#f5f5f5";
const MUTED = "#8a8a8a";
const LIVE = "#ff3b30";

/** Position de l'heure (repère 1280 × 720) : alignée sur la ligne « EN DIRECT », à droite du cadre. */
export const CLOCK = { right: 72, top: 64, size: 11, font: "Geist Mono" };

// Bande de mire (barres SMPTE 75 %), calée sur la largeur du cadre.
const BARS = ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"];
export const BARS_Y = 664;

// Titre : « SIGNAL » + « PERDU » surligné. Largeurs mesurées en Geist Bold 64 (SIGNAL 243, PERDU 219).
const H = { y: 452, x: 384, signal: 243, gap: 22, pad: 14, perdu: 219 };

export function mireSvg(o: { width: number; height: number; relay: string; source: string; session: string; logoPng?: Buffer }) {
  const logo = o.logoPng
    ? `<image x="596" y="152" width="88" height="120" href="data:image/png;base64,${o.logoPng.toString("base64")}"/>`
    : "";
  const hx = H.x + H.signal + H.gap;
  const meta = [
    ["RELAIS", o.relay],
    ["SOURCE", o.source],
    ["SESSION", o.session],
  ] as const;
  const barW = 1200 / BARS.length;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${o.width}" height="${o.height}" viewBox="0 0 1280 720">
<rect width="1280" height="720" fill="#000"/>
<rect x="40" y="40" width="1200" height="608" fill="none" stroke="#fff" stroke-opacity="0.4" stroke-width="1.5"/>
<path d="M40 112H1240M40 560H1240" stroke="#fff" stroke-opacity="0.14"/>
<circle cx="78" cy="76" r="5" fill="${LIVE}"/>
<text x="94" y="81.5" fill="${FG}" font-family="${MONO}" font-size="14" letter-spacing="3">EN DIRECT</text>
${logo}
<text x="640" y="316" fill="${FG}" font-family="${SANS}" font-size="20" font-weight="700" letter-spacing="6" text-anchor="middle">SYXTEE <tspan fill="${MUTED}" font-weight="400">NETWORKS</tspan></text>
<text x="${H.x}" y="${H.y}" fill="${FG}" font-family="${SANS}" font-size="64" font-weight="700">SIGNAL</text>
<rect x="${hx}" y="${H.y - 58}" width="${H.perdu + 2 * H.pad}" height="72" rx="2" fill="#fff"/>
<text x="${hx + H.pad}" y="${H.y}" fill="#000" font-family="${SANS}" font-size="64" font-weight="700">PERDU</text>
<text x="640" y="508" fill="${MUTED}" font-family="${MONO}" font-size="18" letter-spacing="5" text-anchor="middle">RECONNEXION EN COURS</text>
${meta
  .map(
    ([label, value], i) =>
      `<text x="${72 + i * 400}" y="594" fill="${MUTED}" font-family="${MONO}" font-size="12" letter-spacing="3">${label}</text>` +
      `<text x="${72 + i * 400}" y="622" fill="${FG}" font-family="${MONO}" font-size="18" font-weight="500">${esc(clip(value, 28))}</text>`,
  )
  .join("\n")}
<g>${BARS.map((c, i) => `<rect x="${(40 + i * barW).toFixed(2)}" y="${BARS_Y}" width="${(barW + 0.5).toFixed(2)}" height="24" fill="${c}"/>`).join("")}</g>
</svg>`;
}

export function loadLogo(path: string) {
  try {
    return readFileSync(path);
  } catch {
    return undefined;
  }
}
