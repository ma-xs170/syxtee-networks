import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { newDevice, passwordChanged, welcome } from "@/emails/templates";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "./send";

// Emails liés au compte, envoyés après la réponse (after) : la connexion n'attend jamais l'envoi.

const DEVICE_COOKIE = "syx_device";

/** « Chrome sur macOS » à partir du User-Agent (approximatif, suffisant pour une alerte). */
export function describeDevice(ua: string) {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navigateur";
  const os = /iPhone|iPad/.test(ua) ? "iPhone / iPad" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "système inconnu";
  return `${browser} sur ${os}`;
}

/** Ville et pays approximatifs (en-têtes géo de Vercel ; absents en local). */
function place(h: Headers) {
  const city = h.get("x-vercel-ip-city");
  const country = h.get("x-vercel-ip-country");
  const c = city ? decodeURIComponent(city) : null;
  return [c, country].filter(Boolean).join(", ") || null;
}

/** Après une connexion par mot de passe : alerte si l'appareil est nouveau (jamais pour le premier appareil). */
export async function checkNewDevice(user: User) {
  if (!hasAdmin || !user.email || user.email.endsWith("@comptes.syxtee-networks.fr")) return;
  const jar = await cookies();
  let device = jar.get(DEVICE_COOKIE)?.value;
  if (!device || !/^[0-9a-f-]{36}$/.test(device)) {
    device = randomUUID();
    jar.set(DEVICE_COOKIE, device, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 730 });
  }
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  const where = place(h);
  const hash = createHash("sha256").update(`${user.id}:${device}`).digest("hex");
  const email = user.email;
  after(async () => {
    const { data, error } = await createAdminClient().rpc("device_seen", { p_user: user.id, p_device: hash, p_user_agent: ua });
    if (error) return console.error("device_seen", error.message);
    if (data === "new") await sendEmail(email, newDevice({ device: describeDevice(ua), place: where, at: new Date() }));
  });
}

/** Bienvenue : une seule fois par compte, après la vérification de l'adresse. */
export function sendWelcomeOnce(user: User, firstName: string | null, lastName: string | null = null) {
  if (!hasAdmin || !user.email || !user.email_confirmed_at) return;
  const email = user.email;
  after(async () => {
    const { data, error } = await createAdminClient().rpc("mark_welcomed", { p_user: user.id });
    if (error) return console.error("mark_welcomed", error.message);
    if (data === true) await sendEmail(email, welcome({ firstName, lastName }));
  });
}

/** Alerte de sécurité après un changement de mot de passe (toujours envoyée). */
export function sendPasswordChanged(email: string | undefined) {
  if (!email) return;
  after(() => sendEmail(email, passwordChanged({ at: new Date() })));
}
