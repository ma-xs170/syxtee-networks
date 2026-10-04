import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";
import type { EmbedBuilder } from "discord.js";
import { z } from "zod";
import type { Config } from "./config.ts";
import { announceEmbed, pushEmbed } from "./embeds.ts";
import type { LogEntry, PresenceType } from "./state.ts";

// Petit serveur HTTP (127.0.0.1, exposé par Caddy sur /discord/*) :
//   POST /github    webhook GitHub (événement push), signature HMAC SHA-256 vérifiée
//   POST /announce  annonce libre {title, body, url?, tag?}, jeton Bearer BOT_ANNOUNCE_TOKEN
//   GET  /health

function readBody(req: IncomingMessage, max = 1_000_000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > max) {
        reject(new Error("trop gros"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function verifyGithub(secret: string, body: Buffer, header: string | undefined) {
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  return safeEqual(expected, header);
}

type PushPayload = {
  ref?: string;
  compare?: string;
  commits?: { id: string; message: string; url: string; distinct?: boolean }[];
};

/** Actions du panel du site (routes /api/*, jeton Bearer = CORE_API_TOKEN, celui que Vercel utilise déjà pour le Core). */
export type AdminApi = {
  status(): Promise<unknown>;
  presence(p: { mode: "auto" | "custom"; type: PresenceType; text: string }): void;
  alerts(enabled: boolean): void;
  postServices(): Promise<void>;
  /** Modifie un message déjà publié par le bot dans le salon. false si le message n'existe plus. */
  edit(messageId: string, e: { title: string; body: string; tag?: string }): Promise<boolean>;
};

const announceBody = z.object({ title: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(3500), url: z.url().optional(), tag: z.string().max(30).optional() });
const editBody = announceBody.omit({ url: true }).extend({ messageId: z.string().regex(/^\d+$/) });
const presenceBody = z.object({ mode: z.enum(["auto", "custom"]), type: z.enum(["watching", "playing", "listening", "competing"]).default("watching"), text: z.string().trim().max(100).default("") });

export function startWeb(cfg: Config, publish: (embed: EmbedBuilder, entry: Omit<LogEntry, "at">) => Promise<string>, admin: AdminApi) {
  const server = createServer(async (req, res) => {
    const send = (code: number, text = "") => {
      res.writeHead(code, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(text);
    };
    try {
      const path = (req.url ?? "/").replace(/^\/discord/, "").split("?")[0];
      if (req.method === "GET" && path === "/health") return send(200, "ok");

      if (path.startsWith("/api/")) {
        const auth = (req.headers.authorization ?? "").replace(/^Bearer /, "");
        if (!cfg.CORE_API_TOKEN || !safeEqual(auth, cfg.CORE_API_TOKEN)) return send(401);
        const json = (code: number, data: unknown) => {
          res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          res.end(JSON.stringify(data));
        };
        if (req.method === "GET" && path === "/api/status") return json(200, await admin.status());
        if (req.method !== "POST") return send(405);
        const raw = JSON.parse((await readBody(req, 50_000)).toString("utf8") || "{}");
        if (path === "/api/announce") {
          const a = announceBody.safeParse(raw);
          if (!a.success) return json(400, { error: a.error.issues[0]?.message ?? "invalide" });
          const id = await publish(announceEmbed({ ...a.data, tag: a.data.tag ?? "Annonce" }), { kind: "annonce", title: a.data.title, by: "panel" });
          return json(200, { ok: true, id });
        }
        if (path === "/api/edit") {
          const e = editBody.safeParse(raw);
          if (!e.success) return json(400, { error: e.error.issues[0]?.message ?? "invalide" });
          const done = await admin.edit(e.data.messageId, { title: e.data.title, body: e.data.body, tag: e.data.tag ?? "Annonce" });
          return done ? json(200, { ok: true }) : json(404, { error: "message introuvable" });
        }
        if (path === "/api/presence") {
          const p = presenceBody.safeParse(raw);
          if (!p.success) return json(400, { error: "invalide" });
          admin.presence(p.data);
          return json(200, { ok: true });
        }
        if (path === "/api/alerts") {
          const a = z.object({ enabled: z.boolean() }).safeParse(raw);
          if (!a.success) return json(400, { error: "invalide" });
          admin.alerts(a.data.enabled);
          return json(200, { ok: true });
        }
        if (path === "/api/services-post") {
          await admin.postServices();
          return json(200, { ok: true });
        }
        return send(404);
      }
      if (req.method !== "POST") return send(405);

      if (path === "/github" && cfg.GITHUB_WEBHOOK_SECRET) {
        const body = await readBody(req);
        if (!verifyGithub(cfg.GITHUB_WEBHOOK_SECRET, body, req.headers["x-hub-signature-256"] as string | undefined)) return send(401);
        if (req.headers["x-github-event"] !== "push") return send(204);
        const p = JSON.parse(body.toString("utf8")) as PushPayload;
        if (p.ref !== `refs/heads/${cfg.GITHUB_BRANCH}`) return send(204);
        const commits = (p.commits ?? []).filter((c) => c.distinct !== false);
        if (commits.length === 0) return send(204);
        await publish(pushEmbed(commits, p.compare ?? cfg.SITE_URL), { kind: "nouveauté", title: `${commits.length} commit(s) sur ${cfg.GITHUB_BRANCH}`, by: "GitHub" });
        return send(204);
      }

      if (path === "/announce" && cfg.BOT_ANNOUNCE_TOKEN) {
        const auth = (req.headers.authorization ?? "").replace(/^Bearer /, "");
        if (!safeEqual(auth, cfg.BOT_ANNOUNCE_TOKEN)) return send(401);
        const j = JSON.parse((await readBody(req, 50_000)).toString("utf8")) as { title?: string; body?: string; url?: string; tag?: string };
        if (!j.title || !j.body) return send(400, "title et body requis");
        await publish(announceEmbed({ title: j.title, body: j.body, url: j.url, tag: j.tag }), { kind: "annonce", title: j.title, by: "script" });
        return send(204);
      }
      return send(404);
    } catch (err) {
      console.error("web:", err);
      return send(500);
    }
  });
  server.listen(cfg.BOT_PORT, cfg.BOT_HOST, () => console.log(`Bot HTTP sur ${cfg.BOT_HOST}:${cfg.BOT_PORT}`));
  return server;
}
