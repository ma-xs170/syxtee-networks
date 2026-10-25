// Captures figées de la vraie interface du contrôle à distance (ordinateur et téléphone) : ouvre /dev/remote-shots
// et enregistre un PNG par écran dans public/images/remote (suffixe -v2 : change le nom à chaque refonte pour contourner le cache des images).
// Usage : npm run dev, puis node scripts/capture-remote-ui.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = [
  ["shot-bureau", "controle-bureau-v2"],
  ["shot-mobile-scenes", "controle-mobile-v2"],
  ["shot-mobile-sources", "controle-mobile-sources-v2"],
  ["shot-mobile-mixer", "controle-mobile-mixer-v2"],
  ["shot-mobile-controls", "controle-mobile-controles-v2"],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, colorScheme: "dark", reducedMotion: "reduce" });
await page.goto(`${BASE}/dev/remote-shots`, { waitUntil: "networkidle" });
await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
await page.waitForTimeout(800);
for (const [id, name] of SHOTS) {
  await page.locator(`#${id}`).screenshot({ path: `public/images/remote/${name}.png` });
  console.log("ok", name);
}
await browser.close();
