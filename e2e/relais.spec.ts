import { expect, test } from "@playwright/test";
import { admin, createUser, deleteUser, hasTestProject, signInWithMagicLink, testEmail } from "./helpers";

// Relais multiples, avec le faux Core (e2e/core-mock.mjs) : état vide, assistant en 4 étapes, quota, fiche d'un relais.
test.skip(!hasTestProject, "E2E_SUPABASE_URL / E2E_SUPABASE_SECRET_KEY manquants (.env.test.local)");

const created: string[] = [];
test.afterAll(async () => {
  for (const id of created) await deleteUser(id);
});

async function signedIn(page: import("@playwright/test").Page, tag: string) {
  const email = testEmail(tag);
  const user = await createUser(email);
  created.push(user.id);
  await admin().from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
  await signInWithMagicLink(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function createRelay(page: import("@playwright/test").Page, protocol: "SRTLA" | "RTMP", name: string) {
  await page.getByRole("button", { name: /Créer (un|mon premier) relais/ }).first().click();
  const dialog = page.getByRole("dialog", { name: /Créer un relais/ });
  await dialog.locator("label", { hasText: protocol }).first().click();
  await dialog.getByRole("button", { name: "Suivant" }).click();
  await dialog.getByLabel("Nom de l'appareil qui utilisera ce relais").fill(name);
  await dialog.getByRole("button", { name: "Suivant" }).click();
  // Latence mesurée en direct sur le faux Core, serveur le plus proche présélectionné.
  await expect(dialog.getByText("Le plus proche de toi")).toBeVisible();
  await expect(dialog.getByText(/^\d+ ms$/)).toBeVisible();
  await expect(dialog.getByRole("radio", { name: /Paris/ })).toBeDisabled();
  await dialog.getByRole("button", { name: "Suivant" }).click();
  await expect(dialog.getByText(name)).toBeVisible();
  await dialog.getByRole("button", { name: "Créer le relais" }).click();
  await expect(page.getByRole("dialog", { name: /Relais créé/ })).toBeVisible();
}

test("aucun relais d'office, assistant SRTLA puis RTMP, quota atteint", async ({ page }) => {
  await signedIn(page, "relais");
  await page.goto("/dashboard/urls");
  await expect(page).toHaveURL(/\/dashboard\/relais$/);
  await expect(page.getByRole("heading", { name: "Aucun relais pour l'instant" })).toBeVisible();

  await createRelay(page, "SRTLA", "iPhone e2e");
  const done = page.getByRole("dialog", { name: /Relais créé/ });
  await expect(done.getByText("Moblin (SRTLA)")).toBeVisible();
  await expect(done.getByText(/srtla:\/\/relais\.e2e:5000\?streamid=live_••••••••/)).toBeVisible();
  await done.getByRole("button", { name: "Terminé" }).click();
  await expect(page.getByRole("link", { name: "iPhone e2e" })).toBeVisible();
  await expect(page.getByText("1 / 3 relais")).toBeVisible();

  await createRelay(page, "RTMP", "Osmo Pocket 3");
  await expect(page.getByRole("dialog", { name: /Relais créé/ }).getByText("Serveur RTMP")).toBeVisible();
  await page.getByRole("button", { name: "Terminé" }).click();

  await createRelay(page, "SRTLA", "Galaxy e2e");
  await page.getByRole("button", { name: "Terminé" }).click();
  await expect(page.getByText("3 / 3 relais")).toBeVisible();
  await expect(page.getByRole("link", { name: "Limite atteinte · Voir les offres" })).toBeVisible();

  // Fiche d'un relais RTMP : serveur + clé, puis renommage.
  await page.getByRole("link", { name: "Osmo Pocket 3" }).click();
  await expect(page).toHaveURL(/\/dashboard\/relais\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Clé de stream")).toBeVisible();
  await page.getByRole("button", { name: /Plus d'actions/ }).click();
  await page.getByRole("menuitem", { name: "Renommer" }).click();
  await page.getByLabel("Nom de l'appareil").fill("Osmo Action 5");
  await page.getByRole("button", { name: "Renommer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Osmo Action 5" })).toBeVisible();

  // Archiver libère une place dans le quota.
  await page.getByRole("button", { name: /Plus d'actions/ }).click();
  await page.getByRole("menuitem", { name: "Archiver" }).click();
  await page.getByRole("button", { name: "Archiver", exact: true }).click();
  await expect(page.getByText(/Ce relais est archivé/)).toBeVisible();
  await page.goto("/dashboard/relais");
  await expect(page.getByText("2 / 3 relais")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Créer un relais" })).toBeVisible();
});

test("« Mes relais » est la première entrée du menu Direct", async ({ page }) => {
  await signedIn(page, "relais-nav");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole("button", { name: "Direct", exact: true }).click();
  const first = page.getByRole("link", { name: /Mes relais/ }).first();
  await expect(first).toBeVisible();
  await expect(first).toHaveAttribute("href", "/dashboard/relais");
});
