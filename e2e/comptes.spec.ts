import { expect, test } from "@playwright/test";
import { admin, createUser, deleteUser, hasTestProject, signInWithMagicLink, testEmail } from "./helpers";

// Parcours réels sur le projet Supabase DE TEST (liens magiques générés par l'API admin, pas de vrai email).
test.skip(!hasTestProject, "E2E_SUPABASE_URL / E2E_SUPABASE_SECRET_KEY manquants (.env.test.local)");

const created: string[] = [];
test.afterAll(async () => {
  for (const id of created) await deleteUser(id);
});

test("inscription : lien magique → /bienvenue → profil → /dashboard", async ({ page }) => {
  const email = testEmail("inscription");
  const user = await createUser(email);
  created.push(user.id);

  await signInWithMagicLink(page, email);
  await expect(page).toHaveURL(/\/bienvenue/);
  const pseudo = `e2e_${Date.now().toString().slice(-8)}`;
  await page.getByLabel("Pseudo", { exact: true }).fill(pseudo);
  await page.getByLabel("Kick").fill("@syxtee_kick");
  await expect(page.getByRole("checkbox")).toBeDisabled(); // pas de Twitch lié
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: `Salut ${pseudo}.` })).toBeVisible();

  const { data } = await admin().from("profiles").select("username, kick, onboarded_at, show_on_site").eq("id", user.id).single();
  expect(data).toMatchObject({ username: pseudo, kick: "syxtee_kick", show_on_site: false });
  expect(data?.onboarded_at).not.toBeNull();
});

test("connexion : compte existant → /dashboard, menu du compte, déconnexion", async ({ page }) => {
  const email = testEmail("connexion");
  const user = await createUser(email);
  created.push(user.id);
  await admin().from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);

  await signInWithMagicLink(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/connexion");
  await expect(page).toHaveURL(/\/dashboard$/); // déjà connecté

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole("button", { name: /Menu du compte/ }).click();
  await page.getByRole("menuitem", { name: "Déconnexion" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/connexion/);
});

test("accueil : un streamer en live passe en premier avec badge et viewers", async ({ page }) => {
  const user = await createUser(testEmail("live"));
  created.push(user.id);
  // Simule un Twitch vérifié (normalement posé par /auth/callback) + consentement.
  const { error } = await admin()
    .from("profiles")
    .update({ twitch_id: "e2e-live-1", twitch_login: "e2e_live", twitch_display_name: "E2E_Live", show_on_site: true, onboarded_at: new Date().toISOString() })
    .eq("id", user.id);
  expect(error).toBeNull();

  await page.goto("/");
  const section = page.locator("#streamers");
  await expect(section.getByText("En live maintenant")).toBeVisible();
  const card = section.getByRole("link", { name: /@E2E_Live/ }).first();
  await expect(card).toContainText("EN LIVE");
  await expect(card).toContainText("42 viewers");
  await expect(card).toHaveAttribute("href", "https://twitch.tv/e2e_live");
});
