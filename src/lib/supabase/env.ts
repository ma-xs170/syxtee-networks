// Variables publiques Supabase (URL du projet + clé publishable). Absentes : le site marche, sans comptes.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const hasSupabase = supabaseUrl !== "" && supabaseKey !== "";
