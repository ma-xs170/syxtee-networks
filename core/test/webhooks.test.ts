import assert from "node:assert/strict";
import { test } from "node:test";
import { isInternalIp, sign } from "../src/webhooks.ts";

test("adresses internes refusées", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.5", "172.20.0.1", "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1", "0.0.0.0"]) assert.equal(isInternalIp(ip), true, ip);
  for (const ip of ["1.1.1.1", "8.8.8.8", "172.32.0.1", "2606:4700::1111"]) assert.equal(isInternalIp(ip), false, ip);
});

test("signature stable et dépendante du secret", () => {
  const a = sign("s1", "{}", 100);
  assert.equal(a, sign("s1", "{}", 100));
  assert.notEqual(a, sign("s2", "{}", 100));
  assert.match(a, /^t=100,v1=[0-9a-f]{64}$/);
});
