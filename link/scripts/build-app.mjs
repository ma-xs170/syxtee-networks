// Construit l'application SYXTEE Link (fenêtre + barre de menu) avec Electron.
//   node scripts/build-app.mjs --dev    prépare et lance l'application (test)
//   node scripts/build-app.mjs          construit l'installeur de la plateforme courante (macOS : .dmg et .zip, Windows : .exe)
// Tout est assemblé dans APP_OUT (défaut ~/syxtee-link-app), jamais dans le dossier du projet.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const out = resolve((process.env.APP_OUT || "~/syxtee-link-app").replace(/^~(?=$|\/)/, homedir()));
const stage = join(out, "stage");
const win = process.platform === "win32";
const mac = process.platform === "darwin";
const dev = process.argv.includes("--dev");
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: "inherit", shell: win, ...opts });

rmSync(join(stage, "dist"), { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

// 1. Code : processus principal (bundle), préchargement, fenêtre.
run("npx", ["esbuild", join(root, "app/main.ts"), "--bundle", "--platform=node", "--format=cjs", "--target=node22", "--external:electron", `--outfile=${join(stage, "main.cjs")}`], { cwd: root });
for (const f of ["preload.cjs", "index.html", "ui.js"]) copyFileSync(join(root, "app", f), join(stage, f));

// 2. Icône : le logo, en carré noir pour macOS et Windows.
const logo = join(root, "..", "public", "logo.png");
const icon = join(stage, "icon.png");
copyFileSync(logo, icon);
if (mac) run("sips", ["--padToHeightWidth", "1260", "1260", "--padColor", "000000", icon, "--resampleHeightWidth", "1024", "1024"], { stdio: "ignore" });

// 3. package.json de l'application et dépendances de build.
writeFileSync(
  join(stage, "package.json"),
  JSON.stringify(
    {
      name: "syxtee-link",
      productName: "SYXTEE Link",
      version: "0.1.0",
      description: "SYXTEE Link : pilote OBS à distance depuis SYXTEE Studio.",
      author: "SYXTEE NETWORKS",
      main: "main.cjs",
      devDependencies: { electron: "^44.5.1", "electron-builder": "^26.15.3" },
      build: {
        appId: "fr.syxtee.link",
        productName: "SYXTEE Link",
        directories: { output: join(out, "release") },
        files: ["main.cjs", "preload.cjs", "index.html", "ui.js", "icon.png", "package.json"],
        mac: { category: "public.app-category.video", target: [{ target: "dmg", arch: ["arm64", "x64"] }, { target: "zip", arch: ["arm64", "x64"] }], icon: "icon.png", identity: "-", hardenedRuntime: false, extendInfo: { LSUIElement: false } },
        win: { target: [{ target: "nsis", arch: ["x64"] }], icon: "icon.png" },
        nsis: { oneClick: true, perMachine: false },
        artifactName: "SYXTEE-Link-${version}-${os}-${arch}.${ext}",
      },
    },
    null,
    2,
  ),
);
run("npm", ["install", "--no-audit", "--no-fund"], { cwd: stage });

if (dev) run("npx", ["electron", "."], { cwd: stage });
else {
  run("npx", ["electron-builder", mac ? "--mac" : "--win", "--publish", "never"], { cwd: stage });
  console.log(`\nPrêt : ${join(out, "release")}`);
}
