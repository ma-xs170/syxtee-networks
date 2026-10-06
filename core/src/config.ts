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
  CORS_ORIGINS: z.string().default("https://syxtee-networks.fr,https://www.syxtee-networks.fr,https://syxtee-networks.vercel.app,http://localhost:3000"),
  // Jeton partagé avec le serveur Vercel (actions du dashboard). Long et aléatoire.
  CORE_API_TOKEN: z.string().min(32, "CORE_API_TOKEN : 32 caractères minimum"),

  // Chiffrement des clés des relais au repos (AES-256-GCM) : `openssl rand -hex 32`. À sauvegarder : sans lui,
  // les URLs ne peuvent plus être affichées (il faudrait régénérer toutes les clés).
  RELAY_KEYS_SECRET: z.string().min(32, "RELAY_KEYS_SECRET : openssl rand -hex 32"),
  // SYXTEE Guard (coupure des sessions, bannissement d'IP sur le relais) : API locale. Vide = désactivé.
  GUARD_URL: z.string().default("http://127.0.0.1:8788"),
  // Force brute : N refus en FENÊTRE secondes pour une IP → bannie BAN minutes.
  SECURITY_MAX_FAILS: z.coerce.number().int().min(1).default(10),
  SECURITY_WINDOW_S: z.coerce.number().int().min(1).default(60),
  SECURITY_BAN_MINUTES: z.coerce.number().int().min(1).default(15),
  // IP jamais bannies (séparées par des virgules), en plus des adresses internes.
  SECURITY_ALLOW_IPS: z.string().default(""),

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
  // Entrée RTMP (DJI, GoPro, OBS…) via MediaMTX, relayée en SRT vers le SLS (voir rtmp.ts).
  RTMP_ENABLED: bool.default(true),
  RTMP_PORT: z.coerce.number().default(1935),
  // Entrée RIST (profil Main, AES-256) : un port UDP par relais dans cette plage, écouteur ffmpeg/librist (voir rist.ts).
  RIST_ENABLED: bool.default(true),
  RIST_PORT_MIN: z.coerce.number().default(6000),
  RIST_PORT_MAX: z.coerce.number().default(6199),

  DATA_DIR: z.string().default("./data"),
  // Carte de couverture : jeton IPinfo Lite (opérateur d'une IP, base téléchargée chaque semaine) et sel des
  // identifiants anonymes d'appareil (par défaut dérivé de CORE_API_TOKEN).
  IPINFO_TOKEN: z.string().default(""),
  COVERAGE_SALT: z.string().optional(),
  // Enregistrement des flux sur le serveur : quota par compte et place libre minimale du disque (en dessous, plus d'enregistrement).
  RECORD_ENABLED: bool.default(true),
  RECORD_QUOTA_GB: z.coerce.number().positive().default(10),
  RECORD_RETENTION_DAYS: z.coerce.number().int().min(1).default(15),
  RECORD_MIN_FREE_GB: z.coerce.number().min(0).default(20),
  PREVIEW_ENABLED: bool.default(true),
  PREVIEW_INTERVAL_S: z.coerce.number().default(3),
  // Régie (mire automatique) : réencodage, ~1,5–2 vCPU par flux 1080p. Désactivée par défaut.
  REGIE_ENABLED: bool.default(false),
  // Sortie fixe 1920 x 1080 : quel que soit le format reçu (ou la mire), OBS lit toujours la même résolution.
  REGIE_WIDTH: z.coerce.number().default(1920),
  REGIE_HEIGHT: z.coerce.number().default(1080),
  REGIE_FPS: z.coerce.number().default(30),
  REGIE_BITRATE_KBPS: z.coerce.number().default(6000),
  REGIE_BEEP: bool.default(false),
  // Fuseau de l'heure affichée sur la mire (le conteneur tourne en UTC).
  REGIE_TZ: z.string().default("Europe/Paris"),
  // Coupure détectée après ce délai sans paquets.
  REGIE_TIMEOUT_MS: z.coerce.number().default(1500),

  // SYXTEE Cam (WebRTC/WHIP via MediaMTX, voir deploy/mediamtx.yml).
  CAM_ENABLED: bool.default(true),
  /** Diffusion depuis SYXTEE STUDIO (WebRTC vers MediaMTX, puis RTMP vers les plateformes). Nécessite la Cam (même MediaMTX et même WHIP). */
  STUDIO_ENABLED: bool.default(true),
  /** SYXTEE Link : télécommande d'OBS (agent sur le PC, WebSocket vers le Core). */
  LINK_ENABLED: bool.default(true),
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
