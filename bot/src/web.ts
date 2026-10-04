import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";
import type { EmbedBuilder } from "discord.js";
import type { Config } from "./config.ts";
import { announceEmbed, pushEmbed } from "./embeds.ts";

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

export function startWeb(cfg: Config, publish: (embed: EmbedBuilder) => Promise<void>) {
  const server = createServer(async (req, res) => {
    const send = (code: number, text = "") => {
      res.writeHead(code, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(text);
    };
    try {
      const path = (req.url ?? "/").replace(/^\/discord/, "").split("?")[0];
      if (req.method === "GET" && path === "/health") return send(200, "ok");
      if (req.method !== "POST") return send(405);

      if (path === "/github" && cfg.GITHUB_WEBHOOK_SECRET) {
        const body = await readBody(req);
        if (!verifyGithub(cfg.GITHUB_WEBHOOK_SECRET, body, req.headers["x-hub-signature-256"] as string | undefined)) return send(401);
        if (req.headers["x-github-event"] !== "push") return send(204);
        const p = JSON.parse(body.toString("utf8")) as PushPayload;
        if (p.ref !== `refs/heads/${cfg.GITHUB_BRANCH}`) return send(204);
        const commits = (p.commits ?? []).filter((c) => c.distinct !== false);
        if (commits.length === 0) return send(204);
        await publish(pushEmbed(commits, p.compare ?? cfg.SITE_URL));
        return send(204);
      }

      if (path === "/announce" && cfg.BOT_ANNOUNCE_TOKEN) {
        const auth = (req.headers.authorization ?? "").replace(/^Bearer /, "");
        if (!safeEqual(auth, cfg.BOT_ANNOUNCE_TOKEN)) return send(401);
        const j = JSON.parse((await readBody(req, 50_000)).toString("utf8")) as { title?: string; body?: string; url?: string; tag?: string };
        if (!j.title || !j.body) return send(400, "title et body requis");
        await publish(announceEmbed({ title: j.title, body: j.body, url: j.url, tag: j.tag }));
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
