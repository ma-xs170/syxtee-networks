import { expect, test } from "@playwright/test";
import { admin, createUser, deleteUser, hasTestProject, signInWithMagicLink, signInWithPassword, testEmail, testPassword, userIdByEmail } from "./helpers";

// Parcours réels sur le projet Supabase DE TEST (liens générés par l'API admin, pas de vrai email).
test.skip(!hasTestProject, "E2E_SUPABASE_URL / E2E_SUPABASE_SECRET_KEY manquants (.env.test.local)");

const created: string[] = [];
test.afterAll(async () => {
  for (const id of created) await deleteUser(id);
});

test("inscription : formulaire → vérification → connexion → /bienvenue → /dashboard", async ({ page, context }) => {
  const email = testEmail("inscription");
  const password = testPassword();
  await page.goto("/inscription");
  await page.getByLabel("Prénom").fill("Mathis");
  await page.getByLabel("Nom", { exact: true }).fill("Nicolas");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("court");
  await expect(page.getByText("Solidité : Faible")).toBeVisible();
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await expect(page.getByText("Solidité : Fort")).toBeVisible();
  await page.getByLabel("Confirmer le mot de passe").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: "Vérifie ta boîte mail" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Renvoyer l'email \(\d+ s\)/ })).toBeDisabled();

  const id = await userIdByEmail(email);
  expect(id).toBeTruthy();
  created.push(id!);
  const { data: p } = await admin().from("profiles").select("first_name, last_name").eq("id", id!).single();
  expect(p).toEqual({ first_name: "Mathis", last_name: "Nicolas" });

  // Clic sur le lien de vérification (simulé par l'API admin), puis connexion avec le mot de passe.
  await admin().auth.admin.updateUserById(id!, { email_confirm: true });
  await context.clearCookies();
  await signInWithPassword(page, email, password);
  await expect(page).toHaveURL(/\/bienvenue/);
  await page.getByLabel("Kick").fill("@syxtee_kick");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Salut Mathis." })).toBeVisible();
});

test("connexion : mot de passe, erreur neutre, menu du compte, déconnexion", async ({ page }) => {
  const email = testEmail("connexion");
  const password = testPassword();
  const user = await createUser(email, { password, first_name: "Léa", last_name: "Martin" });
  created.push(user.id);
  await admin().from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);

  await signInWithPassword(page, email, "mauvais-mot-de-passe");
  await expect(page.getByText("Email ou mot de passe incorrect.")).toBeVisible();
  await signInWithPassword(page, testEmail("inconnu"), password);
  await expect(page.getByText("Email ou mot de passe incorrect.")).toBeVisible();

  await signInWithPassword(page, email, password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/connexion");
  await expect(page).toHaveURL(/\/dashboard$/); // déjà connecté

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole("button", { name: /Menu du compte Léa M\./ }).click();
  await expect(page.getByRole("menu")).toContainText("Léa M.");
  await page.getByRole("menuitem", { name: "Déconnexion" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/connexion/);
});

test("mot de passe oublié : lien → nouveau mot de passe → connexion", async ({ page, context }) => {
  const email = testEmail("oubli");
  const user = await createUser(email, { password: testPassword() });
  created.push(user.id);
  await admin().from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);

  await page.goto("/mot-de-passe-oublie");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Envoyer le lien" }).click();
  await expect(page.getByText("Si un compte existe avec cette adresse")).toBeVisible();

  // Sans lien récent, /reinitialiser renvoie vers la demande.
  await page.goto("/reinitialiser");
  await expect(page).toHaveURL(/\/mot-de-passe-oublie\?erreur=lien-expire/);

  const { data, error } = await admin().auth.admin.generateLink({ type: "recovery", email });
  expect(error).toBeNull();
  await page.goto(`/auth/confirm?token_hash=${data.properties!.hashed_token}&type=recovery`);
  await expect(page).toHaveURL(/\/reinitialiser$/);
  const fresh = testPassword() + "x";
  await page.getByLabel("Nouveau mot de passe").fill(fresh);
  await page.getByLabel("Confirmer").fill(fresh);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await context.clearCookies();
  await signInWithPassword(page, email, fresh);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("ancien compte sans prénom : modale obligatoire, puis « Salut Prénom. »", async ({ page }) => {
  const email = testEmail("ancien");
  const password = testPassword();
  const user = await createUser(email, { password, names: false });
  created.push(user.id);
  await admin().from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);

  await signInWithPassword(page, email, password);
  await expect(page).toHaveURL(/\/dashboard$/);
  const modal = page.getByRole("dialog", { name: "Comment tu t'appelles ?" });
  await expect(modal).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modal).toBeVisible(); // non fermable
  await modal.getByLabel("Prénom").fill("Noé");
  await modal.getByLabel("Nom", { exact: true }).fill("Bernard");
  await modal.getByRole("button", { name: "Continuer" }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByRole("heading", { name: "Salut Noé." })).toBeVisible();
});

