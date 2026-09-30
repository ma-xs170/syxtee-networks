import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Tests e2e : Next en dev sur :3100 (dossier .next-e2e), branché sur le projet Supabase DE TEST,
// un faux serveur Twitch sur :3999 et un faux SYXTEE Core sur :3998. Variables dans .env.test.local (voir .env.example).
if (existsSync(".env.test.local")) process.loadEnvFile(".env.test.local");

const PORT = 3100;
const TWITCH = "http://localhost:3999";
const CORE = "http://localhost:3998";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /ui\.spec\.ts/ },
  ],
  webServer: [
    { command: "node e2e/twitch-mock.mjs", url: `${TWITCH}/health`, reuseExistingServer: true },
    { command: "node e2e/core-mock.mjs", url: `${CORE}/health`, reuseExistingServer: true },
    {
      command: `npx next dev -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        NEXT_DIST_DIR: ".next-e2e",
        NEXT_PUBLIC_SUPABASE_URL: process.env.E2E_SUPABASE_URL ?? "",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.E2E_SUPABASE_PUBLISHABLE_KEY ?? "",
        SUPABASE_SECRET_KEY: process.env.E2E_SUPABASE_SECRET_KEY ?? "",
        TWITCH_CLIENT_ID: "e2e",
        TWITCH_CLIENT_SECRET: "e2e",
        TWITCH_API_BASE: `${TWITCH}/helix`,
        TWITCH_AUTH_BASE: `${TWITCH}/oauth2`,
        CORE_URL: CORE,
        CORE_API_TOKEN: "e2e-core-token-0123456789abcdef0123",
        // Admin des tests (espace /admin, TOTP) : compte créé par e2e/admin.spec.ts.
        ADMIN_EMAILS: "e2e-admin@syxtee.test",
        // Webhook Stripe : secret de test (événements signés par e2e/billing.spec.ts, aucun appel à Stripe).
        STRIPE_WEBHOOK_SECRET: "whsec_syxtee_e2e_0123456789abcdef",
        // Send Email Hook : secret de test (pas de RESEND_API_KEY : aucun email ne part vraiment).
        SEND_EMAIL_HOOK_SECRET: "v1,whsec_c3l4dGVlLWUyZS1ob29rLXNlY3JldC0wMTIzNDU2Nzg5",
      },
    },
  ],
});
