import assert from "node:assert/strict";
import { test } from "node:test";
import { conflicts } from "./calendar-conflicts.ts";

const ev = (id: string, who: string | null, a: number, b: number) => ({ id, assignee_id: who, starts_at: new Date(a * 3600_000).toISOString(), ends_at: new Date(b * 3600_000).toISOString() });

test("même personne sur deux lives qui se chevauchent : conflit", () => {
  assert.deepEqual([...conflicts([ev("a", "x", 0, 3), ev("b", "x", 2, 4)])].sort(), ["a", "b"]);
});

test("lives qui se suivent, ou personnes différentes, ou non attribués : pas de conflit", () => {
  assert.equal(conflicts([ev("a", "x", 0, 2), ev("b", "x", 2, 4)]).size, 0);
  assert.equal(conflicts([ev("a", "x", 0, 3), ev("b", "y", 1, 2)]).size, 0);
  assert.equal(conflicts([ev("a", null, 0, 3), ev("b", null, 1, 2)]).size, 0);
});

test("un long live en recouvre plusieurs autres", () => {
  assert.deepEqual([...conflicts([ev("a", "x", 0, 10), ev("b", "x", 1, 2), ev("c", "x", 5, 6)])].sort(), ["a", "b", "c"]);
});
