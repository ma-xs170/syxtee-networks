import { expect, test } from "@playwright/test";

// Achat : pages publiques de tarifs et de boutique, et accès protégé au paiement. Aucun appel à Stripe.

test("/tarifs : les formules sont affichées", async ({ page }) => {
  await page.goto("/tarifs");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Des tarifs");
  await expect(page.getByText("Signature").first()).toBeVisible();
});

test("/boutique : la fiche Encodeur s'affiche", async ({ page }) => {
  await page.goto("/boutique");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("undefined");
});

test("/dashboard/abonnement exige une connexion", async ({ page }) => {
  await page.goto("/dashboard/abonnement");
  await expect(page).toHaveURL(/\/connexion\?next=/);
});
