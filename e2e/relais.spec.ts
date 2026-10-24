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
  await page.getByRole("button", { name: /Créer (un|mon premier) serveur/ }).first().click();
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
  await expect(page).toHaveURL(/\/dashboard\/serveurs$/);
  await expect(page.getByRole("heading", { name: "Aucun serveur pour l'instant" })).toBeVisible();

  await createRelay(page, "SRTLA", "iPhone e2e");
  const done = page.getByRole("dialog", { name: /Relais créé/ });
  await expect(done.getByRole("tab", { name: /Moblin/ })).toBeVisible();
  await expect(done.getByRole("button", { name: "Afficher le QR code" })).toBeVisible();
  await expect(done.getByText(/srtla:\/\/relais\.e2e:5000\?streamid=live_••••••••/)).toBeVisible();
  await done.getByRole("button", { name: "Terminé" }).click();
  await expect(page.getByRole("link", { name: "iPhone e2e" })).toBeVisible();
  await expect(page.getByText("1 / 3 serveurs")).toBeVisible();

  await createRelay(page, "RTMP", "Osmo Pocket 3");
  await expect(page.getByRole("dialog", { name: /Relais créé/ }).getByRole("tab", { name: /DJI, GoPro/ })).toBeVisible();
  await page.getByRole("button", { name: "Terminé" }).click();

  await createRelay(page, "SRTLA", "Galaxy e2e");
  await page.getByRole("button", { name: "Terminé" }).click();
  await expect(page.getByText("3 / 3 serveurs")).toBeVisible();
  await expect(page.getByRole("link", { name: "Limite atteinte · Demander plus de serveurs" })).toBeVisible();

  // Fiche d'un serveur RTMP : adresses, puis renommage par le menu « Actions du serveur ».
  await page.getByRole("link", { name: "Osmo Pocket 3" }).click();
  await expect(page).toHaveURL(/\/dashboard\/serveurs\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Osmo Pocket 3", level: 1 })).toBeVisible();
  await expect(page.getByText("Serveur opérationnel").first()).toBeVisible();
  await page.getByRole("button", { name: "Actions du serveur" }).click();
  await page.getByRole("menuitem", { name: "Renommer" }).click();
  const rename = page.getByRole("dialog", { name: "Renommer la caméra" });
  await rename.getByLabel("Nom de la caméra").fill("Osmo Action 5");
  await rename.getByRole("button", { name: "Renommer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Osmo Action 5", level: 1 })).toBeVisible();

  // Archiver libère une place dans le quota.
  await page.getByRole("button", { name: "Actions du serveur" }).click();
  await page.getByRole("menuitem", { name: "Archiver" }).click();
  await page.getByRole("dialog", { name: "Archiver le relais" }).getByRole("button", { name: "Archiver", exact: true }).click();
  await expect(page.getByText("Serveur archivé").first()).toBeVisible();
  await page.goto("/dashboard/serveurs");
  await expect(page.getByText("2 / 3 serveurs")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Créer un serveur" })).toBeVisible();
});

test("« Serveurs » est la première entrée du groupe Diffuser", async ({ page }) => {
  await signedIn(page, "relais-nav");
  await page.setViewportSize({ width: 1280, height: 800 });
  const nav = page.getByRole("navigation", { name: "Navigation de l'espace client" });
  const first = nav.getByRole("link", { name: "Serveurs" });
  await expect(first).toBeVisible();
  await expect(first).toHaveAttribute("href", "/dashboard/serveurs");
});
