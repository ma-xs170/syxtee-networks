import assert from "node:assert/strict";
import { test } from "node:test";
import { createRist, ristArgs } from "../src/rist.ts";
import type { Relay } from "../src/relays.ts";

const relay: Relay = {
  id: "10000000-0000-0000-0000-000000000003", user_id: "00000000-0000-0000-0000-000000000001", name: "Encodeur", protocol: "rist", server: "nyc1",
  publish_id: `live_${"e".repeat(32)}`, play_id: "play_e", out_publish_id: "live_out_e", out_play_id: "play_out_e",
  cam_key: null, rist_port: 6042, rist_secret: "s".repeat(48), mode: "direct", status: "offline", archived: false, created_at: "", rotated_at: null, last_live_at: null,
};

function harness() {
  const started: { name: string; args: string[]; stopped: boolean }[] = [];
  const rist = createRist({
    output: (id) => `srt://127.0.0.1:4001?streamid=${id}`,
    log: () => {},
    superviseImpl: ((name: string, _cmd: string, args: string[]) => {
      const p = { name, args, stopped: false };
      started.push(p);
      return { stop: () => (p.stopped = true), running: () => !p.stopped };
    }) as never,
  });
  return { rist, started };
}

test("arguments ffmpeg : écoute le port du relais, profil Main chiffré AES-256, sortie SRT", () => {
  const a = ristArgs({ port: 6042, secret: "abc" }, "srt://x");
  assert.equal(a[a.indexOf("-i") + 1], "rist://@:6042");
  assert.equal(a[a.indexOf("-secret") + 1], "abc");
  assert.equal(a[a.indexOf("-encryption") + 1], "256");
  assert.equal(a[a.indexOf("-rist_profile") + 1], "main");
  assert.equal(a.at(-1), "srt://x");
});

test("un écouteur par relais RIST autorisé, rien pour les autres protocoles ni les relais archivés", () => {
  const { rist, started } = harness();
  rist.setKeys([relay, { ...relay, id: "a", protocol: "rtmp" }, { ...relay, id: "b", archived: true }, { ...relay, id: "c", rist_secret: null }]);
  assert.equal(started.length, 1);
  assert.equal(rist.listening(relay.id), true);
  assert.equal(started[0]!.args.at(-1), `srt://127.0.0.1:4001?streamid=${relay.publish_id}`);
  rist.setKeys([relay]); // inchangé : pas de relance
  assert.equal(started.length, 1);
});

test("secret régénéré : écouteur relancé ; relais archivé ou retiré : écouteur arrêté", () => {
  const { rist, started } = harness();
  rist.setKeys([relay]);
  rist.setKeys([{ ...relay, rist_secret: "n".repeat(48) }]);
  assert.equal(started.length, 2);
  assert.equal(started[0]!.stopped, true);
  assert.equal(started[1]!.args[started[1]!.args.indexOf("-secret") + 1], "n".repeat(48));
  rist.setKeys([{ ...relay, archived: true }]);
  assert.equal(started[1]!.stopped, true);
  assert.equal(rist.listening(relay.id), false);
});
