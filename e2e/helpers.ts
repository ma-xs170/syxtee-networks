import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

// Accès admin au projet Supabase DE TEST : création d'utilisateurs et liens magiques sans passer par un vrai email.
export const hasTestProject = !!(process.env.E2E_SUPABASE_URL && process.env.E2E_SUPABASE_SECRET_KEY);

export const admin = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

export const testEmail = (tag: string) => `e2e+${tag}-${Date.now()}@syxtee.test`;

export async function createUser(email: string) {
  const { data, error } = await admin().auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser");
  return data.user;
}

/** Ouvre le lien magique de `email` (même route que le lien reçu par email). */
export async function signInWithMagicLink(page: Page, email: string) {
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  await page.goto(`/auth/confirm?token_hash=${data.properties.hashed_token}&type=email`);
}

export async function deleteUser(id: string | undefined) {
  if (id) await admin().auth.admin.deleteUser(id);
}
