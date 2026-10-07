import { randomBytes } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import cors from "@fastify/cors";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { isServiceToken } from "./auth.ts";
import type { Config } from "./config.ts";
import type { HealthMonitor, Live } from "./health.ts";
import { createSysStats } from "./sysstats.ts";
import { ForbiddenError, PortsError, QuotaError, SWITCH_TRIGGERS, type Relay, type RelayStore, type SwitchTrigger } from "./relays.ts";
import type { Security } from "./security.ts";
import type { SlsEvent } from "./sls-log.ts";
import type { Rist } from "./rist.ts";
import type { Rtmp } from "./rtmp.ts";
import { RTMP_APP } from "./rtmp.ts";
import type { SampleStore } from "./samples.ts";
import type { SessionTracker } from "./sessions.ts";
import type { Asn } from "./asn.ts";
import type { Cam } from "./cam.ts";
import type { ObsPreview } from "./obspreview.ts";
import type { Studio } from "./studio.ts";
import { readLatest } from "./plugin.ts";
import type { Remote } from "./remote.ts";
import type { Backups } from "./backups.ts";
import { median } from "./aggregate.ts";
import type { Coverage } from "./coverage.ts";
import { classify, countsOnMap, DECLARED, declaredName, ipPrefix, isCaribbean, netToken, type Declared, type Prefixes } from "./link.ts";
import type { PrivateRelay } from "./privaterelay.ts";
import type { LiveFeed } from "./preview.ts";
import type { Recordings } from "./recordings.ts";

// API HTTP du Core (derrière Caddy en HTTPS).
// /v1/users/:id/*  → serveur Vercel, jeton de service.
// /v1/me/*         → navigateur, jeton de session Supabase (seulement ses propres relais).
// /ping            → public : mesure de latence depuis le navigateur (choix du serveur).

export type Deps = {
  /** SYXTEE Cam (null si désactivée). */
  cam?: Cam | null;
  /** Diffusion depuis SYXTEE STUDIO (null si désactivée). */
  studio?: Studio | null;
  obsPreview?: ObsPreview | null;
  /** SYXTEE Link : télécommande d'OBS (null si désactivée). */
  remote?: Remote | null;
  /** Enregistrement des flux (10 Go par compte ; null si désactivé). */
  recordings?: Recordings | null;
  /** Sauvegardes de scènes (5 Go par compte). */
  backups?: Backups | null;
  /** Pseudo et Twitch vérifié, pour l'app /cam (chat en superposition). */
  /** username : nom public (chaîne Twitch, sinon « Prénom N. ») ; le champ garde son nom pour les anciens clients. */
  profile?: (userId: string) => Promise<{ username: string | null; twitch_login: string | null }>;
  /** Entrée RTMP (null si désactivée). */
  rtmp?: Rtmp | null;
  /** Entrée RIST (null si désactivée ou ffmpeg sans librist). */
  rist?: Rist | null;
  /** Sécurité du relais (journal des refus, bannissements, alertes). */
  security?: Security | null;
  config: Config;
  relays: RelayStore;
  health: HealthMonitor;
  samples: SampleStore;
  sessions: SessionTracker;
  coverage?: Coverage;
  asn?: Asn;
  /** Préfixes IP appris depuis les Android (Wi-Fi / mobile). */
  prefixes?: Prefixes;
  /** IP de sortie du Relais privé iCloud (liste officielle d'Apple). */
  relay?: PrivateRelay;
  /** Reclasse les mesures d'un compte après sa déclaration d'opérateur. Renvoie le nombre passé en 4G/5G. */
  reclassUser?: (userId: string) => Promise<number>;
  verifyUser: (authorization: string | undefined) => Promise<string | null>;
  previewPath: (relayId: string) => string;
  /** Aperçu vidéo en direct (MPEG-TS) ; absent si les aperçus sont désactivés. */
  liveFeed?: (r: Relay) => LiveFeed;
  onKeysChanged: () => void;
  slsHealthy: () => Promise<boolean>;
};

/** Ce que voit le dashboard (jamais l'identifiant de publication de la régie, interne au Core). */
export function relayView(r: Relay, c: Config, live = false) {
  const host = c.RELAY_PUBLIC_HOST;
  // Mire native : dès que la régie est activée sur le serveur, tous les relais passent par elle (la colonne `mode` n'est plus un choix).
  const regie = c.REGIE_ENABLED;
  return {
    id: r.id,
    name: r.name,
    protocol: r.protocol,
    server: r.server,
    host,
    archived: r.archived,
    live: !r.archived && live,
    record: r.record === true,
    record_format: r.record_format === "mp4" ? ("mp4" as const) : ("mov" as const),
    switch_trigger: SWITCH_TRIGGERS.includes(r.switch_trigger as SwitchTrigger) ? (r.switch_trigger as SwitchTrigger) : ("cut" as const),
    record_available: c.RECORD_ENABLED,
    mode: regie ? ("regie" as const) : r.mode,
    regie_available: c.REGIE_ENABLED,
    urls:
      r.protocol === "rist"
        ? {
            rist_url: `rist://${host}:${r.rist_port}?secret=${r.rist_secret}&aes-type=256&profile=1`,
            rist_server: `rist://${host}:${r.rist_port}`,
            rist_host: host,
            rist_port: r.rist_port ?? 0,
            rist_secret: r.rist_secret ?? "",
          }
        : r.protocol === "rtmp"
        ? { rtmp_server: `rtmp://${host}:${c.RTMP_PORT}/${RTMP_APP}`, rtmp_key: r.publish_id, rtmp_url: `rtmp://${host}:${c.RTMP_PORT}/${RTMP_APP}/${r.publish_id}` }
        : { srtla_url: `srtla://${host}:${c.SRTLA_PORT}?streamid=${r.publish_id}`, srt_url: `srt://${host}:${c.SRT_PUBLISH_PORT}?streamid=${r.publish_id}` },
    obs_srt_url: `srt://${host}:${c.SRT_PLAY_PORT}?streamid=${regie ? r.out_play_id : r.play_id}`,
    created_at: r.created_at,
    rotated_at: r.rotated_at,
    last_live_at: r.last_live_at,
  };
}

const RANGES = { "15m": 15 * 60_000, "1h": 3_600_000, "6h": 6 * 3_600_000, "24h": 24 * 3_600_000 } as const;

