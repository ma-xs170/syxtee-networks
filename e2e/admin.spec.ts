import { createHmac, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { admin, createUser, deleteUser, hasTestProject, signInWithPassword, testEmail, testPassword } from "./helpers";

// Espace admin (Prompt J) : un compte normal ne voit jamais /admin ni /api/admin (404) ; l'admin passe par le TOTP.
// ADMIN_EMAILS = e2e-admin@syxtee.test (playwright.config.ts).
test.skip(!hasTestProject, "E2E_SUPABASE_URL / E2E_SUPABASE_SECRET_KEY manquants (.env.test.local)");

const ADMIN_EMAIL = "e2e-admin@syxtee.test";
const PAGES = ["/admin", "/admin/revenus", "/admin/comptes", `/admin/comptes/${randomUUID()}`, "/admin/relais", "/admin/partenaires", "/admin/carte", "/admin/securite", "/admin/journal", "/admin/2fa"];

/** Code TOTP (RFC 6238, SHA-1, 6 chiffres, 30 s) à partir de la clé base32 affichée à l'enrôlement. */
function totp(secret: string, at = Date.now()) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

const created: string[] = [];
test.afterAll(async () => {
  for (const id of created) await deleteUser(id);
});

test("compte normal : 404 sur toutes les pages /admin et sur /api/admin", async ({ page }) => {
  const email = testEmail("pas-admin");
  const password = testPassword();
  const user = await createUser(email, { password });
  created.push(user.id);
  await admin().from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
  await signInWithPassword(page, email, password);
  await expect(page).toHaveURL(/\/dashboard$/);

  for (const path of PAGES) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
  }
  const api = await page.request.get("/api/admin/comptes");
  expect(api.status()).toBe(404);
});

test("admin : TOTP obligatoire, enrôlement puis accès à la vue d'ensemble", async ({ page }) => {
  const { data: list } = await admin().auth.admin.listUsers({ perPage: 1000 });
  const old = list.users.find((u) => u.email === ADMIN_EMAIL);
  if (old) await deleteUser(old.id);
  const password = testPassword();
  const user = await createUser(ADMIN_EMAIL, { password });
  created.push(user.id);
  await admin().from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);

  await signInWithPassword(page, ADMIN_EMAIL, password);
  await expect(page).toHaveURL(/\/dashboard$/);

  // Sans code TOTP : redirigé vers la double authentification, et l'API reste fermée.
  await page.goto("/admin/comptes");
  await expect(page).toHaveURL(/\/admin\/2fa$/);
  expect((await page.request.get("/api/admin/comptes")).status()).toBe(404);

  await page.getByRole("button", { name: "Configurer la double authentification" }).click();
  const secret = (await page.locator("span.select-all").textContent())!.trim();
  await page.getByLabel("Code à 6 chiffres").fill("000000");
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page.getByText("Code incorrect ou expiré.")).toBeVisible();

  await page.getByLabel("Code à 6 chiffres").fill(totp(secret));
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: /Vue d'ensemble/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin" })).toBeVisible();

  const { data: log } = await admin().from("admin_audit").select("action").eq("target_user", user.id);
  expect(log?.map((l) => l.action)).toContain("admin.mfa_verified");
});
