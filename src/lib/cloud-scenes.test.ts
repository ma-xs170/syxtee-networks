import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutOf, moveItem, newItem, parseScenes, uniqueName, defaultScenes } from "./cloud-scenes.ts";

test("layoutOf : 1 plein cadre, 2 côte à côte, 4 en grille", () => {
  assert.deepEqual(layoutOf(0), []);
  assert.deepEqual(layoutOf(1), [{ x: 0, y: 0, w: 100, h: 100 }]);
  assert.equal(layoutOf(2)[1].x, 50);
  const g = layoutOf(4);
  assert.deepEqual(g[3], { x: 50, y: 50, w: 50, h: 50 });
  assert.equal(layoutOf(5).length, 5);
  assert.equal(layoutOf(5)[0].w.toFixed(2), "33.33");
});

test("uniqueName", () => {
  assert.equal(uniqueName("Scène", []), "Scène");
  assert.equal(uniqueName("Scène", ["Scène", "Scène 2"]), "Scène 3");
});

test("moveItem ne sort pas de la liste", () => {
  const a = newItem("a");
  const b = newItem("b");
  assert.deepEqual(moveItem([a, b], a.id, -1), [a, b]);
  assert.deepEqual(moveItem([a, b], a.id, 1), [b, a]);
});

test("parseScenes retire les relais disparus et refuse le reste", () => {
  assert.equal(parseScenes("x", []), null);
  assert.equal(parseScenes([{ nope: 1 }], []), null);
  const ok = parseScenes([{ id: "s", name: "A", items: [{ id: "i1", relayId: "r1", visible: true }, { id: "i2", relayId: "gone", visible: true }] }], ["r1"]);
  assert.equal(ok?.[0].items.length, 1);
});

test("defaultScenes : une scène par relais, plus Multi", () => {
  const s = defaultScenes([{ id: "r1", n: 1, name: "A" }, { id: "r2", n: 2, name: "B" }]);
  assert.equal(s.length, 3);
  assert.equal(s[2].items.length, 2);
  assert.equal(defaultScenes([]).length, 1);
});
