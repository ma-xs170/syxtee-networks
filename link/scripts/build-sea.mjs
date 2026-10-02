// Construit l'exécutable autonome de SYXTEE Link (Node « single executable »), pour la plateforme qui exécute ce script :
//   macOS   → dist/syxtee-link  (signé ad hoc : macOS tue sinon un exécutable modifié)
//   Windows → dist/syxtee-link.exe
// Usage : npm run sea
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const win = process.platform === "win32";
const out = win ? "dist/syxtee-link.exe" : "dist/syxtee-link";
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit", shell: win });

mkdirSync("dist", { recursive: true });
run("npx", ["esbuild", "src/main.ts", "--bundle", "--platform=node", "--format=cjs", "--target=node24", "--outfile=dist/syxtee-link.cjs"]);
writeFileSync("dist/sea.json", JSON.stringify({ main: "dist/syxtee-link.cjs", output: out, disableExperimentalSEAWarning: true }));
run(process.execPath, ["--build-sea", "dist/sea.json"]);
if (process.platform === "darwin") {
  try {
    run("codesign", ["--remove-signature", out]);
  } catch {
    // pas de signature à retirer
  }
  run("codesign", ["--force", "--sign", "-", out]);
}
console.log(`Prêt : ${out}`);
