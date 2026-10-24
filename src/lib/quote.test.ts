import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanQuote, computeQuote, eur, quoteText } from "./quote.ts";

test("2 h de direct avec régie à distance : 50 € de diffusion + 20 € de bonding, plus liaison et eSIM", () => {
  const q = computeQuote({ lives: 1, hours: 2, remote: true, crew: false, km: 0 });
  assert.deepEqual(q.lines.map((l) => l.cents), [5000, 2000, 1500, 500]);
  assert.equal(q.totalCents, 9000);
  assert.equal(eur(q.totalCents), "90,00 €");
});

test("sans régie à distance : la ligne disparaît", () => {
  const q = computeQuote({ hours: 2, remote: false });
  assert.equal(q.lines.some((l) => l.label.startsWith("Bonding")), false);
  assert.equal(q.totalCents, 7000);
});

test("vidéaste sur place : heures avec préparation, déplacement aller-retour", () => {
  const q = computeQuote({ hours: 2, remote: true, crew: true, km: 40 });
  const crew = q.lines.find((l) => l.label === "Vidéaste sur place")!;
  const trip = q.lines.find((l) => l.label === "Déplacement du vidéaste")!;
  assert.equal(crew.cents, 7500); // 3 h × 25 €
  assert.equal(trip.cents, 4000); // 80 km × 0,50 €
});

test("durée courte : le vidéaste est facturé 2 h au minimum", () => {
  const q = computeQuote({ hours: 1, remote: false, crew: true });
  assert.equal(q.lines.find((l) => l.label === "Vidéaste sur place")!.cents, 5000);
});

test("plusieurs directs : tout se multiplie", () => {
  assert.equal(computeQuote({ lives: 3, hours: 2, remote: true }).totalCents, 9000 * 3);
});

test("entrées absurdes ramenées dans les bornes", () => {
  assert.deepEqual(cleanQuote({ lives: 999, hours: -4, km: 1e9, crew: true }), { lives: 20, hours: 1, remote: true, crew: true, km: 2000 });
  assert.deepEqual(cleanQuote({ lives: NaN, hours: NaN }), { lives: 1, hours: 1, remote: true, crew: false, km: 0 });
  assert.equal(computeQuote({ hours: 2.3 }).input.hours, 2.25);
});

test("texte du devis : lignes et total", () => {
  const t = quoteText(computeQuote({ hours: 2 }));
  assert.match(t, /Total estimé : 90,00 €/);
  assert.match(t, /Diffusion en direct/);
});
