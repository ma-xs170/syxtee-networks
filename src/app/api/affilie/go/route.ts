import { NextResponse, type NextRequest } from "next/server";
import { slugSchema } from "@/lib/affiliates";
import { allow, clientIp } from "@/lib/auth/rateLimit";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Bouton de la page affiliée : compte le clic (au plus 5 par visiteur et par heure) puis envoie vers l'inscription.
export async function GET(req: NextRequest) {
  const slug = slugSchema.safeParse(req.nextUrl.searchParams.get("s") ?? "");
  if (slug.success && hasAdmin && (await allow(`aff:${await clientIp()}:${slug.data}`, 5, 3600))) {
    const { error } = await createAdminClient().rpc("affiliate_click", { p_slug: slug.data });
    if (error) console.error("affiliate_click", error.message);
  }
  return NextResponse.redirect(new URL("/inscription?next=%2Fdashboard%2Fabonnement", req.url));
}
