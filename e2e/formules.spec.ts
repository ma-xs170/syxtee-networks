import { expect, test } from "@playwright/test";
import { admin, createUser, deleteUser, hasTestProject, signInWithPassword, testEmail, testPassword } from "./helpers";

// Formules (Prompt K) sur le projet Supabase DE TEST (migration 0016_plans.sql appliquée).

test("cron formules : refusé sans CRON_SECRET", async ({ request }) => {
  const res = await request.get("/api/cron/formules");
  expect(res.status()).toBe(401);
});

test.describe("comptes", () => {
  test.skip(!hasTestProject, "E2E_SUPABASE_URL / E2E_SUPABASE_SECRET_KEY manquants (.env.test.local)");
  const created: string[] = [];
  test.afterAll(async () => {
    for (const id of created) await deleteUser(id);
  });

  async function account(tag: string, plan: Record<string, unknown>) {
    const email = testEmail(tag);
    const password = testPassword();
    const user = await createUser(email, { password });
    created.push(user.id);
    const { error } = await admin().from("profiles").update({ onboarded_at: new Date().toISOString(), ...plan }).eq("id", user.id);
    expect(error).toBeNull();
    return { email, password };
  }

  test("gratuit : bandeau, relais grisés, modale d'upgrade, scanner accessible", async ({ page }) => {
    const a = await account("gratuit", { plan: "free" });
    await signInWithPassword(page, a.email, a.password);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("region", { name: "Formule" })).toContainText("Formule gratuite");

    await page.goto("/dashboard/relais");
    const lock = page.getByRole("button", { name: /Relais et URLs : réservé aux abonnés/ });
    await expect(lock).toBeVisible();
    await lock.click();
    await expect(page.getByRole("dialog", { name: "Fonction réservée aux abonnés" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir les offres" })).toBeVisible();

    await page.goto("/dashboard/scanner");
    await expect(page.getByRole("button", { name: /réservé aux abonnés/ })).toHaveCount(0);
  });

  test("partenaire : tout débloqué, badge PARTENAIRE", async ({ page }) => {
    const a = await account("partenaire", { plan: "partner", plan_until: null });
    await signInWithPassword(page, a.email, a.password);
    await expect(page.getByRole("region", { name: "Formule" })).toContainText("PARTENAIRE");
    await page.goto("/dashboard/relais");
    await expect(page.getByRole("button", { name: /réservé aux abonnés/ })).toHaveCount(0);
  });

  test("échéance passée : traité en gratuit avant même la tâche quotidienne", async ({ page }) => {
    const a = await account("echu", { plan: "partner", plan_until: new Date(Date.now() - 86_400_000).toISOString() });
    await signInWithPassword(page, a.email, a.password);
    await expect(page.getByRole("region", { name: "Formule" })).toContainText("Formule gratuite");
  });
});
