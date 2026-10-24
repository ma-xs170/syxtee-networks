import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DISCORD_RE, alertMessage, createAlerts, monthKey } from "../src/alerts.ts";
import { GRACE_MS, DROP_ALERT_MS, createSessionTracker, type SessionAlert, type SessionDb } from "../src/sessions.ts";

const URL_OK = "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz_0123456789-ABCD";
const U = "00000000-0000-0000-0000-000000000001";
const R = "10000000-0000-0000-0000-000000000001";

function fakeSupabase(row: Record<string, unknown> | null) {
  const updates: Record<string, unknown>[] = [];
  const db = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
      update: (patch: Record<string, unknown>) => ({ eq: async () => (updates.push(patch), { error: null }) }),
    }),
  } as unknown as SupabaseClient;
  return { db, updates };
}

test("seuls les webhooks Discord sont acceptés", () => {
  assert.ok(DISCORD_RE.test(URL_OK));
  for (const bad of ["http://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz", "https://evil.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz", "https://discord.com.evil.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz", "https://127.0.0.1/", "https://discord.com/api/webhooks/1/x"]) assert.ok(!DISCORD_RE.test(bad), bad);
});

test("messages : durée de coupure et plafond en Go", () => {
  assert.match(alertMessage("recovered", { offlineS: 41.6 }).description, /après 42 s/);
  assert.match(alertMessage("quota80", { usedBytes: 40e9, capBytes: 50e9 }).description, /40 Go sur 50 Go/);
});

test("alerte envoyée sur le webhook, une seule « flux perdu » par 5 min", async () => {
  let t = 1_000_000;
  const posts: { url: string; body: string }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => (posts.push({ url, body: String(init.body) }), { status: 204 })) as unknown as typeof fetch;
  const { db } = fakeSupabase({ discord_url: URL_OK, on_drop: true, on_quota: true, quota_notified: null });
  const a = createAlerts({ db, fetchImpl, now: () => t });
  assert.equal(await a.notify(U, "drop"), true);
  assert.equal(await a.notify(U, "drop"), false);
  t += 301_000;
  assert.equal(await a.notify(U, "drop"), true);
  assert.equal(posts.length, 2);
  assert.equal(posts[0].url, URL_OK);
  assert.match(posts[0].body, /Flux perdu/);
});

test("rien n'est envoyé sans webhook, avec une adresse non Discord, ou option coupée", async () => {
  const sent: string[] = [];
  const fetchImpl = (async (u: string) => (sent.push(u), { status: 204 })) as unknown as typeof fetch;
  for (const row of [null, { discord_url: null, on_drop: true, on_quota: true, quota_notified: null }, { discord_url: "https://evil.com/x", on_drop: true, on_quota: true, quota_notified: null }, { discord_url: URL_OK, on_drop: false, on_quota: true, quota_notified: null }]) {
    assert.equal(await createAlerts({ db: fakeSupabase(row).db, fetchImpl }).notify(U, "drop"), false);
  }
  assert.deepEqual(sent, []);
});

test("quota : 80 % puis 100 %, chaque seuil une seule fois par mois", async () => {
  const t = Date.UTC(2026, 9, 15);
  const sent: string[] = [];
  const fetchImpl = (async (_u: string, init: RequestInit) => (sent.push(String(init.body)), { status: 204 })) as unknown as typeof fetch;
  let row: Record<string, unknown> = { discord_url: URL_OK, on_drop: true, on_quota: true, quota_notified: null };
  const updates: Record<string, unknown>[] = [];
  const db = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
      update: (patch: Record<string, unknown>) => ({ eq: async () => ((row = { ...row, ...patch }), updates.push(patch), { error: null }) }),
    }),
  } as unknown as SupabaseClient;
  const a = createAlerts({ db, fetchImpl, now: () => t });
  await a.quota(U, 30e9, 50e9); // 60 % : rien
  await a.quota(U, 41e9, 50e9); // 80 %
  await a.quota(U, 42e9, 50e9); // déjà annoncé
  await a.quota(U, 50e9, 50e9); // 100 %
  await a.quota(U, 51e9, 50e9); // déjà annoncé
  assert.equal(sent.length, 2);
  assert.match(sent[0], /80 %/);
  assert.match(sent[1], /Plafond mensuel atteint/);
  assert.deepEqual(updates, [{ quota_notified: `${monthKey(t)}:80` }, { quota_notified: `${monthKey(t)}:100` }]);
});

test("suivi : alerte « perdu » après 20 s hors ligne, « revenu » à la reconnexion, rien sur un direct de moins d'1 min", async () => {
  let t = 1_000_000;
  const db: SessionDb = { insert: async () => "s1", update: async () => {}, closeStale: async () => 0 };
  const alerts: SessionAlert[] = [];
  const s = createSessionTracker({ db, relay: "bhs1", now: () => t, onAlert: (a) => alerts.push(a) });

  s.status(R, true, U);
  t += 30_000;
  s.status(R, false, U);
  t += DROP_ALERT_MS;
  await s.tick();
  assert.deepEqual(alerts, []); // direct de 50 s : fin volontaire probable

  s.status(R, true, U);
  t += 60_000;
  s.status(R, false, U);
  t += DROP_ALERT_MS;
  await s.tick();
  assert.deepEqual(alerts, [{ type: "drop", userId: U, relayId: R }]);
  await s.tick();
  assert.equal(alerts.length, 1); // une seule fois par coupure

  t += 10_000;
  s.status(R, true, U);
  assert.equal(alerts.length, 2);
  assert.equal(alerts[1].type, "recovered");
  assert.ok(Math.abs((alerts[1].offlineS ?? 0) - 30) < 1);
  void GRACE_MS;
});
