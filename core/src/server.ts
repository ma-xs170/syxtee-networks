import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import cors from "@fastify/cors";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { isServiceToken } from "./auth.ts";
import type { Config } from "./config.ts";
import type { HealthMonitor, Live } from "./health.ts";
import { ForbiddenError, QuotaError, type Relay, type RelayStore } from "./relays.ts";
import type { Security } from "./security.ts";
import type { SlsEvent } from "./sls-log.ts";
import type { Rtmp } from "./rtmp.ts";
import { RTMP_APP } from "./rtmp.ts";
import type { SampleStore } from "./samples.ts";
import type { SessionTracker } from "./sessions.ts";
import type { Asn } from "./asn.ts";
import type { Cam } from "./cam.ts";
import { median } from "./aggregate.ts";
import type { Coverage } from "./coverage.ts";
import { classify, countsOnMap, DECLARED, declaredName, ipPrefix, isCaribbean, netToken, type Declared, type Prefixes } from "./link.ts";
import type { PrivateRelay } from "./privaterelay.ts";

// API HTTP du Core (derrière Caddy en HTTPS).
// /v1/users/:id/*  → serveur Vercel, jeton de service.
// /v1/me/*         → navigateur, jeton de session Supabase (seulement ses propres relais).
// /ping            → public : mesure de latence depuis le navigateur (choix du serveur).

export type Deps = {
  /** SYXTEE Cam (null si désactivée). */
  cam?: Cam | null;
  /** Pseudo et Twitch vérifié, pour l'app /cam (chat en superposition). */
  profile?: (userId: string) => Promise<{ username: string | null; twitch_login: string | null }>;
  /** Entrée RTMP (null si désactivée). */
  rtmp?: Rtmp | null;
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
  onKeysChanged: () => void;
  slsHealthy: () => Promise<boolean>;
};

/** Ce que voit le dashboard (jamais l'identifiant de publication de la régie, interne au Core). */
export function relayView(r: Relay, c: Config, live = false) {
  const host = c.RELAY_PUBLIC_HOST;
  const regie = r.mode === "regie" && c.REGIE_ENABLED;
  return {
    id: r.id,
    name: r.name,
    protocol: r.protocol,
    server: r.server,
    host,
    archived: r.archived,
    live: !r.archived && live,
    mode: r.mode,
    regie_available: c.REGIE_ENABLED,
    urls:
      r.protocol === "rtmp"
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
      .object({ name: z.string().trim().min(1).max(40), protocol: z.enum(["srtla", "rtmp"]), server: z.string(), limit: z.number().int().min(0) })
      .parse(req.body);
    if (body.server !== d.config.RELAY_NAME) return reply.code(409).send({ error: "server_unavailable" });
    if (body.protocol === "rtmp" && !d.rtmp) return reply.code(409).send({ error: "rtmp_disabled" });
    try {
      return changed(view(await d.relays.create(id, body)));
    } catch (e) {
      if (e instanceof QuotaError) return reply.code(403).send({ error: "quota" });
      if (e instanceof ForbiddenError) return reply.code(403).send({ error: "forbidden" });
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
        limit: z.number().int().min(0).default(0),
      })
      .parse(req.body);
    if (body.mode === "regie" && !d.config.REGIE_ENABLED) return reply.code(409).send({ error: "regie_disabled" });
    try {
      if (body.name !== undefined) r = await d.relays.rename(r, body.name);
      if (body.mode !== undefined) r = await d.relays.setMode(r, body.mode);
      if (body.archived !== undefined) r = await d.relays.setArchived(r, body.archived, body.limit);
    } catch (e) {
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

  // MediaMTX → Core : autorisation d'une publication (Cam en WebRTC, caméras en RTMP). Jamais accessible de
  // l'extérieur (bloqué dans Caddy, et refusé ici dès qu'une requête arrive par un proxy).
  if (cam || d.rtmp) {
    app.post("/internal/mediamtx/auth", async (req, reply) => {
      const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "");
      if (!local || req.headers["x-forwarded-for"]) return reply.code(404).send();
      const p = req.body as Record<string, string>;
      const ok = p.path?.startsWith(`${RTMP_APP}/`) ? !!(await d.rtmp?.authorize(p)) : !!(await cam?.authorize(p));
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