test("modale prénom/nom : vraies erreurs, puis Mathis / CUSTOS enregistrés tels quels", async ({ page, context }) => {
  const email = testEmail("custos");
  const password = testPassword();
  const user = await createUser(email, { password, names: false });
  created.push(user.id);
  await admin().from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);

  await signInWithPassword(page, email, password);
  await expect(page.locator("h1")).toHaveText("Salut."); // prénom pas encore renseigné
  const modal = page.getByRole("dialog", { name: "Comment tu t'appelles ?" });
  await expect(modal).toBeVisible();

  // Nom invalide : la raison exacte, pas « Enregistrement impossible ».
  await modal.getByLabel("Prénom").fill("Mathis");
  await modal.getByLabel("Nom", { exact: true }).fill("CUSTOS2");
  await modal.getByRole("button", { name: "Continuer" }).click();
  await expect(modal.getByRole("alert")).toHaveText("Nom invalide : lettres, espaces, tirets et apostrophes uniquement.");

  // Session perdue : la modale le dit (pas de page d'erreur, pas de faux « enregistré »).
  const cookies = await context.cookies();
  await context.clearCookies();
  await modal.getByLabel("Nom", { exact: true }).fill("CUSTOS");
  await modal.getByRole("button", { name: "Continuer" }).click();
  await expect(modal.getByRole("alert")).toHaveText("Session expirée, reconnecte-toi.");
  await context.addCookies(cookies);

  await modal.getByLabel("Prénom").fill("  Mathis ");
  await modal.getByLabel("Nom", { exact: true }).fill("CUSTOS");
  await modal.getByRole("button", { name: "Continuer" }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByRole("heading", { name: "Salut Mathis." })).toBeVisible();
  const { data } = await admin().from("profiles").select("first_name, last_name").eq("id", user.id).single();
  expect(data).toEqual({ first_name: "Mathis", last_name: "CUSTOS" }); // trim, casse conservée
});

test("ID support : généré à la création, visible dans le menu et les paramètres", async ({ page }) => {
  const email = testEmail("support");
  const user = await createUser(email);
  created.push(user.id);
  await admin().from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
  const { data } = await admin().from("profiles").select("support_id").eq("id", user.id).single();
  expect(data?.support_id).toMatch(/^SYX-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);

  await signInWithMagicLink(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole("button", { name: /Menu du compte/ }).click();
  await expect(page.getByRole("menu").getByTestId("support-id")).toHaveText(data!.support_id);

  await page.goto("/dashboard/parametres");
  await expect(page.locator("#support").getByTestId("support-id")).toHaveText(data!.support_id);
  await expect(page.locator("#support").getByRole("button", { name: "Ouvrir un ticket Discord" })).toBeVisible();

  // L'admin est réservé à ADMIN_EMAILS : un compte normal reçoit une 404.
  const res = await page.goto(`/admin/comptes?q=${data!.support_id}`);
  expect(res?.status()).toBe(404);
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