export function buildServer(d: Deps) {
  const app = Fastify({ logger: { level: "info" }, trustProxy: true, bodyLimit: 16 * 1024, maxParamLength: 512 });
  const origins = d.config.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
  // Corps JSON vide accepté (POST sans données depuis le dashboard).
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (e) {
      done(e as Error, undefined);
    }
  });
  app.register(cors, { origin: origins, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], allowedHeaders: ["Authorization", "Content-Type"] });

  const service = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!isServiceToken(req.headers.authorization, d.config.CORE_API_TOKEN)) return reply.code(401).send({ error: "unauthorized" });
  };
  const userId = async (req: FastifyRequest, reply: FastifyReply) => {
    const id = await d.verifyUser(req.headers.authorization);
    if (!id) {
      reply.code(401).send({ error: "unauthorized" });
      return null;
    }
    return id;
  };
  const uuid = z.object({ id: z.uuid() });

  app.get("/health", async () => ({ ok: true, sls: await d.slsHealthy(), streams_live: d.health.liveRelays().length }));

  // Latence vue du navigateur (assistant « Créer un relais ») : réponse vide, jamais en cache, ouverte à tous.
  app.get("/ping", async (_req, reply) =>
    reply.code(204).header("Cache-Control", "no-store").header("Access-Control-Allow-Origin", "*").header("Timing-Allow-Origin", "*").send(),
  );

  // ───── Serveur Vercel ─────
  const view = (r: Relay) => relayView(r, d.config, d.health.state(r.id)?.live ?? false);
  const relayParams = z.object({ id: z.uuid(), rid: z.uuid() });
  /** Relais :rid du compte :id, ou 404 (un relais d'un autre compte n'existe pas pour lui). */
  const ownRelay = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id, rid } = relayParams.parse(req.params);
    const r = await d.relays.get(rid);
    if (!r || r.user_id !== id) {
      reply.code(404).send({ error: "no_relay" });
      return null;
    }
    return r;
  };
  const changed = <T>(v: T) => (d.onKeysChanged(), v);

  app.get("/v1/users/:id/relays", { preHandler: service }, async (req) => {
    const { id } = uuid.parse(req.params);
    return { relays: (await d.relays.list(id)).map(view) };
  });
  app.post("/v1/users/:id/relays", { preHandler: service }, async (req, reply) => {
    const { id } = uuid.parse(req.params);
    const body = z
      .object({ name: z.string().trim().min(1).max(40), protocol: z.enum(["srtla", "rtmp", "rist"]), server: z.string(), limit: z.number().int().min(0) })
      .parse(req.body);
    if (body.server !== d.config.RELAY_NAME) return reply.code(409).send({ error: "server_unavailable" });
    if (body.protocol === "rtmp" && !d.rtmp) return reply.code(409).send({ error: "rtmp_disabled" });
    if (body.protocol === "rist" && !d.rist) return reply.code(409).send({ error: "rist_disabled" });
    try {
      return changed(view(await d.relays.create(id, body)));
    } catch (e) {
      if (e instanceof QuotaError) return reply.code(403).send({ error: "quota" });
      if (e instanceof ForbiddenError) return reply.code(403).send({ error: "forbidden" });
      if (e instanceof PortsError) return reply.code(409).send({ error: "rist_ports_full" });
      throw e;
    }
  });
  app.get("/v1/users/:id/relays/:rid", { preHandler: service }, async (req, reply) => {
    const r = await ownRelay(req, reply);
    return r ? view(r) : undefined;
  });
  app.patch("/v1/users/:id/relays/:rid", { preHandler: service }, async (req, reply) => {
    let r = await ownRelay(req, reply);
    if (!r) return;
    const body = z
      .object({
        name: z.string().trim().min(1).max(40).optional(),
        archived: z.boolean().optional(),
        mode: z.enum(["direct", "regie"]).optional(),
        record: z.boolean().optional(),
        record_format: z.enum(["mov", "mp4"]).optional(),
        switch_trigger: z.enum(["cut", "cut_lowbitrate", "sensitive"]).optional(),
        /** Changer de serveur : même relais, mêmes clés. */
        server: z.string().regex(/^[a-z0-9]{2,12}$/).optional(),
        limit: z.number().int().min(0).default(0),
      })
      .parse(req.body);
    if (body.mode === "regie" && !d.config.REGIE_ENABLED) return reply.code(409).send({ error: "regie_disabled" });
    if (body.mode === "direct" && d.config.REGIE_ENABLED) return reply.code(409).send({ error: "regie_native" });
    try {
      if (body.name !== undefined) r = await d.relays.rename(r, body.name);
      if (body.mode !== undefined) r = await d.relays.setMode(r, body.mode);
      if (body.record !== undefined) {
        if (body.record && !d.recordings) return reply.code(409).send({ error: "record_disabled" });
        r = await d.relays.setRecord(r, body.record);
      }
      if (body.record_format !== undefined) r = await d.relays.setRecordFormat(r, body.record_format);
      if (body.switch_trigger !== undefined) r = await d.relays.setSwitchTrigger(r, body.switch_trigger);
      if (body.server !== undefined) r = await d.relays.move(r, body.server);
      if (body.archived !== undefined) r = await d.relays.setArchived(r, body.archived, body.limit);
    } catch (e) {
      if (e instanceof PortsError) return reply.code(409).send({ error: "rist_ports_full" });
      if (e instanceof QuotaError) return reply.code(403).send({ error: "quota" });
      if (e instanceof ForbiddenError) return reply.code(403).send({ error: "forbidden" });
      throw e;
    }
    return changed(view(r));
  });
  app.post("/v1/users/:id/relays/:rid/rotate", { preHandler: service }, async (req, reply) => {
    const r = await ownRelay(req, reply);
    return r ? changed(view(await d.relays.rotate(r))) : undefined;
  });
  app.delete("/v1/users/:id/relays/:rid", { preHandler: service }, async (req, reply) => {
    const r = await ownRelay(req, reply);
    if (!r) return;
    await d.relays.remove(r);
    d.onKeysChanged();
    return reply.code(204).send();
  });
  // Compte supprimé : tous ses relais sont retirés du SLS et effacés (plus aucune URL ne marche).
  app.delete("/v1/users/:id/relays", { preHandler: service }, async (req, reply) => {
    const { id } = uuid.parse(req.params);
    await d.relays.removeAll(id);
    await d.recordings?.removeUser(id).catch(() => {});
    await d.security?.forget(id).catch(() => {});
    d.onKeysChanged();
    return reply.code(204).send();
  });
  // Alertes de sécurité du compte : 2e appareil refusé sur un de ses relais (7 derniers jours).
  app.get("/v1/users/:id/alerts", { preHandler: service }, async (req) => {
    const { id } = uuid.parse(req.params);
    const rows = d.security ? await d.security.alerts(id) : [];
    return { alerts: rows.map((a) => ({ at: a.at, relay_id: a.relay_id, ip: a.ip, country: a.country, protocol: a.protocol })) };
  });

  // ───── Admin (serveur Vercel, après vérification du rôle) : page Sécurité ─────
  if (d.security) {
    const sec = d.security;
    app.get("/v1/admin/security", { preHandler: service }, async (req) => {
      const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(1000).default(200) }).parse(req.query);
      return { events: await sec.recent(limit), bans: sec.bans() };
    });
    app.post("/v1/admin/bans", { preHandler: service }, async (req, reply) => {
      const b = z.object({ ip: z.union([z.ipv4(), z.ipv6()]), minutes: z.number().int().min(1).max(525_600), reason: z.string().trim().min(1).max(200) }).parse(req.body);
      try {
        return await sec.ban(b.ip, b.minutes, b.reason, false);
      } catch (e) {
        return reply.code(409).send({ error: (e as Error).message });
      }
    });
    app.delete("/v1/admin/bans/:ip", { preHandler: service }, async (req, reply) => {
      const { ip } = z.object({ ip: z.union([z.ipv4(), z.ipv6()]) }).parse(req.params);
      await sec.unban(ip);
      return reply.code(204).send();
    });
  }

  // ───── Admin : vue d'ensemble (santé du VPS, flux en direct) ─────
  const sys = createSysStats();
  app.get("/v1/admin/stats", { preHandler: service }, async () => ({
    ...sys.snapshot(),
    streams_live: d.health.liveRelays().length,
    sls: await d.slsHealthy(),
  }));
  // Formule, suspension ou clés modifiées par l'admin : réaligne le relais tout de suite (coupe un flux devenu interdit).
  app.post("/v1/admin/refresh", { preHandler: service }, async (_req, reply) => {
    d.onKeysChanged();
    return reply.code(204).send();
  });
  app.get("/v1/admin/live", { preHandler: service }, async () => ({
    live: d.health.liveRelays().map((r) => {
      const st = d.health.state(r.id);
      return { relay_id: r.id, user_id: r.user_id, since: st?.since ?? null, bitrate: st?.sample?.bitrate ?? null, links: st?.sample?.links ?? null };
    }),
  }));

  // Carte de couverture : effacement des mesures d'un compte (bouton dans Paramètres, suppression du compte).
  // Opérateur déclaré modifié (dashboard) : les mesures récentes restées hors carte sont reclassées.
  app.post("/v1/users/:id/coverage/reclassify", { preHandler: service }, async (req) => {
    const { id } = uuid.parse(req.params);
    d.coverage?.forget(id);
    return { reclassified: d.reclassUser ? await d.reclassUser(id) : 0 };
  });
  app.delete("/v1/users/:id/coverage", { preHandler: service }, async (req) => {
    const { id } = uuid.parse(req.params);
    return { deleted: d.coverage ? await d.coverage.erase(id) : 0 };
  });
  // ───── Navigateur (dashboard) ─────
  /** Relais :rid actif appartenant au compte connecté (404 sinon, même s'il existe pour un autre compte). */
  const myRelay = async (req: FastifyRequest, reply: FastifyReply) => {
    const id = await userId(req, reply);
    if (!id) return null;
    const parsed = z.object({ rid: z.uuid() }).safeParse(req.params);
    const r = parsed.success ? d.health.relay(parsed.data.rid) : null;
    if (!r || r.user_id !== id) {
      reply.code(404).send({ error: "no_relay" });
      return null;
    }
    return r;
  };

  app.get("/v1/me/relays/:rid/health", async (req, reply) => {
    const r = await myRelay(req, reply);
    if (!r) return;
    const { range } = z.object({ range: z.enum(["15m", "1h", "6h", "24h"]).default("1h") }).parse(req.query);
    return { live: d.health.state(r.id), samples: d.samples.history(r.id, Date.now() - RANGES[range]) };
  });

  // Server-Sent Events : réponse écrite à la main, on remet les en-têtes CORS.
  const openStream = (req: FastifyRequest, reply: FastifyReply) => {
    reply.hijack();
    const origin = req.headers.origin;
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      ...(origin && origins.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    });
    return (event: string, data: unknown) => reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Statut léger (pastille de la barre du dashboard) : tous les relais du compte, débit toutes les 5 s au plus.
  // Les champs de premier niveau décrivent le relais principal (le premier en direct, sinon en reconnexion).
  // N'accélère pas les relevés (pas de watch) : ouvert sur toutes les pages du dashboard.
  app.get("/v1/me/status/stream", async (req, reply) => {
    const id = await userId(req, reply);
    if (!id) return;
    const send = openStream(req, reply);
    let lastSent = 0;
    const push = () => {
      const relays = d.health.byUser(id).map(({ relay, state: s }) => {
        const cur = d.sessions.current(relay.id);
        return {
          id: relay.id,
          name: relay.name,
          live: s.live,
          reconnecting: !s.live && !!cur?.reconnecting,
          started_at: cur?.started_at ?? (s.live ? s.since : null),
          kbps: s.live && s.sample ? Math.round(s.sample.bitrate) : null,
          reconnects: cur?.reconnects ?? 0,
        };
      });
      const main = relays.find((r) => r.live) ?? relays.find((r) => r.reconnecting);
      lastSent = Date.now();
      send("status", {
        live: !!main?.live,
        reconnecting: !!main?.reconnecting,
        started_at: main?.started_at ?? null,
        kbps: main?.kbps ?? null,
        reconnects: main?.reconnects ?? 0,
        relay_id: main?.id ?? null,
        relays,
      });
    };
    push();
    const mine = (rid: string) => d.health.relay(rid)?.user_id === id;
    const onStatus = (rid: string) => mine(rid) && push();
    const onSample = (rid: string) => mine(rid) && Date.now() - lastSent >= 5000 && push();
    d.health.events.on("status", onStatus);
    d.health.events.on("sample", onSample);
    const ping = setInterval(() => reply.raw.write(": ping\n\n"), 15_000);
    req.raw.on("close", () => {
      clearInterval(ping);
      d.health.events.off("status", onStatus);
      d.health.events.off("sample", onSample);
    });
  });

  // Mode connexion basse : un seul petit JSON (quelques centaines d'octets) avec l'état de tous les relais actifs du compte,
  // lu à la demande par la page « Connexion basse » (aucune connexion ouverte, aucun historique).
  app.get("/v1/me/status/lite", async (req, reply) => {
    const id = await userId(req, reply);
    if (!id) return;
    const since = Date.now() - 60_000;
    const relays = d.health
      .byUser(id)
      .filter(({ relay }) => !relay.archived)
      .map(({ relay, state: s }) => {
        const sm = s.live ? s.sample : null;
        const peers = s.live ? (s.peers ?? []) : [];
        const net = peers.reduce((a, p) => a + (p.throughput ?? 0), 0);
        return {
          id: relay.id,
          name: relay.name,
          live: s.live,
          kbps: sm ? Math.round(sm.bitrate) : null,
          net_kbps: net > 0 ? Math.round(net) : null,
          rtt: sm ? Math.round(sm.rtt) : null,
          latency: sm?.latency ?? null,
          buffer: sm?.buffer ?? null,
          links: sm?.links ?? null,
          lost_1m: sm ? d.samples.history(relay.id, since).reduce((a, x) => a + x.dropped, 0) : null,
          since: s.live ? s.since : null,
        };
      });
    return reply.header("Cache-Control", "no-store").send({ t: Date.now(), relays });
  });

  // Santé d'un relais en temps réel (Server-Sent Events).
  app.get("/v1/me/relays/:rid/health/stream", async (req, reply) => {
    const r = await myRelay(req, reply);
    if (!r) return;
    const send = openStream(req, reply);
    send("state", d.health.state(r.id) ?? { live: false, since: Date.now(), sample: null });
    const onSample = (rid: string, s: Live) => rid === r.id && send("state", s);
    d.health.events.on("sample", onSample);
    const unwatch = d.health.watch(r.id);
    const ping = setInterval(() => reply.raw.write(": ping\n\n"), 15_000);
    req.raw.on("close", () => {
      clearInterval(ping);
      d.health.events.off("sample", onSample);
      unwatch();
    });
  });

  app.get("/v1/me/relays/:rid/preview.jpg", async (req, reply) => {
    const r = await myRelay(req, reply);
    if (!r) return;
    const file = d.previewPath(r.id);
    const fresh = file !== "" && existsSync(file) && Date.now() - statSync(file).mtimeMs < 15_000;
    if (!fresh) return reply.code(404).send({ error: "no_preview" });
    return reply.header("Content-Type", "image/jpeg").header("Cache-Control", "no-store").send(readFileSync(file));
  });

  // Aperçu vidéo en direct : MPEG-TS en continu (mpegts.js côté navigateur). 3 spectateurs au plus par relais.
  const viewers = new Map<string, number>();
  app.get("/v1/me/relays/:rid/live.ts", async (req, reply) => {
    const r = await myRelay(req, reply);
    if (!r) return;
    if (!d.liveFeed) return reply.code(404).send({ error: "preview_disabled" });
    if (!d.health.state(r.id)?.live) return reply.code(404).send({ error: "offline" });
    const n = viewers.get(r.id) ?? 0;
    if (n >= 3) return reply.code(429).send({ error: "too_many_viewers" });
    viewers.set(r.id, n + 1);
    const feed = d.liveFeed(r);
    reply.hijack();
    const origin = req.headers.origin;
    reply.raw.writeHead(200, {
      "Content-Type": "video/mp2t",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      ...(origin && origins.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    });
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      feed.stop();
      const left = (viewers.get(r.id) ?? 1) - 1;
      if (left > 0) viewers.set(r.id, left);
      else viewers.delete(r.id);
      reply.raw.end();
    };
    feed.stream.on("error", close).on("end", close).pipe(reply.raw);
    req.raw.on("close", close);
  });

  // ───── Enregistrements des flux (fichiers MOV ou MP4 sur le serveur, quota par compte) ─────
  const rec = d.recordings;
  if (rec) {
    app.get("/v1/me/recordings", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      return { ...(await rec.usage(id)), files: await rec.files(id) };
    });
    app.post("/v1/me/recordings/link", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      const b = z.object({ relay: z.uuid(), file: z.string().max(40) }).safeParse(req.body);
      if (!b.success || !(await rec.open(id, b.data.relay, b.data.file))) return reply.code(404).send({ error: "not_found" });
      return { path: `/v1/rec/${rec.sign(id, b.data.relay, b.data.file)}` };
    });
    app.delete("/v1/me/recordings/:rid/:file", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      const p = z.object({ rid: z.uuid(), file: z.string().max(40) }).safeParse(req.params);
      if (!p.success || !(await rec.remove(id, p.data.rid, p.data.file))) return reply.code(404).send({ error: "not_found" });
      return reply.code(204).send();
    });
    // Téléchargement par lien signé (5 min), avec reprise (Range) : un direct de plusieurs Go.
    app.get("/v1/rec/:token", async (req, reply) => {
      const t = rec.verify(z.object({ token: z.string().max(600) }).parse(req.params).token);
      if (!t) return reply.code(404).send({ error: "not_found" });
      const head = await rec.open(t.user, t.relay, t.file);
      if (!head) return reply.code(404).send({ error: "not_found" });
      head.stream.destroy();
      const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ""));
      let start = 0;
      let end = head.size - 1;
      if (m && (m[1] || m[2])) {
        if (m[1]) {
          start = Number(m[1]);
          if (m[2]) end = Math.min(end, Number(m[2]));
        } else {
          start = Math.max(0, head.size - Number(m[2]));
        }
        if (start > end) return reply.code(416).header("Content-Range", `bytes */${head.size}`).send();
      }
      const body = await rec.open(t.user, t.relay, t.file, { start, end });
      if (!body) return reply.code(404).send({ error: "not_found" });
      return reply
        .code(m ? 206 : 200)
        .header("Content-Type", t.file.endsWith(".mov") ? "video/quicktime" : "video/mp4")
        .header("Content-Disposition", `attachment; filename="syxtee-${t.file}"`)
        .header("Accept-Ranges", "bytes")
        .header("Content-Length", String(end - start + 1))
        .header("Cache-Control", "no-store")
        .headers(m ? { "Content-Range": `bytes ${start}-${end}/${head.size}` } : {})
        .send(body.stream);
    });
  }

  // ───── SYXTEE Cam ─────
  const cam = d.cam;
  if (cam) {
    // Pas de relais actif : 404 (la Cam publie toujours vers un relais du compte).
    const camView = (k: Relay | null, reply: FastifyReply) =>
      k ? { cam_key: k.cam_key, cam_path: `/cam?k=${k.cam_key}`, whip_url: cam.whipUrl(k.cam_key!), relay: { id: k.id, name: k.name } } : reply.code(404).send({ error: "no_relay" });
    app.get("/v1/users/:id/cam", { preHandler: service }, async (req, reply) => camView(await cam.ensure(uuid.parse(req.params).id), reply));
    app.post("/v1/users/:id/cam/rotate", { preHandler: service }, async (req, reply) => {
      const k = await cam.rotate(uuid.parse(req.params).id);
      d.onKeysChanged();
      return camView(k, reply);
    });

    // App /cam : authentifiée par la clé caméra (Authorization: Bearer cam_…).
    const camRow = async (req: FastifyRequest, reply: FastifyReply) => {
      const h = req.headers.authorization ?? "";
      const row = h.startsWith("Bearer ") ? await cam.lookup(h.slice(7).trim()) : null;
      if (!row) reply.code(401).send({ error: "unauthorized" });
      return row;
    };
    app.get("/v1/cam/me", async (req, reply) => {
      const row = await camRow(req, reply);
      if (!row) return;
      const p = (await d.profile?.(row.user_id)) ?? { username: null, twitch_login: null };
      return {
        username: p.username,
        twitch_login: p.twitch_login,
        whip_url: cam.whipUrl(row.cam_key!),
        relay: d.config.RELAY_NAME,
        live: d.health.state(row.id)?.live ?? false,
      };
    });
    const gps = z.object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
      acc: z.number().min(0).max(100_000).nullish(),
      speed: z.number().min(0).max(1000).nullish(),
      t: z.number().int().optional(),
      ct: z.string().max(20).nullish(), // navigator.connection.type (Android)
    });
    app.post("/v1/cam/gps", async (req, reply) => {
      const row = await camRow(req, reply);
      if (!row) return;
      const g = gps.parse(req.body);
      const now = Date.now();
      // Horodatage du téléphone accepté s'il est plausible (±2 min), sinon heure du serveur.
      const t = g.t && Math.abs(g.t - now) < 120_000 ? g.t : now;
      d.samples.addPosition(row.user_id, { t, lat: g.lat, lon: g.lon, acc: g.acc ?? null, speed: g.speed ?? null });
      // Réseau du téléphone pendant le direct : classe les points de couverture du live (le Wi-Fi n'entre jamais dans la carte 4G/5G).
      if (d.coverage) {
        const info = d.asn?.lookup(req.ip) ?? { operator: null, asn: null, asName: null };
        const prefix = ipPrefix(req.ip);
        d.prefixes?.learn(prefix, g.ct);
        const declared = await d.coverage.declared(row.user_id).catch(() => null);
        const link = classify({ device: g.ct, asn: info.asn, asName: info.asName, operator: info.operator, prefix: d.prefixes?.get(prefix), relay: d.relay?.has(req.ip), declared });
        d.coverage.setLink(row.user_id, { operator: info.operator, asn: info.asn, link });
      }
      return reply.code(204).send();
    });
    app.get("/v1/me/positions", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      const { range } = z.object({ range: z.enum(["15m", "1h", "6h", "24h"]).default("1h") }).parse(req.query);
      return { positions: d.samples.positions(id, Date.now() - RANGES[range]) };
    });

  }


  // ───── Couverture : mode Scan de SYXTEE Cam et Analyseur réseau ─────
  // Un point = 3 micro-tests (5 pings, envoi pendant 2 s, réception pendant 2 s), puis la médiane. Le débit montant
  // est mesuré ICI (octets reçus / durée), le descendant par le téléphone. Le type de lien (Wi-Fi ou 4G/5G) est déduit
  // de navigator.connection.type, de l'ASN de l'IP et des préfixes appris. Rien n'est gardé sans consentement.
  // Qui scanne : SYXTEE Cam (Bearer cam_…), le dashboard (jeton de session Supabase) ou un visiteur anonyme de
  // /analyseur. L'anonyme voit ses résultats mais rien n'est gardé, et son volume est plafonné par IP.
  const cov = d.coverage;
  if (cov) {
    const scanner = async (req: FastifyRequest, reply: FastifyReply): Promise<{ user: string | null } | null> => {
      const h = req.headers.authorization ?? "";
      if (!h) return { user: null };
      const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
      const user = token.startsWith("cam_") ? ((await d.cam?.lookup(token))?.user_id ?? null) : await d.verifyUser(h);
      if (!user) {
        reply.code(401).send({ error: "unauthorized" });
        return null;
      }
      return { user };
    };
    const ANON_BYTES_PER_HOUR = 60_000_000; // ≈ 6 points complets par heure et par IP
    const anonUse = new Map<string, { since: number; bytes: number }>();
    /** Octets encore permis à cette IP anonyme sur l'heure en cours (et en compte `add`). */
    const anonBudget = (ip: string, add = 0) => {
      const now = Date.now();
      let u = anonUse.get(ip);
      if (!u || now - u.since > 3_600_000) {
        if (anonUse.size > 50_000) anonUse.clear();
        u = { since: now, bytes: 0 };
        anonUse.set(ip, u);
      }
      u.bytes += add;
      return ANON_BYTES_PER_HOUR - u.bytes;
    };
    const who = (s: { user: string | null }, req: FastifyRequest) => s.user ?? `anon:${req.ip}`;
    // iPhone : `from` = réseau à l'ouverture de la page, `cell` = réseau vu juste après « Coupe le Wi-Fi ».
    // Le changement ne compte que tant que le téléphone reste sur ce réseau-là (un nouveau Wi-Fi plus tard ne passe pas).
    // Opérateur déclaré : celui du compte, ou celui envoyé par l'analyseur anonyme (rien n'est gardé pour lui).
    const net = (
      req: FastifyRequest,
      o: { device?: string | null; from?: string | null; cell?: string | null; declared?: Declared | null; lat?: number | null; lng?: number | null },
    ) => {
      const ip = req.ip;
      const prefix = ipPrefix(ip);
      const raw = d.asn?.lookup(ip) ?? { operator: null, asn: null, asName: null, failed: true };
      const relay = d.relay?.has(ip) ?? false;
      // Sans base IPinfo, une IP publique part en file d'attente (reclassée plus tard), jamais en « inconnu » définitif.
      const pending = !!prefix && !!raw.failed && !relay;
      const token = netToken(d.config.CORE_API_TOKEN, prefix);
      const switched = !!o.from && !!token && token !== o.from && (o.cell === undefined || token === o.cell);
      const declared = o.declared ?? null;
      const link = classify({ device: o.device, asn: raw.asn, asName: raw.asName, operator: raw.operator, prefix: d.prefixes?.get(prefix), switched, relay, pending, declared });
      const caribbean = isCaribbean(o.lat, o.lng) || /Caraïbe/.test(raw.operator ?? "");
      // Opérateur masqué (Relais privé) ou inconnu : le nom de la marque déclarée.
      const usesDeclared = !!link.tags?.includes("declared") && (relay || !raw.operator);
      const operator = relay ? (usesDeclared ? declaredName(declared, caribbean) : null) : usesDeclared ? declaredName(declared, caribbean) : raw.operator;
      return {
        operator,
        asn: relay ? null : raw.asn,
        asName: raw.asName,
        prefix,
        token,
        link,
        relay,
        pending: pending ? { ip: ip.replace(/^::ffff:/i, ""), ctx: { declared, ct: o.device ?? null, switched, caribbean } } : undefined,
      };
    };
    const declaredOf = async (sc: { user: string | null }, given?: string | null) =>
      sc.user ? await cov.declared(sc.user).catch(() => null) : DECLARED.includes(given as Declared) ? (given as Declared) : null;
    const upTests = new Map<string, { at: number; bytes: number; ms: number }[]>(); // `${user}:${test}:${i}`
    const sweep = () => {
      const old = Date.now() - 120_000;
      for (const [k, v] of upTests) if (!v.length || v[v.length - 1].at < old) upTests.delete(k);
    };
    const randomChunk = randomBytes(64 * 1024); // aléatoire : aucune compression en route

    app.get("/v1/cam/ping", async (_req, reply) => reply.code(204).header("Cache-Control", "no-store").send());
    app.get("/v1/cam/coverage", async (req, reply) => {
      const sc = await scanner(req, reply);
      if (!sc) return;
      const q = z
        .object({
          ct: z.string().max(20).optional(),
          from: z.string().max(40).optional(),
          op: z.string().max(10).optional(),
          lat: z.coerce.number().min(-90).max(90).optional(),
          lng: z.coerce.number().min(-180).max(180).optional(),
        })
        .parse(req.query);
      const declared = await declaredOf(sc, q.op);
      const n = net(req, { device: q.ct, from: q.from, declared, lat: q.lat, lng: q.lng });
      return {
        consent: sc.user ? await cov.consent(sc.user) : null,
        operator: n.operator,
        link_type: n.link.link_type,
        link_conf: n.link.conf,
        tags: n.link.tags ?? [],
        private_relay: n.relay,
        declared,
        net: n.token,
      };
    });
    app.addContentTypeParser("application/octet-stream", { parseAs: "buffer", bodyLimit: 8 * 1024 * 1024 }, (_req, body, done) => done(null, body));
    // Un morceau de la fenêtre d'envoi de 2 s (le téléphone enchaîne les morceaux).
    app.post(
      "/v1/cam/scan/up",
      {
        bodyLimit: 8 * 1024 * 1024,
        onRequest: async (req) => {
          (req as FastifyRequest & { t0?: number }).t0 = performance.now();
        },
      },
      async (req, reply) => {
        const ms = performance.now() - ((req as FastifyRequest & { t0?: number }).t0 ?? performance.now());
        const bytes = Buffer.isBuffer(req.body) ? req.body.length : 0;
        const sc = await scanner(req, reply);
        if (!sc) return;
        const q = z.object({ test: z.string().regex(/^[\w-]{6,40}$/), i: z.coerce.number().int().min(0).max(2) }).parse(req.query);
        if (bytes < 16 * 1024) return reply.code(400).send({ error: "payload_too_small" });
        if (!sc.user && anonBudget(req.ip, bytes) < 0) return reply.code(429).send({ error: "anonymous_limit" });
        sweep();
        const k = `${who(sc, req)}:${q.test}:${q.i}`;
        upTests.set(k, [...(upTests.get(k) ?? []), { at: Date.now(), bytes, ms }]);
        return { kbps: ms > 0 ? Math.round((bytes * 8) / ms) : null };
      },
    );
    // Réception : données aléatoires pendant `ms` millisecondes, plafonnées en octets (data du téléphone).
    app.get("/v1/cam/scan/down", async (req, reply) => {
      const sc = await scanner(req, reply);
      if (!sc) return;
      const q = z
        .object({ ms: z.coerce.number().int().min(500).max(3000).default(2000), max: z.coerce.number().int().min(65_536).max(8_000_000).default(6_000_000) })
        .parse(req.query);
      if (!sc.user) {
        const left = anonBudget(req.ip);
        if (left < 65_536) return reply.code(429).send({ error: "anonymous_limit" });
        q.max = Math.min(q.max, left);
        anonBudget(req.ip, q.max); // compté d'avance : le flux s'arrête au plus tard à q.max
      }
      const until = performance.now() + q.ms;
      let sent = 0;
      const stream = new Readable({
        read() {
          if (performance.now() >= until || sent >= q.max) return void this.push(null);
          sent += randomChunk.length;
          this.push(randomChunk);
        },
      });
      return reply.header("Content-Type", "application/octet-stream").header("Cache-Control", "no-store, no-transform").send(stream);
    });
    const scanBody = z.object({
      test: z.string().regex(/^[\w-]{6,40}$/),
      // Position : obligatoire pour garder un point ; l'analyseur anonyme peut tester sans GPS.
      lat: z.number().min(-90).max(90).nullish(),
      lng: z.number().min(-180).max(180).nullish(),
      acc: z.number().min(0).max(100_000).nullish(),
      speed: z.number().min(0).max(1000).nullish(), // m/s (GPS)
      t: z.number().int().optional(),
      ct: z.string().max(20).nullish(), // navigator.connection.type (Android)
      from: z.string().max(40).nullish(), // jeton réseau lu à l'ouverture de la page (iPhone)
      cell: z.string().max(40).nullish(), // jeton réseau lu après « Coupe le Wi-Fi » (iPhone)
      down_kbps: z.array(z.number().min(0).max(10_000_000)).max(3).default([]),
      rtt_ms: z.array(z.number().min(0).max(60_000)).max(3).default([]),
      op: z.string().max(10).nullish(), // opérateur déclaré (analyseur anonyme ; un compte utilise son profil)
    });
    // Fin d'un point : médiane des 3 micro-tests, classement du lien, filtres (dans coverage).
    app.post("/v1/cam/scan", async (req, reply) => {
      const sc = await scanner(req, reply);
      if (!sc) return;
      const b = scanBody.parse(req.body);
      if (sc.user && (b.lat == null || b.lng == null)) return reply.code(400).send({ error: "no_position" });
      const ups = [0, 1, 2].flatMap((i) => {
        const k = `${who(sc, req)}:${b.test}:${i}`;
        const parts = upTests.get(k) ?? [];
        upTests.delete(k);
        const bytes = parts.reduce((a, p) => a + p.bytes, 0);
        const ms = parts.reduce((a, p) => a + p.ms, 0);
        return ms > 0 && bytes > 0 ? [(bytes * 8) / ms] : [];
      });
      if (!ups.length) return reply.code(400).send({ error: "no_upload" });
      const med = (xs: number[]) => (xs.length ? Math.round(median(xs)) : null);
      const declared = await declaredOf(sc, b.op);
      const n = net(req, { device: b.ct, from: b.from, cell: b.cell ?? null, declared, lat: b.lat, lng: b.lng });
      // Les préfixes ne s'apprennent que des comptes (un anonyme pourrait déclarer n'importe quel type de réseau).
      if (sc.user) d.prefixes?.learn(n.prefix, b.ct);
      const now = Date.now();
      const point = {
        t: b.t && Math.abs(b.t - now) < 120_000 ? b.t : now,
        lat: b.lat ?? 0,
        lng: b.lng ?? 0,
        acc: b.acc ?? null,
        speed_kmh: b.speed == null ? null : b.speed * 3.6,
        up_kbps: med(ups),
        down_kbps: med(b.down_kbps),
        rtt_ms: med(b.rtt_ms),
        loss_pct: null,
        operator: n.operator,
        asn: n.asn,
        link: n.link,
        pending: n.pending,
      };
      const reason = sc.user ? await cov.add(sc.user, "scan", point) : "anonymous";
      const counted = reason === null && countsOnMap(n.link);
      const t = n.link.link_type;
      return {
        accepted: reason === null,
        counted,
        reason:
          reason ??
          (counted
            ? null
            : t === "wifi" || t === "fixed"
              ? "wifi"
              : t === "starlink"
                ? "starlink"
                : n.pending
                  ? "pending"
                  : n.relay
                    ? "private_relay"
                    : "unknown_link"),
        operator: n.operator,
        link_type: t,
        link_conf: n.link.conf,
        tags: n.link.tags ?? [],
        private_relay: n.relay,
        up_kbps: point.up_kbps,
        down_kbps: point.down_kbps,
        rtt_ms: point.rtt_ms,
      };
    });
  }

  // Dernière version du plugin (manifeste + tailles des installeurs) : lue par la page « Plugin OBS » et la carte « Mes OBS ».
  app.get("/v1/plugin/latest", async (_req, reply) => {
    const latest = readLatest(d.config.DATA_DIR);
    if (!latest) return reply.code(404).send({ error: "no_release" });
    return reply.header("cache-control", "public, max-age=60").send(latest);
  });

  // ───── Téléchargements publics (installeurs de SYXTEE Link), posés à la main dans DATA_DIR/downloads ─────
  app.get("/dl/:file", async (req, reply) => {
    const f = z.object({ file: z.string().regex(/^SYXTEE-Link-(mac|windows)\.(pkg|exe)$/) }).safeParse(req.params);
    if (!f.success) return reply.code(404).send({ error: "not_found" });
    const path = join(d.config.DATA_DIR, "downloads", f.data.file);
    if (!existsSync(path)) return reply.code(404).send({ error: "not_found" });
    return reply
      .header("content-type", "application/octet-stream")
      .header("content-disposition", `attachment; filename="${f.data.file}"`)
      .header("content-length", String(statSync(path).size))
      .header("cache-control", "public, max-age=300")
      .send(createReadStream(path));
  });

  // ───── SYXTEE Link : télécommande d'OBS (les WebSocket sont gérées par remote.upgrade, voir index.ts) ─────
  if (d.remote) {
    const remote = d.remote;
    app.post("/v1/me/link/pair", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      if (!remote.canUse(id)) return reply.code(403).send({ error: "not_allowed" });
      return remote.newCode(id);
    });
    app.get("/v1/me/link/devices", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      return { devices: await remote.devices(id), ...remote.status(id) };
    });
    app.patch("/v1/me/link/devices/:did", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      const did = z.object({ did: z.uuid() }).safeParse(req.params);
      const b = z.object({ name: z.string().trim().min(1).max(40) }).safeParse(req.body ?? {});
      if (!did.success || !b.success) return reply.code(400).send({ error: "invalid" });
      return (await remote.rename(id, did.data.did, b.data.name)) ? { ok: true } : reply.code(404).send({ error: "no_device" });
    });
    // ── API de l'appareil (jeton d'accès de l'agent) : renommer ce poste, compte connecté, flux du compte ──
    app.patch("/v1/link/device", async (req, reply) => {
      const dev = await remote.deviceAuth(req.headers.authorization);
      if (!dev) return reply.code(401).send({ error: "unauthorized" });
      const b = z.object({ name: z.string().trim().min(1).max(40) }).safeParse(req.body ?? {});
      if (!b.success) return reply.code(400).send({ error: "invalid" });
      return (await remote.rename(dev.userId, dev.deviceId, b.data.name)) ? { ok: true, name: b.data.name } : reply.code(404).send({ error: "no_device" });
    });
    // Déclenchement de la bascule d'un flux du compte (panneau Appareil du contrôle à distance, via l'agent).
    app.patch("/v1/link/streams/:rid", async (req, reply) => {
      const dev = await remote.deviceAuth(req.headers.authorization);
      if (!dev) return reply.code(401).send({ error: "unauthorized" });
      const p = z.object({ rid: z.uuid() }).safeParse(req.params);
      const b = z.object({ switch_trigger: z.enum(["cut", "cut_lowbitrate", "sensitive"]) }).safeParse(req.body ?? {});
      if (!p.success || !b.success) return reply.code(400).send({ error: "invalid" });
      const r = await d.relays.get(p.data.rid);
      if (!r || r.user_id !== dev.userId) return reply.code(404).send({ error: "no_relay" });
      return { ok: true, switch_trigger: (await d.relays.setSwitchTrigger(r, b.data.switch_trigger)).switch_trigger };
    });
    // Débit en direct d'un flux du compte : sert aux déclenchements « débit très bas » et « sensible ».
    app.get("/v1/link/streams/:rid/status", async (req, reply) => {
      const dev = await remote.deviceAuth(req.headers.authorization);
      if (!dev) return reply.code(401).send({ error: "unauthorized" });
      const p = z.object({ rid: z.uuid() }).safeParse(req.params);
      if (!p.success) return reply.code(400).send({ error: "invalid" });
      const r = await d.relays.get(p.data.rid);
      if (!r || r.user_id !== dev.userId) return reply.code(404).send({ error: "no_relay" });
      const st = d.health.state(r.id);
      return { live: st?.live ?? false, kbps: st?.live ? Math.round(st.sample?.bitrate ?? 0) : 0 };
    });
    app.get("/v1/link/me", async (req, reply) => {
      const dev = await remote.deviceAuth(req.headers.authorization);
      if (!dev) return reply.code(401).send({ error: "unauthorized" });
      const acc = await remote.account(dev.userId);
      if (!acc) return reply.code(404).send({ error: "no_account" });
      const device = (await remote.devices(dev.userId)).find((x) => x.id === dev.deviceId);
      return { ...acc, device_name: device?.name ?? "" };
    });
    // Flux (relais) du compte. `obs_srt_url` (lecture dans OBS) ne sert qu'à l'agent : il ne la montre jamais dans son interface.
    app.get("/v1/link/streams", async (req, reply) => {
      const dev = await remote.deviceAuth(req.headers.authorization);
      if (!dev) return reply.code(401).send({ error: "unauthorized" });
      const rows = (await d.relays.list(dev.userId)).filter((r) => !r.archived).map(view);
      return { streams: rows.map((r) => ({ id: r.id, name: r.name, protocol: r.protocol, live: r.live, switch_trigger: r.switch_trigger, obs_srt_url: r.obs_srt_url })) };
    });
    // ── Aperçu vidéo du programme (WHIP du plugin → MediaMTX → WHEP du navigateur, sans transcodage) ──
    if (d.obsPreview) {
      const preview = d.obsPreview;
      app.post("/v1/link/preview/start", async (req, reply) => {
        const dev = await remote.deviceAuth(req.headers.authorization);
        if (!dev) return reply.code(401).send({ error: "unauthorized" });
        return preview.start(dev.userId, dev.deviceId);
      });
      app.post("/v1/link/preview/touch", async (req, reply) => {
        const dev = await remote.deviceAuth(req.headers.authorization);
        if (!dev) return reply.code(401).send({ error: "unauthorized" });
        preview.touch(dev.userId);
        return { ok: true };
      });
      app.post("/v1/link/preview/stop", async (req, reply) => {
        const dev = await remote.deviceAuth(req.headers.authorization);
        if (!dev) return reply.code(401).send({ error: "unauthorized" });
        preview.stop(dev.userId);
        return { ok: true };
      });
      app.post("/v1/me/link/preview/watch", async (req, reply) => {
        const id = await userId(req, reply);
        if (!id) return;
        if (!remote.canUse(id)) return reply.code(403).send({ error: "not_allowed" });
        return preview.watch(id);
      });
    }
    app.get("/v1/me/link/audit", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      const q = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }).safeParse(req.query);
      if (!q.success) return reply.code(400).send({ error: "invalid" });
      return { entries: await remote.auditLog(id, q.data.limit) };
    });
    app.delete("/v1/me/link/devices/:did", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      const did = z.object({ did: z.uuid() }).safeParse(req.params);
      if (!did.success) return reply.code(400).send({ error: "invalid" });
      return (await remote.revoke(id, did.data.did)) ? { ok: true } : reply.code(404).send({ error: "no_device" });
    });
    if (d.backups) {
      const backups = d.backups;
      app.get("/v1/me/link/backups", async (req, reply) => {
        const id = await userId(req, reply);
        if (!id) return;
        const rows = await backups.list(id);
        const u = await backups.usage(id);
        return { backups: rows.map(({ user_id: _u, ...r }) => r), used: u.used, quota: backups.quota };
      });
      app.delete("/v1/me/link/backups/:id", async (req, reply) => {
        const id = await userId(req, reply);
        if (!id) return;
        const p = uuid.safeParse(req.params);
        if (!p.success) return reply.code(400).send({ error: "invalid" });
        return (await backups.remove(id, p.data.id)) ? { ok: true } : reply.code(404).send({ error: "not_found" });
      });
      // Archive envoyée par l'agent (flux brut, taille annoncée) : jamais lue en mémoire.
      app.addContentTypeParser("application/gzip", (_req, payload, done) => done(null, payload));
      app.post("/v1/link/backups", { bodyLimit: backups.quota + 1024 * 1024 }, async (req, reply) => {
        const id = await remote.deviceUser(req.headers.authorization);
        if (!id) return reply.code(401).send({ error: "unauthorized" });
        const q = z.object({ name: z.string().max(60).optional(), collection: z.string().max(80).optional(), media: z.coerce.number().optional(), obs: z.string().max(20).optional(), host: z.string().max(60).optional() }).safeParse(req.query);
        if (!q.success) return reply.code(400).send({ error: "invalid" });
        const length = Number(req.headers["content-length"]);
        const r = await backups.put(id, { name: q.data.name ?? "", collection: q.data.collection ?? "", media: q.data.media ?? 0, obs: q.data.obs ?? "", host: q.data.host ?? "" }, req.body as import("node:stream").Readable, length);
        if ("error" in r) return reply.code(r.error === "quota" ? 413 : r.error === "length_required" ? 411 : r.error === "server" ? 500 : 400).send({ error: r.error });
        return r;
      });
      app.get("/v1/link/backups", async (req, reply) => {
        const id = await remote.deviceUser(req.headers.authorization);
        if (!id) return reply.code(401).send({ error: "unauthorized" });
        const rows = await backups.list(id);
        const u = await backups.usage(id);
        return { backups: rows.map(({ user_id: _u, ...r }) => r), used: u.used, quota: backups.quota };
      });
      // ── Format léger : fichiers partagés (SHA-256), versions = manifestes ──
      const beginBody = z.object({
        collection: z.string().max(80),
        collection_sha256: z.string().length(64),
        collection_size: z.number().int().min(0),
        files: z.array(z.object({ sha256: z.string().length(64), size: z.number().int().min(0) })).max(20_000),
      });
      app.post("/v1/link/backups/begin", { bodyLimit: 8 * 1024 * 1024 }, async (req, reply) => {
        const id = await remote.deviceUser(req.headers.authorization);
        if (!id) return reply.code(401).send({ error: "unauthorized" });
        const b = beginBody.safeParse(req.body);
        if (!b.success) return reply.code(400).send({ error: "invalid" });
        const r = await backups.begin(id, b.data);
        return "error" in r ? reply.code(r.error === "quota" ? 413 : 400).send(r) : r;
      });
      // Un fichier (flux brut) : taille d'origine et encodage (raw ou gzip) dans les en-têtes ; vérifié par son SHA-256.
      // Encapsulé : son lecteur de flux brut ne doit pas entrer en conflit avec celui de /v1/cam/scan/up (octet-stream en mémoire).
      app.register((blobs, _opts, next) => {
        blobs.addContentTypeParser("application/octet-stream", (_req, payload, done) => done(null, payload));
        blobs.put("/v1/link/blobs/:sha", { bodyLimit: backups.quota + 1024 * 1024 }, async (req, reply) => {
          const id = await remote.deviceUser(req.headers.authorization);
          if (!id) return reply.code(401).send({ error: "unauthorized" });
          const p = z.object({ sha: z.string().length(64) }).safeParse(req.params);
          const enc = String(req.headers["x-syxtee-encoding"] ?? "raw");
          const size = Number(req.headers["x-syxtee-size"]);
          if (!p.success || (enc !== "raw" && enc !== "gzip") || !Number.isInteger(size)) return reply.code(400).send({ error: "invalid" });
          const r = await backups.putBlob(id, p.data.sha, { size, encoding: enc }, req.body as import("node:stream").Readable, Number(req.headers["content-length"]));
          if ("error" in r) return reply.code(r.error === "quota" ? 413 : r.error === "length_required" ? 411 : r.error === "server" ? 500 : 400).send({ error: r.error });
          return r;
        });
        next();
      });
      app.post("/v1/link/backups/commit", { bodyLimit: 8 * 1024 * 1024 }, async (req, reply) => {
        const id = await remote.deviceUser(req.headers.authorization);
        if (!id) return reply.code(401).send({ error: "unauthorized" });
        const b = beginBody
          .extend({ name: z.string().max(60), obs: z.string().max(20), host: z.string().max(60), files: z.array(z.object({ sha256: z.string().length(64), size: z.number().int().min(0), name: z.string().min(1).max(120) })).max(20_000) })
          .safeParse(req.body);
        if (!b.success) return reply.code(400).send({ error: "invalid" });
        const r = await backups.commit(id, b.data);
        return "error" in r ? reply.code(r.error === "missing" ? 409 : r.error === "server" ? 500 : 400).send(r) : r;
      });
      app.get("/v1/link/backups/:id/manifest", async (req, reply) => {
        const id = await remote.deviceUser(req.headers.authorization);
        if (!id) return reply.code(401).send({ error: "unauthorized" });
        const p = uuid.safeParse(req.params);
        if (!p.success) return reply.code(400).send({ error: "invalid" });
        const m = await backups.manifestOf(id, p.data.id);
        return m ?? reply.code(404).send({ error: "not_found" });
      });
      app.get("/v1/link/blobs/:sha", async (req, reply) => {
        const id = await remote.deviceUser(req.headers.authorization);
        if (!id) return reply.code(401).send({ error: "unauthorized" });
        const p = z.object({ sha: z.string().length(64) }).safeParse(req.params);
        if (!p.success) return reply.code(400).send({ error: "invalid" });
        const f = await backups.blobStream(id, p.data.sha);
        if (!f) return reply.code(404).send({ error: "not_found" });
        return reply.header("content-type", "application/octet-stream").header("content-length", String(f.size)).send(f.stream);
      });
      // Conversion des anciennes sauvegardes (.tgz) d'un compte : jeton de service (le Core la lance aussi seul au démarrage).
      app.post("/v1/users/:id/link/backups/migrate", { preHandler: service }, async (req) => {
        const { id } = uuid.parse(req.params);
        return backups.migrate(id);
      });
      app.get("/v1/link/backups/:id", async (req, reply) => {
        const id = await remote.deviceUser(req.headers.authorization);
        if (!id) return reply.code(401).send({ error: "unauthorized" });
        const p = uuid.safeParse(req.params);
        if (!p.success) return reply.code(400).send({ error: "invalid" });
        const f = await backups.open(id, p.data.id);
        if (!f) return reply.code(404).send({ error: "not_found" });
        return reply.header("content-type", "application/gzip").header("content-length", String(f.size)).send(f.stream);
      });
    }
    // Connexion depuis le plugin (sans taper de code) : démarrer, approuver depuis le site, interroger.
    app.post("/v1/link/device/start", async (req, reply) => {
      const b = z.object({ name: z.string().max(40).optional(), platform: z.string().max(20).optional(), os: z.string().max(40).optional(), version: z.string().max(20).optional() }).safeParse(req.body ?? {});
      if (!b.success) return reply.code(400).send({ error: "invalid" });
      const r = remote.deviceStart(req.ip, b.data.name, b.data.platform, b.data.os, b.data.version);
      return "error" in r ? reply.code(429).send(r) : r;
    });
    app.post("/v1/link/device/poll", async (req, reply) => {
      const b = z.object({ device_code: z.string().max(100) }).safeParse(req.body ?? {});
      if (!b.success) return reply.code(400).send({ error: "invalid" });
      return remote.devicePoll(b.data.device_code);
    });
    app.get("/v1/me/link/approve", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      const q = z.object({ code: z.string().max(20) }).safeParse(req.query);
      if (!q.success) return reply.code(400).send({ error: "invalid" });
      if (!remote.canUse(id)) return reply.code(403).send({ error: "not_allowed" });
      return remote.deviceLookup(q.data.code) ?? reply.code(404).send({ error: "invalid_code" });
    });
    app.post("/v1/me/link/deny", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      const b = z.object({ code: z.string().max(20) }).safeParse(req.body ?? {});
      if (!b.success) return reply.code(400).send({ error: "invalid" });
      return remote.deviceDeny(id, b.data.code) ? { ok: true } : reply.code(404).send({ error: "invalid_code" });
    });
    // Renouvellement des jetons d'appareil (l'ancien jeton de renouvellement meurt à l'usage).
    app.post("/v1/link/token/refresh", async (req, reply) => {
      const b = z.object({ refresh: z.string().max(100) }).safeParse(req.body ?? {});
      if (!b.success) return reply.code(400).send({ error: "invalid" });
      const r = await remote.refresh(req.ip, b.data.refresh);
      if ("error" in r) return reply.code(r.error === "too_many" ? 429 : r.error === "server" ? 500 : 401).send({ error: r.error });
      return r;
    });
    app.post("/v1/me/link/approve", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      const b = z.object({ code: z.string().max(20) }).safeParse(req.body ?? {});
      if (!b.success) return reply.code(400).send({ error: "invalid" });
      if (!remote.canUse(id)) return reply.code(403).send({ error: "not_allowed" });
      return remote.deviceApprove(id, b.data.code) ?? reply.code(404).send({ error: "invalid_code" });
    });
    // L'agent présente son code d'appairage (pas de jeton : le code est le secret, à usage unique, 5 min, limité par IP).
    app.post("/v1/link/claim", async (req, reply) => {
      const b = z.object({ code: z.string().max(20), name: z.string().max(40).optional(), platform: z.string().max(20).optional() }).safeParse(req.body);
      if (!b.success) return reply.code(400).send({ error: "invalid" });
      const r = await remote.claim(req.ip, b.data.code, b.data.name, b.data.platform);
      if ("error" in r) return reply.code(r.error === "too_many" ? 429 : r.error === "server" ? 500 : 400).send({ error: r.error });
      return r;
    });
  }

  // ───── SYXTEE STUDIO : diffusion du programme vers des plateformes RTMP ─────
  if (d.studio) {
    const studio = d.studio;
    const body = z.object({
      destinations: z.array(z.object({ name: z.string().trim().min(1).max(40), url: z.string().max(600) })).min(1).max(5),
      bitrate_kbps: z.number().int().min(1000).max(8000).default(4500),
    });
    app.post("/v1/me/studio/session", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      const p = body.safeParse(req.body);
      if (!p.success) return reply.code(400).send({ error: "invalid" });
      const r = await studio.open(id, p.data.destinations, p.data.bitrate_kbps);
      if ("error" in r) return reply.code(r.error === "not_allowed" ? 403 : 400).send({ error: r.error });
      return r;
    });
    app.get("/v1/me/studio/status", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      return { ...studio.status(id), allowed: studio.canStream(id) };
    });
    app.delete("/v1/me/studio/session", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      return { ok: studio.close(id) };
    });
  }

  // MediaMTX → Core : autorisation d'une publication (Cam en WebRTC, caméras en RTMP). Jamais accessible de
  // l'extérieur (bloqué dans Caddy, et refusé ici dès qu'une requête arrive par un proxy).
  if (cam || d.rtmp || d.studio || d.obsPreview) {
    app.post("/internal/mediamtx/auth", async (req, reply) => {
      const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "");
      if (!local || req.headers["x-forwarded-for"]) return reply.code(404).send();
      const p = req.body as Record<string, string>;
      const ok = p.path?.startsWith(`${RTMP_APP}/`)
        ? !!(await d.rtmp?.authorize(p))
        : p.path?.startsWith("stu_")
          ? !!d.studio?.authorize(p)
          : p.path?.startsWith("obs_")
            ? !!d.obsPreview?.authorize(p)
            : !!(await cam?.authorize(p));
      return reply.code(ok ? 200 : 401).send();
    });
  }

  // Guard → Core : événements du journal du SLS, bannissements actifs. Local + jeton de service.
  const internalOnly = async (req: FastifyRequest, reply: FastifyReply) => {
    const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "");
    if (!local || req.headers["x-forwarded-for"] || !isServiceToken(req.headers.authorization, d.config.CORE_API_TOKEN)) return reply.code(404).send();
  };
  if (d.security) {
    const sec = d.security;
    app.post("/internal/guard/events", { preHandler: internalOnly, bodyLimit: 1024 * 1024 }, async (req) => {
      const { events } = z.object({ events: z.array(z.looseObject({ kind: z.string() })).max(5000) }).parse(req.body);
      await sec.handleSls(events as unknown as SlsEvent[]);
      return { ok: true };
    });
    app.get("/internal/guard/bans", { preHandler: internalOnly }, async () => ({ bans: sec.bans() }));
  }

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof z.ZodError) return reply.code(400).send({ error: "bad_request", issues: err.issues.map((i) => i.message) });
    app.log.error(err);
    return reply.code(500).send({ error: "internal" });
  });

  return app;
}
