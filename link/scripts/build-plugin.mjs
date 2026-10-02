// Construit le plugin OBS SYXTEE Link pour macOS : syxtee-link.plugin (module natif + agent) et l'installeur .pkg.
//   npm run plugin
// Sortie : PLUGIN_OUT (défaut ~/syxtee-link-plugin) : syxtee-link.plugin, SYXTEE-Link-<version>.pkg
// Prérequis : Node 24+, outils en ligne de commande Xcode (clang, pkgbuild, productbuild, codesign). Pas besoin de CMake ni de Qt.
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") {
  console.error("Ce script construit la version macOS. Pour Windows, voir link/README.md (workflow GitHub).");
  process.exit(1);
}

const root = resolve(fileURLToPath(import.meta.url), "../..");
const out = resolve((process.env.PLUGIN_OUT || "~/syxtee-link-plugin").replace(/^~(?=$|\/)/, homedir()));
const VERSION = "0.2.0";
const OBS_TAG = "32.0.0"; // en-têtes de l'API d'OBS : seule l'interface (stable) est utilisée, le plugin se lie à OBS au chargement
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: "inherit", ...opts });

const bundle = join(out, "syxtee-link.plugin");
const contents = join(bundle, "Contents");
rmSync(bundle, { recursive: true, force: true });
mkdirSync(join(contents, "MacOS"), { recursive: true });
mkdirSync(join(contents, "Resources"), { recursive: true });

// 1. Agent : un seul exécutable autonome (Node intégré), signé ad hoc.
const work = join(out, "work");
mkdirSync(work, { recursive: true });
run("npx", ["esbuild", join(root, "src/main.ts"), "--bundle", "--platform=node", "--format=cjs", "--target=node24", `--outfile=${join(work, "helper.cjs")}`], { cwd: root });
writeFileSync(join(work, "sea.json"), JSON.stringify({ main: join(work, "helper.cjs"), output: join(contents, "Resources", "syxtee-link-helper"), disableExperimentalSEAWarning: true }));
run(process.execPath, ["--build-sea", join(work, "sea.json")]);
try {
  run("codesign", ["--remove-signature", join(contents, "Resources", "syxtee-link-helper")], { stdio: "ignore" });
} catch {
  // rien à retirer
}
run("codesign", ["--force", "--sign", "-", join(contents, "Resources", "syxtee-link-helper")]);
chmodSync(join(contents, "Resources", "syxtee-link-helper"), 0o755);

// 2. En-têtes de l'API d'OBS (téléchargés une fois).
const headers = join(out, `obs-headers-${OBS_TAG}`);
if (!existsSync(join(headers, "libobs", "obs-module.h"))) {
  mkdirSync(headers, { recursive: true });
  run("sh", ["-c", `curl -sSL https://github.com/obsproject/obs-studio/archive/refs/tags/${OBS_TAG}.tar.gz | tar -xz -C "${headers}" --strip-components=1 --include '*/libobs/*.h' --include '*/frontend/api/*.h'`]);
}

// obsconfig.h est généré par la compilation d'OBS : seules ces constantes (chemins) sont lues par les en-têtes.
writeFileSync(join(headers, "libobs", "obsconfig.h"), '#pragma once\n#define OBS_DATA_PATH "../Resources"\n#define OBS_INSTALL_PREFIX ""\n#define OBS_PLUGIN_DESTINATION "obs-plugins"\n');

// simde : bibliothèque d'en-têtes requise par ceux d'OBS (instructions SSE sur Apple Silicon).
if (!existsSync(join(headers, "simde", "simde", "x86", "sse2.h"))) {
  mkdirSync(join(headers, "simde"), { recursive: true });
  run("sh", ["-c", `curl -sSL https://github.com/simd-everywhere/simde/archive/refs/tags/v0.8.2.tar.gz | tar -xz -C "${join(headers, "simde")}" --strip-components=1 --include '*/simde/*'`]);
}

// 3. Module natif, universel (Apple Silicon et Intel). Les symboles d'OBS sont résolus par OBS au chargement.
run("clang", [
  "-arch", "arm64", "-arch", "x86_64", "-bundle", "-undefined", "dynamic_lookup", "-mmacosx-version-min=13.0", "-O2", "-Wall",
  `-I${join(headers, "libobs")}`, `-I${join(headers, "simde")}`, `-I${join(headers, "frontend", "api")}`,
  "-o", join(contents, "MacOS", "syxtee-link"), join(root, "plugin", "syxtee-link.c"),
]);

writeFileSync(
  join(contents, "Info.plist"),
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleDevelopmentRegion</key><string>en</string>
  <key>CFBundleExecutable</key><string>syxtee-link</string>
  <key>CFBundleIdentifier</key><string>fr.syxtee.obs-plugin</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>SYXTEE Link</string>
  <key>CFBundlePackageType</key><string>BNDL</string>
  <key>CFBundleShortVersionString</key><string>${VERSION}</string>
  <key>CFBundleVersion</key><string>${VERSION}</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHumanReadableCopyright</key><string>SYXTEE NETWORKS</string>
</dict></plist>
`,
);
run("codesign", ["--force", "--deep", "--sign", "-", bundle]);

// 4. Installeur .pkg : s'installe dans le dossier de l'utilisateur (~/Library/Application Support/obs-studio/plugins), sans mot de passe.
const payload = join(work, "payload", "Library", "Application Support", "obs-studio", "plugins");
rmSync(join(work, "payload"), { recursive: true, force: true });
mkdirSync(payload, { recursive: true });
run("ditto", [bundle, join(payload, "syxtee-link.plugin")]);
const component = join(work, "component.pkg");
run("pkgbuild", ["--root", join(work, "payload"), "--identifier", "fr.syxtee.obs-plugin.pkg", "--version", VERSION, "--install-location", "/", component]);
writeFileSync(
  join(work, "distribution.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="1">
  <title>SYXTEE Link</title>
  <domains enable_anywhere="false" enable_currentUserHome="true" enable_localSystem="false"/>
  <options customize="never" require-scripts="false"/>
  <choices-outline><line choice="default"/></choices-outline>
  <choice id="default" title="SYXTEE Link"><pkg-ref id="fr.syxtee.obs-plugin.pkg"/></choice>
  <pkg-ref id="fr.syxtee.obs-plugin.pkg" version="${VERSION}" onConclusion="none">component.pkg</pkg-ref>
</installer-gui-script>
`,
);
const pkg = join(out, `SYXTEE-Link-${VERSION}.pkg`);
rmSync(pkg, { force: true });
run("productbuild", ["--distribution", join(work, "distribution.xml"), "--package-path", work, pkg]);
console.log(`\nPrêt :\n  ${bundle}\n  ${pkg}`);
