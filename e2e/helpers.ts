import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

// Accès admin au projet Supabase DE TEST : création d'utilisateurs et liens magiques sans passer par un vrai email.
export const hasTestProject = !!(process.env.E2E_SUPABASE_URL && process.env.E2E_SUPABASE_SECRET_KEY);

export const admin = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

export const testEmail = (tag: string) => `e2e+${tag}-${Date.now()}@syxtee.test`;

/** Mot de passe de test : solide, unique, jamais vu dans une fuite. */
export const testPassword = () => `Syx-e2e-${Date.now().toString(36)}-Rk7!q`;

/** Compte de test confirmé. Prénom/nom par défaut (sinon la modale obligatoire bloque le dashboard) ; `names: false` pour un ancien compte. */
export async function createUser(email: string, o: { password?: string; first_name?: string; last_name?: string; names?: false } = {}) {
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: o.password,
    email_confirm: true,
    user_metadata: o.names === false ? undefined : { first_name: o.first_name ?? "Camille", last_name: o.last_name ?? "Testeur" },
  });
  if (error || !data.user) throw error ?? new Error("createUser");
  return data.user;
}

/** Ouvre le lien magique de `email` (même route que le lien reçu par email). */
export async function signInWithMagicLink(page: Page, email: string) {
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  await page.goto(`/auth/confirm?token_hash=${data.properties.hashed_token}&type=email`);
}

export async function signInWithPassword(page: Page, email: string, password: string) {
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

/** Compte créé par le formulaire d'inscription (id retrouvé par l'email). */
export async function userIdByEmail(email: string) {
  const { data } = await admin().auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email === email)?.id;
}

export async function deleteUser(id: string | undefined) {
  if (id) await admin().auth.admin.deleteUser(id);
}
