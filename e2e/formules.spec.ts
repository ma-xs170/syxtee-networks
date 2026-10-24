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

  test("gratuit : 1 serveur inclus, contrôle à distance verrouillé avec carte d'upgrade", async ({ page }) => {
    const a = await account("gratuit", { plan: "free" });
    await signInWithPassword(page, a.email, a.password);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("region", { name: "Formule" })).toContainText("Gratuit");

    // Le palier Gratuit garde 1 serveur.
    await page.goto("/dashboard/serveurs");
    await expect(page.getByText("0 / 1 connexions")).toBeVisible();
    await expect(page.getByRole("region", { name: /disponible avec un forfait/ })).toHaveCount(0);

    // Le contrôle à distance (scènes) reste réservé aux abonnés.
    await page.goto("/dashboard/scenes");
    const lock = page.getByRole("region", { name: /disponible avec un forfait/ });
    await expect(lock).toBeVisible();
    await expect(lock.getByRole("link", { name: "Choisir une formule" })).toHaveAttribute("href", "/dashboard/compte?onglet=formule");
    await expect(lock.getByRole("link", { name: "Voir les forfaits" })).toHaveAttribute("href", "/tarifs");
  });

  test("partenaire : tout débloqué, badge PARTENAIRE", async ({ page }) => {
    const a = await account("partenaire", { plan: "partner", plan_until: null });
    await signInWithPassword(page, a.email, a.password);
    await expect(page.getByRole("region", { name: "Formule" })).toContainText("PARTENAIRE");
    await page.goto("/dashboard/serveurs");
    await expect(page.getByRole("region", { name: /disponible avec un forfait/ })).toHaveCount(0);
  });

  test("échéance passée : traité en gratuit avant même la tâche quotidienne", async ({ page }) => {
    const a = await account("echu", { plan: "partner", plan_until: new Date(Date.now() - 86_400_000).toISOString() });
    await signInWithPassword(page, a.email, a.password);
    await expect(page.getByRole("region", { name: "Formule" })).toContainText("Gratuit");
  });
});
