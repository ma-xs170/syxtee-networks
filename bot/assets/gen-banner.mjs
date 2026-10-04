// Génère assets/banner.png (bandeau dégradé noir → rouge SYXTEE). Usage : node assets/gen-banner.mjs (depuis bot/, sharp du site).
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const sharp = createRequire(import.meta.url)("../../node_modules/sharp");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="300" viewBox="0 0 1200 300">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d0e11"/><stop offset="0.55" stop-color="#1b1e24"/><stop offset="1" stop-color="#5a1114"/></linearGradient>
<radialGradient id="glow" cx="0.95" cy="1.1" r="0.7"><stop offset="0" stop-color="#d92d2d" stop-opacity="0.85"/><stop offset="1" stop-color="#d92d2d" stop-opacity="0"/></radialGradient>
<linearGradient id="bar" x1="0" x2="1"><stop offset="0" stop-color="#d92d2d"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
</defs>
<rect width="1200" height="300" fill="url(#bg)"/><rect width="1200" height="300" fill="url(#glow)"/>
<g stroke="#ffffff" stroke-opacity="0.06" fill="none"><path d="M0 60H1200M0 120H1200M0 180H1200M0 240H1200"/></g>
<text x="70" y="150" font-family="Helvetica Neue, Arial, sans-serif" font-weight="800" font-size="92" letter-spacing="6" fill="#ffffff">SYXTEE</text>
<text x="72" y="208" font-family="Menlo, monospace" font-size="30" letter-spacing="14" fill="#d92d2d">NETWORKS</text>
<rect x="72" y="236" width="360" height="5" rx="2.5" fill="url(#bar)"/>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL("./banner.png", import.meta.url)));
