import { expect, test } from "@playwright/test";

// Annuaire public des vidéastes : s'ouvre sans compte, même vide ; une fiche inconnue donne une 404.

test("annuaire : page publique, filtres et invitation à créer sa fiche", async ({ page }) => {
  const res = await page.goto("/videastes");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("vidéaste");
  await expect(page.getByRole("search").getByRole("button", { name: "Filtrer" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Crée ton compte gratuit" })).toHaveAttribute("href", /inscription/);
});

test("fiche inconnue : 404, ni indexée ni détaillée", async ({ page }) => {
  const res = await page.goto("/videastes/00000000-0000-4000-8000-000000000000");
  expect(res?.status()).toBe(404);
});
