import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createUserVerifier } from "./auth.ts";
import { loadConfig } from "./config.ts";
import { createHealthMonitor, type Live } from "./health.ts";
import type { Relay } from "./relays.ts";
import { createRelayStore, publicName } from "./relays.ts";
import { createRist, ristSupported } from "./rist.ts";
import { createRtmp } from "./rtmp.ts";
import { loadLogo } from "./mire.ts";
import { createPreviews, openLive } from "./preview.ts";
import { createRegie } from "./regie.ts";
import { openSamples } from "./samples.ts";
import { createAsn } from "./asn.ts";
import { reclassUser, runBackfill, supabaseBackfillDb } from "./backfill.ts";
import { createCoverage, supabaseCoverageDb } from "./coverage.ts";
import { runPending, supabasePendingDb } from "./pending.ts";
import { createPrivateRelay } from "./privaterelay.ts";
import { createPrefixes } from "./link.ts";
import { buildServer } from "./server.ts";
import { createCam } from "./cam.ts";
import { createStudio } from "./studio.ts";
import { createRemote } from "./remote.ts";
import { createBackups } from "./backups.ts";
import { createRecordings } from "./recordings.ts";
import { createSessionTracker, supabaseSessionDb } from "./sessions.ts";
import { createSls } from "./sls.ts";
import { createSealer, parseSecret } from "./keys.ts";
import { publisherVerdict } from "./plans.ts";
import { createGuardClient, createSecurity, supabaseSecurityDb } from "./security.ts";

// SYXTEE Core : point d'entrée.

const config = loadConfig();
const log = (m: string) => console.log(`[core] ${m}`);

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const sls = createSls(config.SLS_API_URL, config.SLS_API_KEY);
const samples = openSamples(join(config.DATA_DIR, "health.sqlite"));
const asn = createAsn({ file: join(config.DATA_DIR, "ipinfo_lite.mmdb"), token: config.IPINFO_TOKEN, log });
// Relais privé iCloud : liste officielle des IP de sortie d'Apple, retéléchargée chaque jour.
const relay = createPrivateRelay({ file: join(config.DATA_DIR, "icloud_egress.csv"), log });

// Sécurité : clés chiffrées au repos, vérification à chaque connexion, force brute, coupures (Guard).
const guard = config.GUARD_URL ? createGuardClient(config.GUARD_URL, config.CORE_API_TOKEN) : null;
let rtmp: ReturnType<typeof createRtmp> | null = null;
let reconcileSoon: () => void = () => {};
const relays = createRelayStore(supabase, sls, config.RELAY_NAME, {
  sealer: createSealer(parseSecret(config.RELAY_KEYS_SECRET)),
  log,
  ristPorts: { min: config.RIST_PORT_MIN, max: config.RIST_PORT_MAX },
  // Clé retirée du SLS : sessions SRT/SRTLA coupées par le Guard ; RTMP et Cam coupés par leur boucle de synchro.
  onRevoked: (keys) => void security.kickKeys(keys).then((n) => n && log(`${n} session(s) coupée(s) (clé retirée)`)),
});
const health = createHealthMonitor({ sls, samples, perSecond: config.SLS_STATS_PER_SECOND });
const security = createSecurity({
  db: supabaseSecurityDb(supabase),
  guard,
  country: (ip) => asn.country(ip),
  log,
  allowIps: config.SECURITY_ALLOW_IPS.split(",").map((s) => s.trim()).filter(Boolean),
  maxFails: config.SECURITY_MAX_FAILS,
  windowMs: config.SECURITY_WINDOW_S * 1000,
  banMinutes: config.SECURITY_BAN_MINUTES,
  // Publieur accepté par le SLS : compte actif, formule, quota de relais, flux simultanés (relus en base, sans cache).
  async checkPublisher(relay) {
    const account = await relays.account(relay.user_id);
    const liveOthers = health.byUser(relay.user_id).filter((x) => x.relay.id !== relay.id && x.state.live).length;
    return publisherVerdict(account, await relays.list(relay.user_id), relay.id, liveOthers);
  },
  onDenied: () => reconcileSoon(),
});
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
const sessionDb = supabaseSessionDb(supabase);
const sessions = createSessionTracker({ db: sessionDb, relay: config.RELAY_NAME, log });

