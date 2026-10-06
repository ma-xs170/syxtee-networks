import { getUser } from "@/lib/auth/dal";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Battement de présence : le dashboard ouvert appelle cette route chaque minute ; l'admin voit « En ligne » (moins de 2 min)
// ou la dernière activité. Une écriture minuscule, uniquement sur la ligne du compte connecté.
export async function POST() {
  const user = await getUser();
  if (!user || !hasAdmin) return new Response(null, { status: 204 });
  await createAdminClient().from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
  return new Response(null, { status: 204 });
}
