import assert from "node:assert/strict";
import { test } from "node:test";
import { DISCORD_RE } from "./alerts.ts";

test("webhook Discord : seule la bonne forme passe", () => {
  assert.ok(DISCORD_RE.test("https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz_0123456789-ABCD"));
  assert.ok(DISCORD_RE.test("https://discordapp.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz"));
  for (const bad of ["", "http://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz", "https://discord.com.evil.fr/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz", "https://169.254.169.254/latest", "https://discord.com/api/webhooks/12/abc"]) assert.ok(!DISCORD_RE.test(bad), bad);
});
