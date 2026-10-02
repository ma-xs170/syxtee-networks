// Captures des outils pour le site : ouvre les pages de démo /dev/vitrine/<outil> (vrais composants, données d'exemple)
// et enregistre un PNG par outil dans public/images/outils (suffixe -v2 : change le nom à chaque refonte pour contourner le cache des images). Usage : npm run dev, puis node scripts/capture-outils.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const TOOLS = ["relais", "sante", "accueil", "studio"];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2, colorScheme: "dark", reducedMotion: "reduce" });
for (const tool of TOOLS) {
  await page.goto(`${BASE}/dev/vitrine/${tool}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.locator("#capture").screenshot({ path: `public/images/outils/${tool}-v2.png` });
  console.log("ok", tool);
}
await browser.close();