const previews = config.PREVIEW_ENABLED
  ? createPreviews({ dir: join(config.DATA_DIR, "previews"), host: config.SLS_SRT_HOST, port: config.SRT_PLAY_PORT, intervalS: config.PREVIEW_INTERVAL_S, log })
  : null;
const recordings = config.RECORD_ENABLED
  ? createRecordings({
      dir: join(config.DATA_DIR, "recordings"),
      host: config.SLS_SRT_HOST,
      port: config.SRT_PLAY_PORT,
      secret: config.CORE_API_TOKEN,
      quota: config.RECORD_QUOTA_GB * 1024 ** 3,
      minFreeBytes: config.RECORD_MIN_FREE_GB * 1024 ** 3,
      log,
    })
  : null;
const regie = config.REGIE_ENABLED
  ? createRegie({
      dir: join(config.DATA_DIR, "mire"),
      relay: config.RELAY_NAME,
      logoPng: loadLogo(new URL("../assets/logo.png", import.meta.url).pathname),
      log,
      username: (id) => relays.username(id),
      srtHost: config.SLS_SRT_HOST,
      playPort: config.SRT_PLAY_PORT,
      publishPort: config.SRT_PUBLISH_PORT,
      width: config.REGIE_WIDTH,
      height: config.REGIE_HEIGHT,
      fps: config.REGIE_FPS,
      bitrateKbps: config.REGIE_BITRATE_KBPS,
      timeoutMs: config.REGIE_TIMEOUT_MS,
      beep: config.REGIE_BEEP,
      tz: config.REGIE_TZ,
    })
  : null;

// Sortie SRT vers le SLS des flux reçus par MediaMTX (Cam en WebRTC, caméras en RTMP).
const srtOut = (publishId: string) =>
  config.CAM_RELAY_URL.replace("{host}", config.SLS_SRT_HOST).replace("{port}", String(config.SRT_PUBLISH_PORT)).replace("{publish_id}", publishId);

// WHIP sur un sous-domaine dédié (Caddy → MediaMTX), par défaut cam.<CORE_DOMAIN>.
const camWhipBase = config.CAM_WHIP_BASE || (config.CORE_DOMAIN ? `https://cam.${config.CORE_DOMAIN}` : "");
const cam =
  config.CAM_ENABLED && camWhipBase
    ? createCam({
        relays,
        security,
        apiUrl: config.MEDIAMTX_API_URL,
        rtspUrl: config.MEDIAMTX_RTSP_URL,
        whipBase: camWhipBase,
        output: srtOut,
        log,
      })
    : null;

// SYXTEE Link : télécommande d'OBS. Comptes autorisés = ceux qui ont un relais autorisé (accès sur invitation), mis à jour avec les clés.
const verifyUser = createUserVerifier(config.SUPABASE_URL);
const linkUsers = new Set<string>();
const remote = config.LINK_ENABLED ? createRemote({ db: supabase as never, canUse: (id) => linkUsers.has(id), verifyUser, log }) : null;
const backups = remote ? createBackups({ db: supabase as never, dir: join(config.DATA_DIR, "link-backups"), log }) : null;

// SYXTEE STUDIO : le navigateur publie en WebRTC (même WHIP que la Cam), le Core diffuse en RTMP vers les plateformes.
const studio =
  config.STUDIO_ENABLED && camWhipBase
    ? createStudio({ apiUrl: config.MEDIAMTX_API_URL, rtspUrl: config.MEDIAMTX_RTSP_URL, whipBase: camWhipBase, log, security })
    : null;

// Entrée RTMP : même MediaMTX que la Cam.
rtmp = config.RTMP_ENABLED
  ? createRtmp({ apiUrl: config.MEDIAMTX_API_URL, rtspUrl: config.MEDIAMTX_RTSP_URL, output: srtOut, log, security })
  : null;

