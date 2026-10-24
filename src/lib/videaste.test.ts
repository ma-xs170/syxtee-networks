import assert from "node:assert/strict";
import { test } from "node:test";
import { cardProblems, parseSpecialties, priceLabel, type CardInput } from "./videaste.ts";

const ok: CardInput = { displayName: "Léa Martin", region: "Île-de-France", country: "FR", priceFrom: 150, priceTo: 300, priceUnit: "journee", bio: "Vidéaste IRL et événementiel, 6 ans d'expérience.", specialties: ["live", "clip"] };

test("fiche correcte : aucun problème", () => assert.deepEqual(cardProblems(ok), []));

test("contacts interdits dans la fiche", () => {
  for (const bio of ["écris-moi à lea@exemple.fr", "mon site www.lea-video.fr", "appelle le 06 12 34 56 78", "ajoute-moi sur WhatsApp", "insta : @lea.video", "https://exemple.com/moi"]) {
    assert.ok(cardProblems({ ...ok, bio }).length > 0, bio);
  }
});

test("prix : maximum sous le minimum, ou aucun prix", () => {
  assert.equal(cardProblems({ ...ok, priceFrom: 300, priceTo: 100 }).length, 1);
  assert.equal(cardProblems({ ...ok, priceFrom: null, priceTo: null }).length, 1);
  assert.deepEqual(cardProblems({ ...ok, priceFrom: 200, priceTo: null }), []);
});

test("libellé de prix", () => {
  assert.equal(priceLabel({ priceFrom: 150, priceTo: 300, priceUnit: "journee" }), "150 à 300 € la journée");
  assert.equal(priceLabel({ priceFrom: 150, priceTo: null, priceUnit: "heure" }), "à partir de 150 € l'heure");
  assert.equal(priceLabel({ priceFrom: 200, priceTo: 200, priceUnit: "projet" }), "200 € le projet");
  assert.equal(priceLabel({ priceFrom: null, priceTo: null, priceUnit: "projet" }), "Sur devis");
});

test("spécialités : nettoyées, sans doublon, 6 au plus", () => {
  assert.deepEqual(parseSpecialties(" live, clip ;live\n mariage ,, "), ["live", "clip", "mariage"]);
  assert.equal(parseSpecialties("a,b,c,d,e,f,g,h").length, 6);
});
