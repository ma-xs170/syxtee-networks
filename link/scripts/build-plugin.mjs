// Construit le plugin OBS SYXTEE Link pour macOS : syxtee-link.plugin (module natif + agent) et l'installeur .pkg.
//   npm run plugin
// Sortie : PLUGIN_OUT (défaut ~/syxtee-link-plugin) : syxtee-link.plugin, SYXTEE-Link-<version>.pkg
// Prérequis : Node 24+, outils en ligne de commande Xcode (clang, pkgbuild, productbuild, codesign), OBS installé, en-têtes de la même version de Qt que celle d'OBS (voir le message d'erreur du script).
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") {
  console.error("Ce script construit la version macOS. Pour Windows, voir link/README.md (workflow GitHub).");
  process.exit(1);
}

const root = resolve(fileURLToPath(import.meta.url), "../..");
const out = resolve((process.env.PLUGIN_OUT || "~/syxtee-link-plugin").replace(/^~(?=$|\/)/, homedir()));
const VERSION = "0.3.0";
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

// 3. Module natif, universel (Apple Silicon et Intel) : partie C (lancement de l'agent) + partie C++/Qt (menu « SYXTEE », fenêtre Studio).
// Les symboles d'OBS sont résolus par OBS au chargement. Qt : en-têtes de la version exacte d'OBS (~/Qt/<version>), et l'édition de liens se fait
// contre les frameworks Qt d'OBS (même version majeure, chargés par OBS : jamais deux Qt dans le processus).
const obsApp = process.env.OBS_APP || "/Applications/OBS.app";
const obsFrameworks = join(obsApp, "Contents", "Frameworks");
if (!existsSync(join(obsFrameworks, "QtWidgets.framework"))) {
  console.error(`OBS introuvable (${obsApp}). Installe OBS ou donne OBS_APP.`);
  process.exit(1);
}
// Les en-têtes Qt doivent être CEUX de la version de Qt embarquée dans OBS : on lit celle d'OBS, puis on cherche des en-têtes identiques.
const obsQt = execFileSync("/usr/libexec/PlistBuddy", ["-c", "Print CFBundleVersion", join(obsFrameworks, "QtCore.framework", "Versions", "A", "Resources", "Info.plist")], { encoding: "utf8" }).trim();
const headersVersion = (lib) => {
  try {
    return /QTCORE_VERSION_STR\s+"([\d.]+)"/.exec(readFileSync(join(lib, "QtCore.framework", "Headers", "qtcoreversion.h"), "utf8"))?.[1] ?? "";
  } catch {
    return "";
  }
};
const candidates = [process.env.QT_LIB, join(homedir(), "Qt", obsQt, "macos", "lib")];
try {
  candidates.push(join(execFileSync("brew", ["--prefix", "qt"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(), "lib"));
} catch {
  // pas de Homebrew
}
const found = candidates.filter((c) => c && headersVersion(c));
let qtLib = found.find((c) => headersVersion(c) === obsQt);
if (!qtLib && process.env.ALLOW_QT_MISMATCH && found[0]) {
  qtLib = found[0];
  console.warn(`Attention : en-têtes Qt ${headersVersion(qtLib)} pour un OBS en Qt ${obsQt} (ALLOW_QT_MISMATCH).`);
}
if (!qtLib) {
  console.error(
    `OBS embarque Qt ${obsQt} : il faut les en-têtes de CETTE version.\n` +
      `  pip install aqtinstall && aqt install-qt mac desktop ${obsQt} clang_64 -O ~/Qt\n` +
      `(ou donne QT_LIB=<dossier lib de Qt ${obsQt}>). En-têtes trouvés : ${found.map((c) => `${headersVersion(c)} (${c})`).join(", ") || "aucun"}.`,
  );
  process.exit(1);
}
console.log(`Qt ${obsQt} : en-têtes ${qtLib}`);
const qtInc = ["QtCore", "QtGui", "QtWidgets", "QtNetwork"].map((m) => `-I${join(qtLib, `${m}.framework`, "Headers")}`);
const archs = ["-arch", "arm64", "-arch", "x86_64"];
const common = ["-mmacosx-version-min=13.0", "-O2", "-Wall", "-fPIC", "-Wno-deprecated-declarations", `-I${join(headers, "libobs")}`, `-I${join(headers, "simde")}`, `-I${join(headers, "frontend", "api")}`];
const objs = [];
for (const [src, std] of [["syxtee-link.c", null], ["qt/studio_ui.cpp", "-std=c++17"], ["qt/studio_menu.cpp", "-std=c++17"], ["qt/obsctl.cpp", "-std=c++17"]]) {
  const obj = join(work, `${src.replace(/\W/g, "_")}.o`);
  const cc = std ? "clang++" : "clang";
  run(cc, [...archs, "-c", ...common, ...(std ? [std, `-F${qtLib}`, ...qtInc] : []), join(root, "plugin", src), "-o", obj]);
  objs.push(obj);
}
run("clang++", [
  ...archs, "-bundle", "-undefined", "dynamic_lookup", "-mmacosx-version-min=13.0", ...objs,
  `-F${obsFrameworks}`, "-framework", "QtCore", "-framework", "QtGui", "-framework", "QtWidgets", "-framework", "QtNetwork",
  "-Wl,-rpath,@executable_path/../Frameworks", "-o", join(contents, "MacOS", "syxtee-link"),
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
run("ditto", ["--norsrc", "--noextattr", "--noqtn", bundle, join(payload, "syxtee-link.plugin")]);
try {
  run("xattr", ["-cr", join(work, "payload")]); // pas d'attributs étendus dans l'installeur (pkgbuild les écrirait en fichiers « ._ »)
} catch {
  // rien à nettoyer
}
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
