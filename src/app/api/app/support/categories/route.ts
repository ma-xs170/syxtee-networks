import { appUser, privateJson } from "@/lib/auth/app-api";
import { CATEGORY_FORMS, SUPPORT_CATEGORIES } from "@/lib/support-categories";

// GET /api/app/support/categories : catégories et champs propres à chacune, pour le formulaire de l'app.
export async function GET() {
  const u = await appUser();
  if (u instanceof Response) return u;
  return privateJson({ categories: SUPPORT_CATEGORIES.map((c) => ({ ...c, form: CATEGORY_FORMS[c.id] })) });
}
