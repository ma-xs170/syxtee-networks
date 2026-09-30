import assert from "node:assert/strict";
import { test } from "node:test";
import { crc16, crc8, decodeMessage, encodeMessage, message, modelFromManufacturerData, pairPayload, startPayload, startPayloadV2, T, wifiPayload } from "./protocol.ts";

// Vecteurs repris des tests de Moblin (MoblinTests/…/DjiDeviceSuite.swift) + propriétés des trames.

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

test("démarrage Osmo Pocket 4 : en-tête et JSON identiques à Moblin", () => {
  const p = startPayloadV2({ rtmpUrl: "rtmp://192.168.1.59/live/1", resolution: "1080p", fps: 30, bitrateKbps: 5000, codec: "h265" }, "osmoPocket4");
  assert.equal(p.length, 161);
  assert.equal(hex(p.subarray(0, 14)), "01b5000a88130201030000009300");
  assert.deepEqual(JSON.parse(Buffer.from(p.subarray(14)).toString()), {
    codec: "HEVC",
    EnhancedRTMP: true,
    supportStopLive: false,
    watermark: 0,
    rtmpAddress: "rtmp://192.168.1.59/live/1",
    orientation: "landscape",
  });
});

test("démarrage Osmo Action 6 : en-tête identique à Moblin (AVC)", () => {
  const p = startPayload({ rtmpUrl: "rtmp://192.168.1.59/live/2", resolution: "720p", fps: 30, bitrateKbps: 7000, codec: "h264" }, "osmoAction6");
  assert.equal(p.length, 161);
  assert.equal(hex(p.subarray(0, 14)), "019c0004581bfe00030000009300");
  assert.equal(JSON.parse(Buffer.from(p.subarray(14)).toString()).codec, "AVC");
});

test("démarrage Osmo Pocket 3 (ancien format) : résolution, débit, fps, URL", () => {
  const url = "rtmp://147.182.220.5:1935/live/live_0123";
  const p = startPayload({ rtmpUrl: url, resolution: "720p", fps: 30, bitrateKbps: 2000, codec: "h264" }, "osmoPocket3");
  assert.equal(hex(p.subarray(0, 12)), "002e0004d0070200030000" + "00");
  assert.equal(p[12], url.length);
  assert.equal(p[13], 0);
  assert.equal(Buffer.from(p.subarray(14)).toString(), url);
});

test("trame : en-tête, longueur, CRC, puis décodage à l'identique", () => {
  const m = message(T.wifi, wifiPayload("Mon iPhone", "motdepasse"));
  const f = encodeMessage(m);
  assert.equal(f[0], 0x55);
  assert.equal(f[1], f.length);
  assert.equal(f[2], 0x04);
  assert.equal(f[3], crc8(f.subarray(0, 3)));
  const d = decodeMessage(f)!;
  assert.deepEqual({ ...d, payload: hex(d.payload) }, { ...m, payload: hex(m.payload) });
  // Un octet modifié : trame refusée (CRC16).
  const bad = Uint8Array.from(f);
  bad[12] ^= 0xff;
  assert.equal(decodeMessage(bad), null);
});

test("CRC : valeurs stables (algorithme CrcSwift, octets réfléchis)", () => {
  assert.equal(crc8(Uint8Array.from([0x55, 0x0e, 0x04])), crc8(Uint8Array.from([0x55, 0x0e, 0x04])));
  assert.notEqual(crc16(Uint8Array.from([1, 2, 3])), crc16(Uint8Array.from([1, 2, 4])));
  assert.equal(pairPayload().length, 33 + 5);
});

test("modèle depuis les données constructeur (sans l'identifiant de société)", () => {
  assert.equal(modelFromManufacturerData(Uint8Array.from([0x20, 0x00, 0x99])), "osmoPocket3");
  assert.equal(modelFromManufacturerData(Uint8Array.from([0x18, 0x00])), "osmoAction6");
  assert.equal(modelFromManufacturerData(Uint8Array.from([0x99, 0x00])), "unknown");
});
