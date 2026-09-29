import { expect, test } from "@playwright/test";
import { Webhook } from "standardwebhooks";

// Send Email Hook de Supabase : signature obligatoire. Secret de test défini dans playwright.config.ts.
const SECRET = "c3l4dGVlLWUyZS1ob29rLXNlY3JldC0wMTIzNDU2Nzg5";

const payload = {
  user: { email: "e2e@syxtee.test", user_metadata: { first_name: "Camille" } },
  email_data: { token: "123456", token_hash: "abc", redirect_to: "http://localhost:3100/auth/confirm", email_action_type: "signup", site_url: "http://localhost:3100" },
};

test("hook email : sans signature valide → 401", async ({ request }) => {
  const res = await request.post("/api/auth/email-hook", {
    data: payload,
    headers: { "webhook-id": "msg_1", "webhook-timestamp": String(Math.floor(Date.now() / 1000)), "webhook-signature": "v1,faux" },
  });
  expect(res.status()).toBe(401);
});

test("hook email : signé → accepté (envoi impossible sans clé Resend en test)", async ({ request }) => {
  const body = JSON.stringify(payload);
  const id = "msg_2";
  const ts = new Date();
  const signature = new Webhook(SECRET).sign(id, ts, body);
  const res = await request.post("/api/auth/email-hook", {
    data: body,
    headers: { "content-type": "application/json", "webhook-id": id, "webhook-timestamp": String(Math.floor(ts.getTime() / 1000)), "webhook-signature": signature },
  });
  // Signature acceptée : l'erreur vient de l'envoi (RESEND_API_KEY absente), pas de la vérification.
  expect(res.status()).toBe(502);
  expect((await res.json()).error.message).toBe("envoi de l'email impossible");
});
