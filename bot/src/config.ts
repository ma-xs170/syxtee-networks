import { z } from "zod";

// Configuration du bot : variables d'environnement (fichier /opt/syxtee/.env sur le VPS, jamais dans git).

const schema = z.object({
  DISCORD_TOKEN: z.string().min(50, "DISCORD_TOKEN : jeton du bot (portail développeurs Discord > Bot > Reset Token)"),
  DISCORD_CLIENT_ID: z.string().regex(/^\d+$/, "DISCORD_CLIENT_ID : ID de l'application"),
  // Salon des nouveautés et des alertes.
  DISCORD_CHANNEL_ID: z.string().regex(/^\d+$/).default("1553431479302758571"),
  // Serveur Discord : les commandes y apparaissent tout de suite (les commandes globales mettent jusqu'à 1 h).
  DISCORD_GUILD_ID: z.string().regex(/^\d+$/).optional(),

  SITE_URL: z.url().default("https://syxtee-networks.vercel.app"),
  // API du Core (Caddy ou localhost). Le jeton sert aux routes /v1/admin/* (CPU, flux en direct).
  CORE_URL: z.url().default("http://127.0.0.1:8787"),
  CORE_API_TOKEN: z.string().optional(),
  SUPABASE_URL: z.url().optional(),

  // Webhook GitHub (nouveautés = push sur main). Vide = désactivé.
  GITHUB_WEBHOOK_SECRET: z.string().min(16).optional(),
  GITHUB_BRANCH: z.string().default("main"),
  BOT_PORT: z.coerce.number().default(8790),
  BOT_HOST: z.string().default("127.0.0.1"),
  // Jeton de POST /announce (annonce depuis un script ou Vercel). Vide = route désactivée.
  BOT_ANNOUNCE_TOKEN: z.string().min(24).optional(),

  // Alertes de panne / retour à la normale dans le salon.
  ALERTS_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== "0" && v !== "false"),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    console.error("Configuration invalide :\n" + parsed.error.issues.map((i) => ` - ${i.path.join(".")} : ${i.message}`).join("\n"));
    process.exit(1);
  }
  return parsed.data;
}
