import assert from "node:assert/strict";
import { test } from "node:test";
import { redact } from "../src/logexport.ts";

test("journaux : adresses de flux et jetons masqués", () => {
  const t = redact("input: srt://relais.syxtee-networks.fr:4000?streamid=play_2ca21b960fdab606&latency=120000\nAuthorization: Bearer abcdef123456\n\"token\":\"supersecretvalue\"");
  assert.ok(!t.includes("play_2ca21b"));
  assert.ok(!t.includes("abcdef123456"));
  assert.ok(!t.includes("supersecretvalue"));
  assert.ok(t.includes("latency=120000"));
});
