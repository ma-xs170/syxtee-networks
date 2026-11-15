import { expect, test } from "@playwright/test";

// Formulaire de contact : champs obligatoires, consentement, rejet des adresses jetables. Rien n'est enregistré ni envoyé.

test("/contact : le formulaire s'affiche avec ses champs obligatoires", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("votre projet");
  await expect(page.getByLabel("Nom *")).toBeVisible();
  await expect(page.getByLabel("E-mail *")).toBeVisible();
  await expect(page.getByLabel("Téléphone *")).toBeVisible();
  await expect(page.locator('input[name="consent"]')).toHaveAttribute("required", "");
});

test("/contact : une adresse jetable est refusée par le serveur", async ({ page }) => {
  await page.goto("/contact");
  // Le serveur ignore en silence un envoi fait moins de 5 s après l'ouverture de la page (antirobot).
  await page.waitForTimeout(5_500);
  await page.getByLabel("Nom *").fill("Camille Testeur");
  await page.getByLabel("E-mail *").fill("camille@mailinator.com");
  await page.getByLabel("Téléphone *").fill("690123456");
  await page.getByRole("combobox", { name: /type d'événement/i }).click();
  await page.getByRole("option").first().click();
  await page.getByRole("combobox", { name: /ville/i }).click();
  await page.getByRole("option").first().click();
  await page.getByLabel(/Décris ton projet/).fill("Live IRL en mobilité pour un événement sportif.");
  await page.locator('input[name="consent"]').check();
  await page.getByRole("button", { name: /envoyer|demander/i }).click();
  await expect(page.getByText("Les adresses e-mail jetables ne sont pas acceptées.")).toBeVisible();
});
