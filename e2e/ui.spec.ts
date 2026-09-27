import { expect, test } from "@playwright/test";

// Pages de connexion : rendu, validation de l'email, redirections. Ne dépend pas de Supabase.

test("/connexion : carte, OAuth, bouton email désactivé tant que l'email est invalide", async ({ page }) => {
  await page.goto("/connexion");
  await expect(page.getByRole("heading", { name: "Connexion à SYXTEE" })).toBeVisible();
  for (const p of ["Twitch", "Discord", "Google"]) await expect(page.getByRole("button", { name: `Continuer avec ${p}` })).toBeVisible();
  const submit = page.getByRole("button", { name: "Continuer avec l'email" });
  await expect(submit).toBeDisabled();
  await page.getByLabel("Email").fill("pas-un-email");
  await expect(submit).toBeDisabled();
  await page.getByLabel("Email").fill("toi@exemple.com");
  await expect(submit).toBeEnabled();
  await expect(page.getByRole("link", { name: "Conditions d'utilisation" })).toHaveAttribute("href", "/cgu");
});

test("/inscription : textes inversés", async ({ page }) => {
  await page.goto("/inscription");
  await expect(page.getByRole("heading", { name: "Crée ton compte SYXTEE" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Connecte-toi." })).toBeVisible();
});

test("redirections /login, /signup et pages privées", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/connexion$/);
  await page.goto("/signup");
  await expect(page).toHaveURL(/\/inscription$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fdashboard$/);
});

test("lien expiré : message en français", async ({ page }) => {
  await page.goto("/connexion?erreur=lien-expire");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Ce lien de connexion a expiré");
});
