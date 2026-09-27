import { z } from "zod";

// Configuration du Core : variables d'environnement (fichier /opt/syxtee/.env sur le VPS, jamais dans git).

const bool = z
  .string()
  .optional()
  .transform((v) => v === "1" || v === "true");

const schema = z.object({
  PORT: z.coerce.number().default(8787),
  HOST: z.string().default("0.0.0.0"),
  // Origines autorisées à appeler le Core depuis le navigateur (dashboard), séparées par des virgules.
  CORS_ORIGINS: z.string().default("https://syxtee-networks.vercel.app,http://localhost:3000"),
  // Jeton partagé avec le serveur Vercel (actions du dashboard). Long et aléatoire.
  CORE_API_TOKEN: z.string().min(32, "CORE_API_TOKEN : 32 caractères minimum"),

  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(10),

  // srt-live-server (conteneur srtla-receiver) : API + stats sur le même port.
  SLS_API_URL: z.url().default("http://127.0.0.1:8080"),
  SLS_API_KEY: z.string().min(8),
  // Budget de requêtes /stats par seconde (limite SLS par défaut : 300/min = 5/s).
  SLS_STATS_PER_SECOND: z.coerce.number().default(4.5),
  // Adresses internes pour lire / publier en SRT depuis le Core (réseau Docker).
  SLS_SRT_HOST: z.string().default("127.0.0.1"),

  // Ce que voient les utilisateurs (URLs à coller dans Moblin / OBS).
  RELAY_PUBLIC_HOST: z.string().min(3),
  RELAY_NAME: z.string().default("nyc1"),
  SRTLA_PORT: z.coerce.number().default(5000),
  SRT_PUBLISH_PORT: z.coerce.number().default(4001),
  SRT_PLAY_PORT: z.coerce.number().default(4000),

  DATA_DIR: z.string().default("./data"),
  PREVIEW_ENABLED: bool.default(true),
  PREVIEW_INTERVAL_S: z.coerce.number().default(3),
  // Régie (mire automatique) : réencodage, ~1,5–2 vCPU par flux 1080p. Désactivée par défaut.
  REGIE_ENABLED: bool.default(false),
  REGIE_WIDTH: z.coerce.number().default(1280),
  REGIE_HEIGHT: z.coerce.number().default(720),
  REGIE_FPS: z.coerce.number().default(30),
  REGIE_BITRATE_KBPS: z.coerce.number().default(4000),
  REGIE_BEEP: bool.default(false),
  // Coupure détectée après ce délai sans paquets.
  REGIE_TIMEOUT_MS: z.coerce.number().default(1500),

  // SYXTEE Cam (WebRTC/WHIP via MediaMTX, voir deploy/mediamtx.yml).
  CAM_ENABLED: bool.default(true),
  MEDIAMTX_API_URL: z.string().default("http://127.0.0.1:9997"),
  MEDIAMTX_RTSP_URL: z.string().default("rtsp://127.0.0.1:8554"),
  // Adresse publique du WHIP (Caddy → MediaMTX). Par défaut : https://cam.<CORE_DOMAIN>
  CAM_WHIP_BASE: z.string().optional(),
  CORE_DOMAIN: z.string().optional(),
  // Sortie du relais Cam ; {host}, {port}, {publish_id} sont remplacés.
  CAM_RELAY_URL: z.string().default("srt://{host}:{port}?streamid={publish_id}&pkt_size=1316&latency=200000"),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")} : ${i.message}`).join("\n");
    throw new Error(`Configuration invalide :\n${msg}`);
  }
  return parsed.data;
}
