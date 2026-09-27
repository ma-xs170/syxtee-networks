import { readFileSync } from "node:fs";

// Mire SYXTEE (écran de coupure) en SVG, rendue par rsvgoverlay dans la régie. Repère 1280 × 720, mis à l'échelle.
// L'heure est ajoutée en direct par clockoverlay (coin haut-droit), pas ici.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

// Bande de mire (barres SMPTE 75 %).
const BARS = ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"];

export function mireSvg(o: { width: number; height: number; relay: string; source: string; session: string; logoPng?: Buffer }) {
  const logo = o.logoPng ? `<image x="80" y="74" width="26" height="36" href="data:image/png;base64,${o.logoPng.toString("base64")}"/>` : "";
  const textX = o.logoPng ? 122 : 80;
  const barW = 1280 / BARS.length;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${o.width}" height="${o.height}" viewBox="0 0 1280 720">
<rect width="1280" height="720" fill="#000"/>
<rect x="40" y="40" width="1200" height="560" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="1.5"/>
<path d="M40 150H1240" stroke="#fff" stroke-opacity="0.12"/>
${logo}
<text x="${textX}" y="100" fill="#f5f5f5" font-family="DejaVu Sans, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="4">SYXTEE <tspan fill="#8a8a8a" font-weight="400">NETWORKS</tspan></text>
<circle cx="640" cy="262" r="6" fill="#ff3b30"/>
<text x="640" y="336" fill="#f5f5f5" font-family="DejaVu Sans, Helvetica, sans-serif" font-size="46" font-weight="700" text-anchor="middle" letter-spacing="3">SIGNAL PERDU</text>
<text x="640" y="388" fill="#8a8a8a" font-family="DejaVu Sans Mono, Menlo, monospace" font-size="20" text-anchor="middle" letter-spacing="4">RECONNEXION EN COURS</text>
<text x="80" y="566" fill="#8a8a8a" font-family="DejaVu Sans Mono, Menlo, monospace" font-size="16" letter-spacing="2">RELAIS : ${esc(o.relay)}    SOURCE : ${esc(o.source)}    SESSION : ${esc(o.session)}</text>
<g>${BARS.map((c, i) => `<rect x="${(i * barW).toFixed(2)}" y="640" width="${(barW + 0.5).toFixed(2)}" height="80" fill="${c}"/>`).join("")}</g>
</svg>`;
}

export function loadLogo(path: string) {
  try {
    return readFileSync(path);
  } catch {
    return undefined;
  }
}
