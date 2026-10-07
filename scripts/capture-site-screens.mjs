import { chromium } from "playwright";

// Captures réelles de l'interface (pages de démo /dev/vitrine, données d'exemple) pour les maquettes d'appareils de l'accueil.
// npm run dev, puis node scripts/capture-site-screens.mjs
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const out = "public/images/screens";
const hide = "nextjs-portal{display:none!important}";

const browser = await chromium.launch();
async function shot(tool, file, viewport, { mobile = false, scale = 1.5, wait = 1800, css = "" } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, colorScheme: "dark", reducedMotion: "reduce", isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/dev/vitrine/${tool}`, { waitUntil: "load" });
  await page.addStyleTag({ content: hide + css });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}/${file}` });
  console.log(file);
  await ctx.close();
}
// Santé du flux : 4 liens SRTLA réunis, débit, RTT.
await shot("sante", "sante-bureau.png", { width: 1100, height: 688 }, { css: "#capture{margin-top:0!important}" });
// Mes relais sur téléphone.
await shot("relais", "relais-mobile.png", { width: 390, height: 844 }, { mobile: true, scale: 2, css: "#capture{width:100%!important;padding:16px!important}" });
// Membres d'un espace partagé : équipe, rôles, invitation en attente.
await shot("membres", "membres-bureau.png", { width: 1100, height: 688 });
await browser.close();
process.exit(0);
