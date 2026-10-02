import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { test } from "node:test";
import { createBackups } from "../src/backups.ts";
import { fakeDb } from "./fake-db.ts";

const U = "00000000-0000-4000-8000-000000000001";
const V = "00000000-0000-4000-8000-000000000002";
const meta = { name: "SYXTEE", collection: "SYXTEE", media: 4, obs: "32.2.2", host: "Mac" };

function setup(quota = 1000) {
  const db = fakeDb({}, { link_backups: () => ({ id: crypto.randomUUID(), created_at: new Date().toISOString() }) });
  const dir = mkdtempSync(join(tmpdir(), "bk-"));
  return { b: createBackups({ db: db as never, dir, quota }), dir, db };
}
const body = (n: number, fill = 65) => Readable.from([Buffer.alloc(n, fill)]);

test("envoi, liste, lecture, suppression", async () => {
  const { b, dir } = setup();
  const r = await b.put(U, meta, body(300), 300);
  assert.ok("id" in r);
  const id = "id" in r ? r.id : "";
  assert.equal(readFileSync(join(dir, U, `${id}.tgz`)).length, 300);
  assert.deepEqual(await b.usage(U), { used: 300, quota: 1000 });
  const rows = await b.list(U);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].media_count, 4);
  const f = await b.open(U, id);
  assert.ok(f && f.size === 300);
  f?.stream.destroy();
  assert.equal(await b.open(V, id), null); // un autre compte ne voit rien
  assert.equal(await b.remove(V, id), false);
  assert.equal(await b.remove(U, id), true);
  assert.equal(existsSync(join(dir, U, `${id}.tgz`)), false);
  assert.equal((await b.usage(U)).used, 0);
});

test("quota : refusé avant d'écrire, cumul pris en compte, par compte", async () => {
  const { b, dir } = setup(1000);
  assert.ok("id" in (await b.put(U, meta, body(600), 600)));
  assert.deepEqual(await b.put(U, meta, body(500), 500), { error: "quota" });
  assert.deepEqual(readdirSync(join(dir, U)).filter((f) => f.endsWith(".part")), []);
  assert.ok("id" in (await b.put(U, meta, body(400), 400))); // pile 1000
  assert.deepEqual(await b.put(U, meta, body(1), 1), { error: "quota" });
  assert.ok("id" in (await b.put(V, meta, body(900), 900))); // l'autre compte a son propre quota
});

test("envois simultanés : la réservation empêche de dépasser le quota", async () => {
  const { b } = setup(1000);
  const slow = (n: number) =>
    new Readable({
      read() {
        setTimeout(() => {
          this.push(Buffer.alloc(n, 1));
          this.push(null);
        }, 30);
      },
    });
  const [a, c] = await Promise.all([b.put(U, meta, slow(700), 700), b.put(U, meta, slow(700), 700)]);
  const ok = [a, c].filter((r) => "id" in r).length;
  assert.equal(ok, 1);
  assert.equal([a, c].filter((r) => "error" in r && r.error === "quota").length, 1);
});

test("taille annoncée trompeuse ou absente : rejeté, rien ne reste sur le disque", async () => {
  const { b, dir } = setup();
  assert.deepEqual(await b.put(U, meta, body(100), 0), { error: "length_required" });
  assert.deepEqual(await b.put(U, meta, body(100), 50), { error: "aborted" }); // plus long que annoncé
  assert.deepEqual(await b.put(U, meta, body(100), 200), { error: "aborted" }); // plus court
  assert.deepEqual(readdirSync(join(dir, U)), []);
  assert.equal((await b.usage(U)).used, 0);
});

test("métadonnées nettoyées (nom, caractères de contrôle)", async () => {
  const { b } = setup();
  await b.put(U, { ...meta, name: "  Mon\nlive\u0000 " + "x".repeat(100), media: -5 }, body(10), 10);
  const [row] = await b.list(U);
  assert.ok(!/[\u0000-\u001f]/.test(row.name));
  assert.ok(row.name.length <= 60);
  assert.equal(row.media_count, 0);
});
