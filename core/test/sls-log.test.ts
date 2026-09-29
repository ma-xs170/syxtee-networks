import assert from "node:assert/strict";
import { test } from "node:test";
import { createSlsLogParser, parseAddr } from "../src/sls-log.ts";

// Lignes réelles du srt-live-server (VPS nyc1, 28/09/2026).
const L = {
  validate: " | 2026-09-28 21:48:48:529 SLS WARNING: [0x7c12ad5cd090]CSLSListener::validate_stream_id, invalid publisher stream ID='play_66d9193ead04da9a2a738ac03efe93b1'",
  invalid: " | 2026-09-28 21:48:48:529 SLS ERROR: [0x7c12ad5cd090]CSLSListener::handler, [::ffff:147.182.220.5:43219], invalid stream ID='play_66d9193ead04da9a2a738ac03efe93b1'.",
  duplicate:
    " | 2026-09-28 21:48:48:825 SLS ERROR: [0x7c12ad5cd090]CSLSListener::handler, refused, new role[::ffff:147.182.220.5:52863], stream='live_54b4c7ed767f3036b08be4a7d9e3aff4',but publisher=0x7c12ac7c1f60 is not NULL.",
  publisher: " | 2026-09-28 21:48:37:290 SLS INFO: [0x7c12ad5cd090]CSLSListener::handler, new publisher[::ffff:147.182.220.5:33497], key_stream_name=live_54b4c7ed767f3036b08be4a7d9e3aff4.",
  publisherPtr:
    " | 2026-09-28 21:48:37:290 SLS INFO: [0x7c12ada63e38]CSLSMapPublisher::set_push_2_pushlisher, ok, publisher=0x7c12ac7c1f60, app_streamname=live_54b4c7ed767f3036b08be4a7d9e3aff4, m_map_push_2_pushlisher.size()=1.",
  player:
    " | 2026-09-28 21:56:30:008 SLS INFO: [0x7c12ad473170]CSLSListener::handler, new player[0x7c12acea21e0]=[::ffff:172.18.0.1:43419], key_stream_name=live_e1d8f787e3cf448394818a0095337483, publisher=0x7c12ac7c1f60.",
  closed: " | 2026-09-28 21:48:48:246 SLS INFO: [0x7c12acea21e0]CSLSRole::invalid_srt, close sock=926634166, m_state=2.",
  noise: " | 2026-09-28 21:48:46:156 SLS WARNING: [0x55c5f14a3f20]CSLSManager::generate_json_for_publisher, invalid player key: play_260b2c66ce7538876e1c594cc7d56087",
};

test("adresse : IPv4 mappée, IPv6, port", () => {
  assert.deepEqual(parseAddr("[::ffff:203.0.113.7:4001]"), { ip: "203.0.113.7", port: 4001 });
  assert.deepEqual(parseAddr("2001:db8::1:5000"), { ip: "2001:db8::1", port: 5000 });
  assert.equal(parseAddr("pas une adresse"), null);
});

test("refus : clé inconnue, avec le rôle (clé de lecture sur l'entrée de publication)", () => {
  const parse = createSlsLogParser();
  assert.equal(parse(L.validate), null);
  assert.deepEqual(parse(L.invalid), { kind: "refused", ip: "147.182.220.5", port: 43219, role: "publisher", key: "play_66d9193ead04da9a2a738ac03efe93b1" });
});

test("2e appareil sur une clé déjà en direct", () => {
  assert.deepEqual(createSlsLogParser()(L.duplicate), { kind: "duplicate", ip: "147.182.220.5", port: 52863, key: "live_54b4c7ed767f3036b08be4a7d9e3aff4" });
});

test("connexions : publieur (et son pointeur), lecteur, fermeture", () => {
  const parse = createSlsLogParser();
  assert.deepEqual(parse(L.publisher), { kind: "publisher", ip: "147.182.220.5", port: 33497, key: "live_54b4c7ed767f3036b08be4a7d9e3aff4" });
  assert.deepEqual(parse(L.publisherPtr), { kind: "publisher_ptr", ptr: "0x7c12ac7c1f60", key: "live_54b4c7ed767f3036b08be4a7d9e3aff4" });
  assert.deepEqual(parse(L.player), { kind: "player", ip: "172.18.0.1", port: 43419, key: "live_e1d8f787e3cf448394818a0095337483", ptr: "0x7c12acea21e0" });
  assert.deepEqual(parse(L.closed), { kind: "closed", ptr: "0x7c12acea21e0" });
});

test("lignes répétées (le SLS écrit tout deux fois) et bruit ignorés", () => {
  const parse = createSlsLogParser();
  assert.ok(parse(L.duplicate));
  assert.equal(parse(L.duplicate), null);
  assert.equal(parse(L.noise), null);
  assert.equal(parse("n'importe quoi"), null);
});
