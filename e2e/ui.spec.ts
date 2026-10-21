import { expect, test } from "@playwright/test";

// Pages de connexion : rendu, validation de l'email, redirections. Ne dépend pas de Supabase.

test("/connexion : carte, email ou identifiant + mot de passe, bouton désactivé tant que vide", async ({ page }) => {
  await page.goto("/connexion");
  await expect(page.getByRole("heading", { name: "Connexion à SYXTEE" })).toBeVisible();
  const submit = page.getByRole("button", { name: "Se connecter" });
  await expect(submit).toBeDisabled();
  await page.getByLabel("Email ou identifiant").fill("toi@exemple.com");
  await page.getByLabel("Mot de passe", { exact: true }).fill("un-mot-de-passe");
  await expect(submit).toBeEnabled();
  await expect(page.getByRole("link", { name: "Mot de passe oublié ?" })).toHaveAttribute("href", /^\/mot-de-passe-oublie/);
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
  await page.goto("/dashboard/urls");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fdashboard%2Fserveurs$/);
});

test("lien expiré : message en français", async ({ page }) => {
  await page.goto("/connexion?erreur=lien-expire");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Ce lien a expiré");
});
