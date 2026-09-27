import { existsSync, readFileSync, statSync } from "node:fs";
import cors from "@fastify/cors";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { isServiceToken } from "./auth.ts";
import type { Config } from "./config.ts";
import type { HealthMonitor, Live } from "./health.ts";
import type { KeyRow, KeyStore } from "./keys.ts";
import type { SampleStore } from "./samples.ts";
import type { SessionTracker } from "./sessions.ts";
import type { Cam } from "./cam.ts";

// API HTTP du Core (derrière Caddy en HTTPS).
// /v1/users/:id/*  → serveur Vercel, jeton de service.
// /v1/me/*         → navigateur, jeton de session Supabase.

export type Deps = {
  /** SYXTEE Cam (null si désactivée). */
  cam?: Cam | null;
  /** Pseudo et Twitch vérifié, pour l'app /cam (chat en superposition). */
  profile?: (userId: string) => Promise<{ username: string | null; twitch_login: string | null }>;
  config: Config;
  keys: KeyStore;
  health: HealthMonitor;
  samples: SampleStore;
  sessions: SessionTracker;
  verifyUser: (authorization: string | undefined) => Promise<string | null>;
  previewPath: (userId: string) => string;
  onKeysChanged: () => void;
  slsHealthy: () => Promise<boolean>;
};

/** Ce que voit le dashboard (jamais l'identifiant de publication de la régie, interne au Core). */
export function keyView(k: KeyRow, c: Config) {
  const host = c.RELAY_PUBLIC_HOST;
  const regie = k.mode === "regie" && c.REGIE_ENABLED;
  return {
    mode: k.mode,
    regie_available: c.REGIE_ENABLED,
    relay: { name: c.RELAY_NAME, host },
    moblin_srtla_url: `srtla://${host}:${c.SRTLA_PORT}?streamid=${k.publish_id}`,
    srt_publish_url: `srt://${host}:${c.SRT_PUBLISH_PORT}?streamid=${k.publish_id}`,
    obs_srt_url: `srt://${host}:${c.SRT_PLAY_PORT}?streamid=${regie ? k.out_play_id : k.play_id}`,
    created_at: k.created_at,
    rotated_at: k.rotated_at,
  };
}

const RANGES = { "15m": 15 * 60_000, "1h": 3_600_000, "6h": 6 * 3_600_000, "24h": 24 * 3_600_000 } as const;

