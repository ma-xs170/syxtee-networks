// Construit l'exécutable autonome de SYXTEE Link (Node « single executable »), pour la plateforme qui exécute ce script :
//   macOS   → syxtee-link  (signé ad hoc : macOS tue sinon un exécutable modifié)
//   Windows → syxtee-link.exe
// Usage : npm run sea            (sortie dans link/dist)
//         SEA_OUT=~/syxtee-link npm run sea   (sortie ailleurs, si le dossier du projet refuse l'écriture)
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const win = process.platform === "win32";
const dir = resolve((process.env.SEA_OUT || "dist").replace(/^~(?=$|\/)/, homedir()));
const bundle = join(dir, "syxtee-link.cjs");
const out = join(dir, win ? "syxtee-link.exe" : "syxtee-link");
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit", shell: win });

mkdirSync(dir, { recursive: true });
run("npx", ["esbuild", "src/main.ts", "--bundle", "--platform=node", "--format=cjs", "--target=node24", `--outfile=${bundle}`]);
writeFileSync(join(dir, "sea.json"), JSON.stringify({ main: bundle, output: out, disableExperimentalSEAWarning: true }));
run(process.execPath, ["--build-sea", join(dir, "sea.json")]);
if (process.platform === "darwin") {
  try {
    run("codesign", ["--remove-signature", out]);
  } catch {
    // pas de signature à retirer
  }
  run("codesign", ["--force", "--sign", "-", out]);
}
console.log(`Prêt : ${out}`);
