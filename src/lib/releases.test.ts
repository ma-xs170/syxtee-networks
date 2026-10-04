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