export function buildServer(d: Deps) {
  const app = Fastify({ logger: { level: "info" }, trustProxy: true, bodyLimit: 16 * 1024 });
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
  app.register(cors, { origin: origins, methods: ["GET", "POST", "PUT"], allowedHeaders: ["Authorization", "Content-Type"] });

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

  app.get("/health", async () => ({ ok: true, sls: await d.slsHealthy(), streams_live: d.health.liveUsers().length }));

  // ───── Serveur Vercel ─────
  app.get("/v1/users/:id/keys", { preHandler: service }, async (req, reply) => {
    const { id } = uuid.parse(req.params);
    const k = await d.keys.get(id);
    return k ? keyView(k, d.config) : reply.code(404).send({ error: "no_keys" });
  });
  app.post("/v1/users/:id/keys", { preHandler: service }, async (req) => {
    const { id } = uuid.parse(req.params);
    const k = await d.keys.ensure(id);
    d.onKeysChanged();
    return keyView(k, d.config);
  });
  app.post("/v1/users/:id/keys/rotate", { preHandler: service }, async (req) => {
    const { id } = uuid.parse(req.params);
    const k = await d.keys.rotate(id);
    d.onKeysChanged();
    return keyView(k, d.config);
  });
  // Compte supprimé : les clés sont retirées du relais et effacées (plus aucune URL ne marche).
  app.delete("/v1/users/:id/keys", { preHandler: service }, async (req, reply) => {
    const { id } = uuid.parse(req.params);
    await d.keys.remove(id);
    d.onKeysChanged();
    return reply.code(204).send();
  });
  app.put("/v1/users/:id/mode", { preHandler: service }, async (req, reply) => {
    const { id } = uuid.parse(req.params);
    const { mode } = z.object({ mode: z.enum(["direct", "regie"]) }).parse(req.body);
    if (mode === "regie" && !d.config.REGIE_ENABLED) return reply.code(409).send({ error: "regie_disabled" });
    const k = await d.keys.setMode(id, mode);
    d.onKeysChanged();
    return keyView(k, d.config);
  });

  // ───── Navigateur (dashboard) ─────
  app.get("/v1/me/health", async (req, reply) => {
    const id = await userId(req, reply);
    if (!id) return;
    const { range } = z.object({ range: z.enum(["15m", "1h", "6h", "24h"]).default("1h") }).parse(req.query);
    return { live: d.health.state(id), samples: d.samples.history(id, Date.now() - RANGES[range]) };
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

  // Statut léger (pastille de la barre du dashboard) : en ligne ou non, début du direct, débit toutes les 5 s au plus.
  // N'accélère pas les relevés (pas de watch) : ouvert sur toutes les pages du dashboard.
  app.get("/v1/me/status/stream", async (req, reply) => {
    const id = await userId(req, reply);
    if (!id) return;
    const send = openStream(req, reply);
    let lastSent = 0;
    const push = () => {
      const s = d.health.state(id);
      const cur = d.sessions.current(id);
      lastSent = Date.now();
      send("status", {
        live: !!s?.live,
        reconnecting: !s?.live && !!cur?.reconnecting,
        started_at: cur?.started_at ?? (s?.live ? s.since : null),
        kbps: s?.live && s.sample ? Math.round(s.sample.bitrate) : null,
        reconnects: cur?.reconnects ?? 0,
      });
    };
    push();
    const onStatus = (uid: string) => uid === id && push();
    const onSample = (uid: string) => uid === id && Date.now() - lastSent >= 5000 && push();
    d.health.events.on("status", onStatus);
    d.health.events.on("sample", onSample);
    const ping = setInterval(() => reply.raw.write(": ping\n\n"), 15_000);
    req.raw.on("close", () => {
      clearInterval(ping);
      d.health.events.off("status", onStatus);
      d.health.events.off("sample", onSample);
    });
  });

  // Santé en temps réel (Server-Sent Events).
  app.get("/v1/me/health/stream", async (req, reply) => {
    const id = await userId(req, reply);
    if (!id) return;
    const send = openStream(req, reply);
    send("state", d.health.state(id) ?? { live: false, since: Date.now(), sample: null });
    const onSample = (uid: string, s: Live) => uid === id && send("state", s);
    d.health.events.on("sample", onSample);
    const unwatch = d.health.watch(id);
    const ping = setInterval(() => reply.raw.write(": ping\n\n"), 15_000);
    req.raw.on("close", () => {
      clearInterval(ping);
      d.health.events.off("sample", onSample);
      unwatch();
    });
  });

  app.get("/v1/me/preview.jpg", async (req, reply) => {
    const id = await userId(req, reply);
    if (!id) return;
    const file = d.previewPath(id);
    const fresh = existsSync(file) && Date.now() - statSync(file).mtimeMs < 15_000;
    if (!fresh) return reply.code(404).send({ error: "no_preview" });
    return reply.header("Content-Type", "image/jpeg").header("Cache-Control", "no-store").send(readFileSync(file));
  });

  // ───── SYXTEE Cam ─────
  const cam = d.cam;
  if (cam) {
    const camView = (k: KeyRow) => ({ cam_key: k.cam_key, cam_path: `/cam?k=${k.cam_key}`, whip_url: cam.whipUrl(k.cam_key!) });
    app.get("/v1/users/:id/cam", { preHandler: service }, async (req) => camView(await cam.ensure(uuid.parse(req.params).id)));
    app.post("/v1/users/:id/cam/rotate", { preHandler: service }, async (req) => {
      const k = await cam.rotate(uuid.parse(req.params).id);
      d.onKeysChanged();
      return camView(k);
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
        live: d.health.state(row.user_id)?.live ?? false,
      };
    });
    const gps = z.object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
      acc: z.number().min(0).max(100_000).nullish(),
      speed: z.number().min(0).max(1000).nullish(),
      t: z.number().int().optional(),
    });
    app.post("/v1/cam/gps", async (req, reply) => {
      const row = await camRow(req, reply);
      if (!row) return;
      const g = gps.parse(req.body);
      const now = Date.now();
      // Horodatage du téléphone accepté s'il est plausible (±2 min), sinon heure du serveur.
      const t = g.t && Math.abs(g.t - now) < 120_000 ? g.t : now;
      d.samples.addPosition(row.user_id, { t, lat: g.lat, lon: g.lon, acc: g.acc ?? null, speed: g.speed ?? null });
      return reply.code(204).send();
    });
    app.get("/v1/me/positions", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      const { range } = z.object({ range: z.enum(["15m", "1h", "6h", "24h"]).default("1h") }).parse(req.query);
      return { positions: d.samples.positions(id, Date.now() - RANGES[range]) };
    });

    // MediaMTX → Core : autorisation d'une publication. Jamais accessible de l'extérieur
    // (bloqué dans Caddy, et refusé ici dès qu'une requête arrive par un proxy).
    app.post("/internal/mediamtx/auth", async (req, reply) => {
      const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "");
      if (!local || req.headers["x-forwarded-for"]) return reply.code(404).send();
      const ok = await cam.authorize(req.body as Record<string, string>);
      return reply.code(ok ? 200 : 401).send();
    });
  }

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof z.ZodError) return reply.code(400).send({ error: "bad_request", issues: err.issues.map((i) => i.message) });
    app.log.error(err);
    return reply.code(500).send({ error: "internal" });
  });

  return app;
}
