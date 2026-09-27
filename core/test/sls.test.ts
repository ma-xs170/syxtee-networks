import assert from "node:assert/strict";
import { test } from "node:test";
import { parseStats } from "../src/sls.ts";

test("stats : format actuel avec liens SRTLA", () => {
  const s = parseStats({ status: "ok", publisher: { bitrate: 8000, throughput: 8300, rtt: 15.5, buffer: 2920, dropped_pkts: 30, uptime: 3600, latency: 3000, peers: [{ connection_id: "a", bitrate: 5000 }, { connection_id: "b", bitrate: 3000 }] } });
  assert.equal(s?.bitrate, 8000);
  assert.equal(s?.rtt, 15.5);
  assert.equal(s?.dropped_pkts, 30);
  assert.equal(s?.peers?.length, 2);
});

test("stats : format legacy", () => {
  const s = parseStats({ status: "ok", publishers: { live: { bitrate: 16363, rtt: 30.2, ms_rcv_buf: 1984, pkt_rcv_drop: 4 } } });
  assert.deepEqual([s?.bitrate, s?.buffer, s?.dropped_pkts], [16363, 1984, 4]);
});

test("stats : pas de publieur", () => {
  assert.equal(parseStats({ status: "error" }), null);
  assert.equal(parseStats(null), null);
});