// Entrée RIST : un ffmpeg (librist) par relais. Désactivée, avec un avertissement, si ce ffmpeg ne sait pas faire du RIST.
const ristOk = config.RIST_ENABLED ? await ristSupported() : false;
if (config.RIST_ENABLED && !ristOk) log("rist : ce ffmpeg n'a pas librist, entrée RIST désactivée (voir core/Dockerfile)");
const rist = ristOk ? createRist({ output: srtOut, log }) : null;

/** Aligne le SLS sur la base (relais autorisés seulement) et distribue les clés aux modules. */
let refreshing: Promise<void> | null = null;
async function refreshKeys() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const { relays: ok, added, removed } = await relays.reconcile();
      if (added || removed) log(`relais : ${added} paire(s) déclarée(s), ${removed} retirée(s) du SLS`);
      health.setKeys(ok);
      security.setRelays(ok);
      cam?.setKeys(ok);
      studio?.setUsers(new Set(ok.map((r) => r.user_id)));
      linkUsers.clear();
      for (const r of ok) linkUsers.add(r.user_id);
      rtmp?.setKeys(ok);
      rist?.setKeys(ok);
      await regie?.sync(ok);
    } catch (e) {
      log(`lecture des clés impossible : ${(e as Error).message}`);
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}
reconcileSoon = () => void refreshKeys();

health.events.on("status", (relayId: string, s: { live: boolean }, relay: Relay) => {
  log(`relais ${relayId.slice(0, 8)} ${s.live ? "en ligne" : "hors ligne"}`);
  sessions.status(relayId, s.live, relay.user_id);
  relays.setStatus(relayId, s.live).catch((e) => log((e as Error).message));
  if (!s.live) coverage.end(relay.user_id, "live");
  previews?.sync(health.liveRelays());
  void recordings?.sync(health.liveRelays()).catch((e) => log(`enregistrements : ${(e as Error).message}`));
});

health.events.on("sample", (relayId: string, s: Live, relay: Relay) => {
  if (!s.live || !s.sample) return;
  sessions.sample(relayId, s.sample.bitrate);
  // Couverture : relevé du direct + dernière position envoyée par SYXTEE Cam (consentement vérifié dans coverage).
  const pos = samples.positions(relay.user_id, s.sample.t - 5000).at(-1) ?? null;
  if (pos) coverage.live(relay.user_id, s.sample, pos).catch((e) => log(`couverture : ${(e as Error).message}`));
});

