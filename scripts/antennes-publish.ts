// Publie la carte des antennes à la main (même traitement que le cron quotidien).
// node scripts/antennes-publish.ts   (lit .env.local : URL Supabase + clé secrète)
import { createClient } from "@supabase/supabase-js";
import { publishAntennes } from "../src/lib/antennes/publish.ts";

process.loadEnvFile(".env.local");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.SUPABASE_SECRET_KEY!.trim(), { auth: { persistSession: false } });
const t0 = Date.now();
const res = await publishAntennes(admin);
console.log(`Trimestre ${res.quarter} · indisponibilités du ${res.statusDate} · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.table(res.summary.map((s) => ({ ...s, ko: Math.round(s.bytes / 1024) })));
