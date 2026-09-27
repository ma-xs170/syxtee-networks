import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Tests e2e : Next en dev sur :3100 (dossier .next-e2e), branché sur le projet Supabase DE TEST,
// et un faux serveur Twitch sur :3999. Variables dans .env.test.local (voir .env.example).
if (existsSync(".env.test.local")) process.loadEnvFile(".env.test.local");

const PORT = 3100;
const TWITCH = "http://localhost:3999";

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
      },
    },
  ],
});
