import assert from "node:assert/strict";
import { test } from "node:test";
import { guardianArgs, guardianVbs, RUN_KEY } from "../src/winstartup.ts";
import { encodePs, psArgs } from "../src/winobs.ts";

test("script VBS : commande entre guillemets doublés, sans console", () => {
  const vbs = guardianVbs(guardianArgs("C:\\Users\\Frédéric\\AppData\\Roaming\\obs-studio\\plugins\\syxtee-link\\bin\\64bit\\syxtee-link-helper.exe", null));
  assert.equal(vbs, 'CreateObject("WScript.Shell").Run """C:\\Users\\Frédéric\\AppData\\Roaming\\obs-studio\\plugins\\syxtee-link\\bin\\64bit\\syxtee-link-helper.exe"" ""guardian""", 0, False\r\n');
});

test("arguments du Gardien : exécutable autonome, ou Node avec le script", () => {
  assert.deepEqual(guardianArgs("helper.exe", null), ["helper.exe", "guardian"]);
  assert.deepEqual(guardianArgs("helper.exe", null, ["--child"]), ["helper.exe", "guardian", "--child"]);
  const withScript = guardianArgs("node.exe", "main.ts");
  assert.equal(withScript.at(-1), "guardian");
  assert.ok(withScript.includes("main.ts"));
});

test("PowerShell : script passé en UTF-16 LE base64 (accents conservés)", () => {
  const script = "Write-Host 'sauvegarde des scènes'";
  assert.equal(Buffer.from(encodePs(script), "base64").toString("utf16le"), script);
  const args = psArgs(script);
  assert.equal(args[args.indexOf("-EncodedCommand") + 1], encodePs(script));
});

test("démarrage : clé Run de l'utilisateur (pas de droits administrateur)", () => {
  assert.match(RUN_KEY, /^HKCU\\/);
});
