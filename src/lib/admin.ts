import "server-only";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth/dal";

// Administrateurs : emails de la variable ADMIN_EMAILS (Vercel, séparés par des virgules), jamais écrits dans le code.
// Vérifié côté serveur dans chaque page et chaque action /admin. Un compte normal reçoit une 404, pas une 403.

const admins = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export function isAdminEmail(email: string | null | undefined) {
  return !!email && admins().includes(email.toLowerCase());
}

/** Page ou action réservée à l'admin : 404 pour tout autre visiteur (connecté ou non). */
export async function requireAdmin() {
  const user = await getUser();
  if (!user || !user.email_confirmed_at || !isAdminEmail(user.email)) notFound();
  return user;
}
