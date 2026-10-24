import { expect, test } from "@playwright/test";

// Accueil centré sur le contrôle à distance d'OBS, menu principal à liens directs. Ne dépend pas de Supabase.

test("accueil : promesse, deux parcours, soutien et appels à l'action", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Le live IRL, partout");
  await expect(page.getByRole("link", { name: "Demander une production IRL" }).first()).toHaveAttribute("href", "/contact");
  await expect(page.getByRole("link", { name: "Je suis streamer indépendant" })).toHaveAttribute("href", "#streamers");
  await expect(page.getByRole("heading", { name: /Pour les productions/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Streamers indépendants/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Me soutenir/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Des tarifs clairs/ })).toHaveCount(0);
  await expect(page.getByText(/999 €|1 290|13,73/)).toHaveCount(0);
});

test("menu principal : Contrôle à distance, Nos serveurs, Tarifs, Production IRL", async ({ page, isMobile }) => {
  test.skip(isMobile, "menu desktop");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  const links = nav.getByRole("link");
  await expect(links).toHaveText(["Contrôle à distance", "Nos serveurs", "Tarifs", "Production IRL"]);
  await expect(nav.getByRole("link", { name: "Nos serveurs" })).toHaveAttribute("href", "/relais");
  await expect(nav.getByRole("link", { name: "Tarifs" })).toHaveAttribute("href", "/tarifs");
});
