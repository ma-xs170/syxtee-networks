import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createRecordings, recordArgs } from "../src/recordings.ts";
import type { Relay } from "../src/relays.ts";

const USER = "00000000-0000-0000-0000-000000000001";
const RID = "10000000-0000-0000-0000-000000000003";
const relay = (record: boolean): Relay =>
  ({ id: RID, user_id: USER, name: "R", protocol: "srtla", server: "x", publish_id: "p", play_id: "play_e", out_publish_id: "o", out_play_id: "op", cam_key: null, mode: "direct", record, status: "live", archived: false, created_at: "", rotated_at: null, last_live_at: null }) as Relay;

function harness(o: { quota?: number; free?: number } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "rec-"));
  const started: { args: string[]; stopped: boolean }[] = [];
  const rec = createRecordings({
    dir, host: "127.0.0.1", port: 4000, secret: "s".repeat(32), quota: o.quota ?? 1000, minFreeBytes: 100, log: () => {},
    freeBytes: async () => o.free ?? 10_000,
    probeImpl: async () => "h264",
    superviseImpl: ((_n: string, _c: string, args: string[]) => {
      const p = { args, stopped: false };
      started.push(p);
      return { stop: () => (p.stopped = true), running: () => !p.stopped };
    }) as never,
  });
  const put = (name: string, size: number) => {
    mkdirSync(join(dir, USER, RID), { recursive: true });
    writeFileSync(join(dir, USER, RID, name), Buffer.alloc(size));
  };
  return { rec, started, put };
}

test("arguments ffmpeg : vidéo copiée, audio AAC, segments MOV fragmentés par défaut", () => {
  const a = recordArgs({ host: "h", port: 4000, playId: "play_x", dir: "/d", segmentS: 900 });
  assert.match(a[a.indexOf("-i") + 1], /streamid=play_x/);
  assert.equal(a[a.indexOf("-c:v") + 1], "copy");
  assert.equal(a[a.indexOf("-c:a") + 1], "aac");
  assert.ok(a.includes("-analyzeduration"));
  assert.equal(a[a.indexOf("-segment_format") + 1], "mov");
  assert.equal(a.at(-1), "/d/%Y%m%d-%H%M%S.mov");
  assert.ok(!a.includes("-tag:v"));
});

test("arguments ffmpeg : MP4 au choix, étiquette hvc1 pour le H.265", () => {
  const a = recordArgs({ host: "h", port: 4000, playId: "play_x", dir: "/d", segmentS: 900, format: "mp4", hevc: true });
  assert.equal(a[a.indexOf("-segment_format") + 1], "mp4");
  assert.equal(a.at(-1), "/d/%Y%m%d-%H%M%S.mp4");
  assert.equal(a[a.indexOf("-tag:v") + 1], "hvc1");
});

test("n'enregistre que les relais en direct dont l'option est activée, et s'arrête avec eux", async () => {
  const { rec, started } = harness();
  await rec.sync([relay(false)]);
  assert.equal(started.length, 0);
  await rec.sync([relay(true)]);
  assert.equal(started.length, 1);
  await rec.sync([relay(true)]);
  assert.equal(started.length, 1);
  await rec.sync([]);
  assert.equal(started[0].stopped, true);
});

test("quota plein : pas d'enregistrement, et l'état est signalé", async () => {
  const { rec, started, put } = harness({ quota: 1000 });
  put("20260101-000000.mp4", 1000);
  await rec.sync([relay(true)]);
  assert.equal(started.length, 0);
  assert.equal((await rec.usage(USER)).stopped, "quota");
});

test("disque du serveur presque plein : pas d'enregistrement", async () => {
  const { rec, started } = harness({ free: 50 });
  await rec.sync([relay(true)]);
  assert.equal(started.length, 0);
  assert.equal((await rec.usage(USER)).stopped, "disk");
});

test("liste, lecture et suppression : noms de fichiers validés, un compte ne voit que les siens", async () => {
  const { rec, put } = harness();
  put("20260101-000000.mp4", 10);
  assert.equal((await rec.files(USER)).length, 1);
  assert.equal(await rec.open(USER, RID, "../../x.mp4"), null);
  assert.equal(await rec.open("00000000-0000-0000-0000-000000000002", RID, "20260101-000000.mp4"), null);
  assert.equal(await rec.remove(USER, RID, "20260101-000000.mp4"), true);
  assert.equal((await rec.files(USER)).length, 0);
});

test("lien signé : valable 5 min, refusé si modifié", () => {
  const { rec } = harness();
  const t = rec.sign(USER, RID, "20260101-000000.mp4", 1000);
  assert.deepEqual(rec.verify(t, 2000), { user: USER, relay: RID, file: "20260101-000000.mp4" });
  assert.equal(rec.verify(t, 1000 + 6 * 60_000), null);
  assert.equal(rec.verify(`x${t}`, 2000), null);
});
