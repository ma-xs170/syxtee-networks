import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createUserVerifier } from "./auth.ts";
import { loadConfig } from "./config.ts";
import { createHealthMonitor, type Live } from "./health.ts";
import { createKeyStore } from "./keys.ts";
import { loadLogo } from "./mire.ts";
import { createPreviews } from "./preview.ts";
import { createRegie } from "./regie.ts";
import { openSamples } from "./samples.ts";
import { createAsn } from "./asn.ts";
import { runBackfill, supabaseBackfillDb } from "./backfill.ts";
import { createCoverage, supabaseCoverageDb } from "./coverage.ts";
import { createPrefixes } from "./link.ts";
import { buildServer } from "./server.ts";
import { createCam } from "./cam.ts";
import { createSessionTracker, supabaseSessionDb } from "./sessions.ts";
import { createSls } from "./sls.ts";

// SYXTEE Core : point d'entrée.

const config = loadConfig();
const log = (m: string) => console.log(`[core] ${m}`);

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const sls = createSls(config.SLS_API_URL, config.SLS_API_KEY);
const keys = createKeyStore(supabase, sls);
const samples = openSamples(join(config.DATA_DIR, "health.sqlite"));
const asn = createAsn({ file: join(config.DATA_DIR, "ipinfo_lite.mmdb"), token: config.IPINFO_TOKEN, log });
const coverageSalt = config.COVERAGE_SALT || `coverage:${config.CORE_API_TOKEN}`;
const coverage = createCoverage({ db: supabaseCoverageDb(supabase), salt: coverageSalt, log });
// Préfixes IP (/24, /48) appris depuis les Android : table ip_prefix_class.
const prefixes = createPrefixes(
  {
    load: async () => {
      const { data, error } = await supabase.from("ip_prefix_class").select("prefix, cellular, wifi").limit(100_000);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    save: async (rows) => {
      const { error } = await supabase.from("ip_prefix_class").upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })));
      if (error) throw new Error(error.message);
    },
  },
  log,
);
const health = createHealthMonitor({ sls, samples, perSecond: config.SLS_STATS_PER_SECOND });
const sessionDb = supabaseSessionDb(supabase);
const sessions = createSessionTracker({ db: sessionDb, relay: config.RELAY_NAME, log });

const previews = config.PREVIEW_ENABLED
  ? createPreviews({ dir: join(config.DATA_DIR, "previews"), host: config.SLS_SRT_HOST, port: config.SRT_PLAY_PORT, intervalS: config.PREVIEW_INTERVAL_S, log })
  : null;
const regie = config.REGIE_ENABLED
  ? createRegie({
      dir: join(config.DATA_DIR, "mire"),
      relay: config.RELAY_NAME,
      logoPng: loadLogo(new URL("../assets/logo.png", import.meta.url).pathname),
      log,
      username: (id) => keys.username(id),
      srtHost: config.SLS_SRT_HOST,
      playPort: config.SRT_PLAY_PORT,
      publishPort: config.SRT_PUBLISH_PORT,
      width: config.REGIE_WIDTH,
      height: config.REGIE_HEIGHT,
      fps: config.REGIE_FPS,
      bitrateKbps: config.REGIE_BITRATE_KBPS,
      timeoutMs: config.REGIE_TIMEOUT_MS,
      beep: config.REGIE_BEEP,
    })
  : null;

// WHIP sur un sous-domaine dédié (Caddy → MediaMTX), par défaut cam.<CORE_DOMAIN>.
const camWhipBase = config.CAM_WHIP_BASE || (config.CORE_DOMAIN ? `https://cam.${config.CORE_DOMAIN}` : "");
const cam =
  config.CAM_ENABLED && camWhipBase
    ? createCam({
        db: supabase,
        keys,
        apiUrl: config.MEDIAMTX_API_URL,
        rtspUrl: config.MEDIAMTX_RTSP_URL,
        whipBase: camWhipBase,
        output: (publishId) =>
          config.CAM_RELAY_URL.replace("{host}", config.SLS_SRT_HOST).replace("{port}", String(config.SRT_PUBLISH_PORT)).replace("{publish_id}", publishId),
        log,
      })
    : null;

async function refreshKeys() {
  try {
    const all = await keys.all();
    health.setKeys(all);
    cam?.setKeys(all);
    await regie?.sync(all);
  } catch (e) {
    log(`lecture des clés impossible : ${(e as Error).message}`);
  }
}

