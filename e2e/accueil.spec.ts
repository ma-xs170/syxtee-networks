import { expect, test } from "@playwright/test";

// Accueil centré sur le contrôle à distance d'OBS, menu principal à liens directs. Ne dépend pas de Supabase.

test("accueil : héros, sections et appels à l'action", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Pilote ton OBS à distance");
  await expect(page.getByRole("link", { name: "Créer mon compte" }).first()).toHaveAttribute("href", "/inscription");
  await expect(page.getByRole("link", { name: "Voir comment ça marche" })).toHaveAttribute("href", "#comment");
  await expect(page.getByRole("heading", { name: /Des tarifs clairs/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Ils streament avec SYXTEE/ })).toBeVisible();
  await expect(page.getByText(/999 €|1 290/)).toHaveCount(0);
});

test("menu principal : Contrôle à distance, Nos serveurs, Tarifs, Devenir partenaire", async ({ page, isMobile }) => {
  test.skip(isMobile, "menu desktop");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  const links = nav.getByRole("link");
  await expect(links).toHaveText(["Contrôle à distance", "Nos serveurs", "Tarifs", "Devenir partenaire"]);
  await expect(nav.getByRole("link", { name: "Nos serveurs" })).toHaveAttribute("href", "/relais");
  await expect(nav.getByRole("link", { name: "Tarifs" })).toHaveAttribute("href", "/tarifs");
});