const app = buildServer({
  config,
  relays,
  rtmp,
  rist,
  health,
  samples,
  sessions,
  coverage,
  asn,
  prefixes,
  relay,
  reclassUser: async (userId: string) =>
    reclassUser({ db: supabaseBackfillDb(supabase), salt: coverageSalt, userId, declared: await coverage.declared(userId), touch: coverage.touch }),
  cam,
  studio,
  security,
  profile: async (id) => {
    const { data } = await supabase.from("profiles").select("username, first_name, last_name, twitch_display_name, twitch_login").eq("id", id).maybeSingle();
    return { username: publicName(data), twitch_login: (data?.twitch_login as string | null) ?? null };
  },
  verifyUser,
  remote,
  backups,
  recordings,
  previewPath: (id) => previews?.path(id) ?? "",
  liveFeed: previews ? (r) => openLive({ host: config.SLS_SRT_HOST, port: config.SRT_PLAY_PORT, playId: r.play_id }) : undefined,
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
try {
  await relays.resetStatus();
} catch (e) {
  log((e as Error).message);
}
try {
  const n = await relays.encryptLegacy();
  if (n) log(`${n} relais : clés chiffrées (AES-256-GCM) et empreintes posées`);
} catch (e) {
  log(`chiffrement des clés : ${(e as Error).message}`);
}
try {
  await security.loadBans();
} catch (e) {
  log(`ip_bans : ${(e as Error).message}`);
}
await refreshKeys();
void asn.refresh();
void relay.refresh();
void prefixes.load();
// Couverture : hexagones touchés toutes les 10 min, purge 90 j + recalcul complet chaque jour.
const runAggregate = async (full = false) => {
  try {
    await coverage.aggregate(full);
  } catch (e) {
    log(`couverture : ${(e as Error).message}`);
  }
};
// Mesures prises sans base IPinfo : reclassées dès que la base est là (IP effacée ensuite).
const runPendingQueue = () =>
  void runPending({ db: supabasePendingDb(supabase), asn, relay, prefixes, touch: coverage.touch, log }).catch((e) => log(`couverture, file d'attente : ${(e as Error).message}`));
// Re-traitement unique des mesures déjà collectées (règles v3 : ASN Antilles-Guyane, opérateur déclaré), puis carte complète.
void runBackfill({ db: supabaseBackfillDb(supabase), salt: coverageSalt, aggregateAll: () => coverage.aggregate(true), log })
  .then((r) => (r ? null : runAggregate(true)))
  .catch((e) => log(`couverture, backfill : ${(e as Error).message}`));
const timers = [
  // Échéances de formule et suspensions faites hors du dashboard : réalignement du relais toutes les 5 min.
  setInterval(() => void refreshKeys(), 5 * 60_000),
  setInterval(() => void coverage.flush(), 30_000),
  setInterval(() => void runAggregate(), 10 * 60_000),
  setInterval(() => void runAggregate(true), 24 * 3_600_000),
  setInterval(() => void prefixes.flush(), 60_000),
  setInterval(() => void asn.refresh(), 6 * 3_600_000),
  setInterval(() => void relay.refresh(), 6 * 3_600_000),
  setInterval(runPendingQueue, 10 * 60_000),
  setInterval(() => void security.flush(), 5_000),
  setInterval(() => void supabase.rpc("security_purge").then(({ error }) => error && log(`security_purge : ${error.message}`)), 24 * 3_600_000),
  setInterval(() => void sessions.tick(), 5_000),
  setInterval(() => void health.tick(), 200),
  ...(recordings ? [setInterval(() => void recordings.sync(health.liveRelays()).catch((e) => log(`enregistrements : ${(e as Error).message}`)), 10_000)] : []),
  setInterval(() => void refreshKeys(), 30_000),
  ...(cam ? [setInterval(() => void cam.syncRelays(), 1_000)] : []),
  ...(studio ? [setInterval(() => void studio.sync(), 1_000)] : []),
  ...(rtmp ? [setInterval(() => void rtmp.sync(), 1_000)] : []),
  setInterval(() => log(`purge santé : ${samples.purge()} points supprimés`), 3_600_000),
];

await app.listen({ port: config.PORT, host: config.HOST });
// WebSocket de SYXTEE Link (agent et navigateur) : tout autre « upgrade » est refusé.
app.server.on("upgrade", (req, socket, head) => {
  if (!remote?.upgrade(req, socket, head)) socket.destroy();
});
log(`prêt sur :${config.PORT} · relais ${config.RELAY_NAME} (${config.RELAY_PUBLIC_HOST}) · aperçus ${previews ? "oui" : "non"} · régie ${regie ? "oui" : "non"} · cam ${cam ? camWhipBase : "non"} · studio ${studio ? "oui" : "non"} · link ${remote ? "oui" : "non"} · rtmp ${rtmp ? `:${config.RTMP_PORT}` : "non"} · rist ${rist ? `:${config.RIST_PORT_MIN}-${config.RIST_PORT_MAX}` : "non"}`);

const shutdown = async () => {
  timers.forEach(clearInterval);
  previews?.stopAll();
  recordings?.stopAll();
  regie?.stopAll();
  cam?.stopAll();
  studio?.stopAll();
  remote?.close();
  rtmp?.stopAll();
  rist?.stopAll();
  await sessions.closeAll();
  await coverage.flush();
  await prefixes.flush();
  await security.flush();
  await app.close();
  samples.close();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