health.events.on("status", (userId: string, s: { live: boolean }) => {
  log(`flux ${userId.slice(0, 8)} ${s.live ? "en ligne" : "hors ligne"}`);
  sessions.status(userId, s.live);
  if (!s.live) coverage.end(userId, "live");
  previews?.sync(health.liveUsers());
});

health.events.on("sample", (userId: string, s: Live) => {
  if (!s.live || !s.sample) return;
  sessions.sample(userId, s.sample.bitrate);
  // Couverture : relevé du direct + dernière position envoyée par SYXTEE Cam (consentement vérifié dans coverage).
  const pos = samples.positions(userId, s.sample.t - 5000).at(-1) ?? null;
  if (pos) coverage.live(userId, s.sample, pos).catch((e) => log(`couverture : ${(e as Error).message}`));
});

const app = buildServer({
  config,
  keys,
  health,
  samples,
  sessions,
  coverage,
  asn,
  prefixes,
  cam,
  profile: async (id) => {
    const { data } = await supabase.from("profiles").select("username, twitch_login").eq("id", id).maybeSingle();
    return { username: (data?.username as string | null) ?? null, twitch_login: (data?.twitch_login as string | null) ?? null };
  },
  verifyUser: createUserVerifier(config.SUPABASE_URL),
  previewPath: (id) => previews?.path(id) ?? "",
  onKeysChanged: () => void refreshKeys(),
  slsHealthy: async () => {
    try {
      return (await fetch(`${config.SLS_API_URL}/health`, { signal: AbortSignal.timeout(2000) })).ok;
    } catch {
      return false;
    }
  },
});

try {
  const n = await sessionDb.closeStale();
  if (n) log(`${n} direct(s) resté(s) ouvert(s) fermé(s)`);
} catch (e) {
  log((e as Error).message);
}
await refreshKeys();
const cleanup = async () => {
  try {
    const removed = await keys.cleanupOrphans();
    if (removed.length) log(`relais : ${removed.length} paire(s) orpheline(s) retirée(s)`);
  } catch (e) {
    log(`nettoyage du relais impossible : ${(e as Error).message}`);
  }
};
await cleanup();
void asn.refresh();
void prefixes.load();
// Couverture : hexagones touchés toutes les 10 min, purge 90 j + recalcul complet chaque jour.
const runAggregate = async (full = false) => {
  try {
    await coverage.aggregate(full);
  } catch (e) {
    log(`couverture : ${(e as Error).message}`);
  }
};
// Re-traitement unique des mesures déjà collectées (règles v2), puis carte complète.
void runBackfill({ db: supabaseBackfillDb(supabase), salt: coverageSalt, aggregateAll: () => coverage.aggregate(true), log })
  .then((r) => (r ? null : runAggregate(true)))
  .catch((e) => log(`couverture, backfill : ${(e as Error).message}`));
const timers = [
  setInterval(() => void coverage.flush(), 30_000),
  setInterval(() => void runAggregate(), 10 * 60_000),
  setInterval(() => void runAggregate(true), 24 * 3_600_000),
  setInterval(() => void prefixes.flush(), 60_000),
  setInterval(() => void asn.refresh(), 6 * 3_600_000),
  setInterval(() => void cleanup(), 3_600_000),
  setInterval(() => void sessions.tick(), 5_000),
  setInterval(() => void health.tick(), 200),
  setInterval(() => void refreshKeys(), 30_000),
  ...(cam ? [setInterval(() => void cam.syncRelays(), 1_000)] : []),
  setInterval(() => log(`purge santé : ${samples.purge()} points supprimés`), 3_600_000),
];

await app.listen({ port: config.PORT, host: config.HOST });
log(`prêt sur :${config.PORT} · relais ${config.RELAY_NAME} (${config.RELAY_PUBLIC_HOST}) · aperçus ${previews ? "oui" : "non"} · régie ${regie ? "oui" : "non"} · cam ${cam ? camWhipBase : "non"}`);

const shutdown = async () => {
  timers.forEach(clearInterval);
  previews?.stopAll();
  regie?.stopAll();
  cam?.stopAll();
  await sessions.closeAll();
  await coverage.flush();
  await prefixes.flush();
  await app.close();
  samples.close();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
