import assert from "node:assert/strict";
import { test } from "node:test";
import { formatVersion, nextVersion } from "./releases.ts";

test("première version : part de 0.0.0", () => {
  assert.equal(formatVersion(nextVersion(null, "patch")), "0.0.1");
  assert.equal(formatVersion(nextVersion(null, "minor")), "0.1.0");
  assert.equal(formatVersion(nextVersion(null, "major")), "1.0.0");
});

test("mineure remet le correctif à 0, majeure remet tout à 0", () => {
  const v = { major: 1, minor: 4, patch: 7 };
  assert.equal(formatVersion(nextVersion(v, "patch")), "1.4.8");
  assert.equal(formatVersion(nextVersion(v, "minor")), "1.5.0");
  assert.equal(formatVersion(nextVersion(v, "major")), "2.0.0");
});

test("notification : titre patchnote, Markdown retiré, 500 caractères au plus", async () => {
  const { releaseNotification } = await import("./releases.ts");
  const n = releaseNotification({ major: 1, minor: 2, patch: 3 }, "Titre", "**Nouveau**\n- [lien](https://x.fr) ok\n" + "a".repeat(900));
  assert.equal(n.title, "Patchnote v1.2.3");
  assert.ok(n.body.startsWith("Titre\nNouveau\n• lien ok"));
  assert.ok(n.body.length <= 500 && n.body.endsWith("…"));
});
