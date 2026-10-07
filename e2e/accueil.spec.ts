import { expect, test } from "@playwright/test";

// Accueil recentré sur le relais, SYXTEE PRO « À venir ». Ne dépend pas de Supabase.

test("accueil : héros, bento et étapes centrés sur le relais", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Le live IRL pro.");
  await expect(page.getByRole("link", { name: "Créer mon relais" }).first()).toHaveAttribute("href", /\/inscription\?next=%2Fdashboard%2Frelais%3Fnouveau%3D1/);
  await expect(page.getByRole("link", { name: "Voir les offres" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Ce que ton relais fait pour toi/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Crée ton relais en 3 étapes/ })).toBeVisible();
  await expect(page.getByText(/999 €|1 290/)).toHaveCount(0);

  // Aperçu de l'assistant : une étape à la fois.
  await page.getByRole("button", { name: /Serveur/ }).click();
  await expect(page.getByText("Étape 3 sur 3")).toBeVisible();
  await expect(page.getByText("New York", { exact: true }).last()).toBeVisible();
});

test("menu Produits : Relais en premier, SYXTEE PRO grisé « À venir »", async ({ page, isMobile }) => {
  test.skip(isMobile, "menu déroulant desktop");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  await nav.getByRole("button", { name: /Produits/ }).click();
  const items = nav.getByRole("link").filter({ hasText: /Relais SYXTEE|SYXTEE PRO/ });
  await expect(items.first()).toContainText("Relais SYXTEE");
  await expect(items.last()).toContainText("À venir");
});

