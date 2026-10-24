import { expect, test } from "@playwright/test";

// Accueil centré sur le contrôle à distance d'OBS, menu principal à liens directs. Ne dépend pas de Supabase.

test("accueil : promesse, deux parcours, soutien et appels à l'action", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Le live IRL, partout");
  await expect(page.getByRole("link", { name: "Contactez-nous" }).first()).toHaveAttribute("href", "/contact");
  await expect(page.getByRole("link", { name: "Commencer" })).toHaveAttribute("href", "/inscription");
  await expect(page.getByRole("heading", { name: /On produit ton live IRL/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Streamers indépendants/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Des tarifs clairs/ })).toHaveCount(0);
  await expect(page.getByText(/999 €|1 290|13,73/)).toHaveCount(0);
});

test("menu principal : Fonctionnalités, Tarifs, Contactez-nous", async ({ page, isMobile }) => {
  test.skip(isMobile, "menu desktop");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  const links = nav.getByRole("link");
  await expect(nav.getByRole("button", { name: "Fonctionnalités" })).toBeVisible();
  await expect(links).toHaveText(["Tarifs", "Contactez-nous"], { useInnerText: true });
  await nav.getByRole("button", { name: "Fonctionnalités" }).hover();
  await expect(page.getByRole("link", { name: /Serveurs/ })).toHaveAttribute("href", "/relais");
  await expect(nav.getByRole("link", { name: "Tarifs" })).toHaveAttribute("href", "/tarifs");
});
