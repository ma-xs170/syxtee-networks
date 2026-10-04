import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createRecordings } from "../src/recordings.ts";

const USER = "00000000-0000-0000-0000-000000000001";
const RID = "10000000-0000-0000-0000-000000000003";

test("purge : supprime les fichiers de plus de 15 jours, garde les récents", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rec-"));
  const rec = createRecordings({ dir, host: "h", port: 1, secret: "s".repeat(32), minFreeBytes: 0, log: () => {}, freeBytes: async () => 1e12 });
  mkdirSync(join(dir, USER, RID), { recursive: true });
  const put = (name: string, ageDays: number) => {
    const p = join(dir, USER, RID, name);
    writeFileSync(p, "x");
    const t = (Date.now() - ageDays * 86_400_000) / 1000;
    utimesSync(p, t, t);
  };
  put("20260101-000000.mp4", 16);
  put("20260102-000000.mp4", 14);
  assert.equal(await rec.purge(), 1);
  const left = await rec.files(USER);
  assert.deepEqual(left.map((f) => f.file), ["20260102-000000.mp4"]);
  assert.ok(Date.parse(left[0].expires_at) > Date.now());
});
