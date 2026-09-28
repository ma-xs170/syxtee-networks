import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import cors from "@fastify/cors";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { isServiceToken } from "./auth.ts";
import type { Config } from "./config.ts";
import type { HealthMonitor, Live } from "./health.ts";
import type { KeyRow, KeyStore } from "./keys.ts";
import type { SampleStore } from "./samples.ts";
import type { SessionTracker } from "./sessions.ts";
import type { Asn } from "./asn.ts";
import type { Cam } from "./cam.ts";
import { median } from "./aggregate.ts";
import type { Coverage } from "./coverage.ts";
import { classify, countsOnMap, ipPrefix, netToken, type Prefixes } from "./link.ts";

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
  coverage?: Coverage;
  asn?: Asn;
  /** Préfixes IP appris depuis les Android (Wi-Fi / mobile). */
  prefixes?: Prefixes;
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
  // Carte de couverture : effacement des mesures d'un compte (bouton dans Paramètres, suppression du compte).
  app.delete("/v1/users/:id/coverage", { preHandler: service }, async (req) => {
    const { id } = uuid.parse(req.params);
    return { deleted: d.coverage ? await d.coverage.erase(id) : 0 };
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
        const link = classify({ device: g.ct, asn: info.asn, asName: info.asName, prefix: d.prefixes?.get(prefix) });
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

    // ───── Couverture : mode Scan de SYXTEE Cam ─────
    // Un point = 3 micro-tests (5 pings, envoi pendant 2 s, réception pendant 2 s), puis la médiane. Le débit montant
    // est mesuré ICI (octets reçus / durée), le descendant par le téléphone. Le type de lien (Wi-Fi ou 4G/5G) est déduit
    // de navigator.connection.type, de l'ASN de l'IP et des préfixes appris. Rien n'est gardé sans consentement.
    const cov = d.coverage;
    if (cov) {
      // iPhone : `from` = réseau à l'ouverture de la page, `cell` = réseau vu juste après « Coupe le Wi-Fi ».
      // Le changement ne compte que tant que le téléphone reste sur ce réseau-là (un nouveau Wi-Fi plus tard ne passe pas).
      const net = (req: FastifyRequest, device: string | null | undefined, from?: string | null, cell?: string | null) => {
        const info = d.asn?.lookup(req.ip) ?? { operator: null, asn: null, asName: null };
        const prefix = ipPrefix(req.ip);
        const token = netToken(d.config.CORE_API_TOKEN, prefix);
        const switched = !!from && !!token && token !== from && (cell === undefined || token === cell);
        const link = classify({ device, asn: info.asn, asName: info.asName, prefix: d.prefixes?.get(prefix), switched });
        return { ...info, prefix, token, link };
      };
      const upTests = new Map<string, { at: number; bytes: number; ms: number }[]>(); // `${user}:${test}:${i}`
      const sweep = () => {
        const old = Date.now() - 120_000;
        for (const [k, v] of upTests) if (!v.length || v[v.length - 1].at < old) upTests.delete(k);
      };
      const randomChunk = randomBytes(64 * 1024); // aléatoire : aucune compression en route

      app.get("/v1/cam/ping", async (_req, reply) => reply.code(204).header("Cache-Control", "no-store").send());
      app.get("/v1/cam/coverage", async (req, reply) => {
        const row = await camRow(req, reply);
        if (!row) return;
        const q = z.object({ ct: z.string().max(20).optional(), from: z.string().max(40).optional() }).parse(req.query);
        const n = net(req, q.ct, q.from);
        return { consent: await cov.consent(row.user_id), operator: n.operator, link_type: n.link.link_type, link_conf: n.link.conf, net: n.token };
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
          const row = await camRow(req, reply);
          if (!row) return;
          const q = z.object({ test: z.string().regex(/^[\w-]{6,40}$/), i: z.coerce.number().int().min(0).max(2) }).parse(req.query);
          if (bytes < 16 * 1024) return reply.code(400).send({ error: "payload_too_small" });
          sweep();
          const k = `${row.user_id}:${q.test}:${q.i}`;
          upTests.set(k, [...(upTests.get(k) ?? []), { at: Date.now(), bytes, ms }]);
          return { kbps: ms > 0 ? Math.round((bytes * 8) / ms) : null };
        },
      );
      // Réception : données aléatoires pendant `ms` millisecondes, plafonnées en octets (data du téléphone).
      app.get("/v1/cam/scan/down", async (req, reply) => {
        const row = await camRow(req, reply);
        if (!row) return;
        const q = z
          .object({ ms: z.coerce.number().int().min(500).max(3000).default(2000), max: z.coerce.number().int().min(65_536).max(8_000_000).default(6_000_000) })
          .parse(req.query);
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
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        acc: z.number().min(0).max(100_000).nullish(),
        speed: z.number().min(0).max(1000).nullish(), // m/s (GPS)
        t: z.number().int().optional(),
        ct: z.string().max(20).nullish(), // navigator.connection.type (Android)
        from: z.string().max(40).nullish(), // jeton réseau lu à l'ouverture de la page (iPhone)
        cell: z.string().max(40).nullish(), // jeton réseau lu après « Coupe le Wi-Fi » (iPhone)
        down_kbps: z.array(z.number().min(0).max(10_000_000)).max(3).default([]),
        rtt_ms: z.array(z.number().min(0).max(60_000)).max(3).default([]),
      });
      // Fin d'un point : médiane des 3 micro-tests, classement du lien, filtres (dans coverage).
      app.post("/v1/cam/scan", async (req, reply) => {
        const row = await camRow(req, reply);
        if (!row) return;
        const b = scanBody.parse(req.body);
        const ups = [0, 1, 2].flatMap((i) => {
          const k = `${row.user_id}:${b.test}:${i}`;
          const parts = upTests.get(k) ?? [];
          upTests.delete(k);
          const bytes = parts.reduce((a, p) => a + p.bytes, 0);
          const ms = parts.reduce((a, p) => a + p.ms, 0);
          return ms > 0 && bytes > 0 ? [(bytes * 8) / ms] : [];
        });
        if (!ups.length) return reply.code(400).send({ error: "no_upload" });
        const med = (xs: number[]) => (xs.length ? Math.round(median(xs)) : null);
        const n = net(req, b.ct, b.from, b.cell ?? null);
        d.prefixes?.learn(n.prefix, b.ct);
        const now = Date.now();
        const point = {
          t: b.t && Math.abs(b.t - now) < 120_000 ? b.t : now,
          lat: b.lat,
          lng: b.lng,
          acc: b.acc ?? null,
          speed_kmh: b.speed == null ? null : b.speed * 3.6,
          up_kbps: med(ups),
          down_kbps: med(b.down_kbps),
          rtt_ms: med(b.rtt_ms),
          loss_pct: null,
          operator: n.operator,
          asn: n.asn,
          link: n.link,
        };
        const reason = await cov.add(row.user_id, "scan", point);
        const counted = reason === null && countsOnMap(n.link);
        const t = n.link.link_type;
        return {
          accepted: reason === null,
          counted,
          reason: reason ?? (counted ? null : t === "wifi" || t === "fixed" ? "wifi" : t === "starlink" ? "starlink" : "unknown_link"),
          operator: n.operator,
          link_type: t,
          link_conf: n.link.conf,
          up_kbps: point.up_kbps,
          down_kbps: point.down_kbps,
          rtt_ms: point.rtt_ms,
        };
      });
    }

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
