// Variables publiques Supabase (URL du projet + clé publishable). Absentes : le site marche, sans comptes.
// .trim() : une espace collée par erreur dans une variable ne doit pas casser l'auth.
// Repli sur les noms de l'intégration Vercel × Supabase (ANON_KEY) si la clé publishable n'est pas définie.
export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
export const hasSupabase = supabaseUrl !== "" && supabaseKey !== "";
