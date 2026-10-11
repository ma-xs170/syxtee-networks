import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Controller } from "./controller.ts";

const PAGE = readFileSync(new URL("../ui/index.html", import.meta.url));
const sha = (s: string) => createHash("sha256").update(s).digest();

function json(res: ServerResponse, code: number, body: unknown): void {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 10_000) throw new Error("Requête trop grande.");
    chunks.push(c as Buffer);
  }
  if (!chunks.length) return {};
  const v = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new Error("Corps JSON invalide.");
  return v as Record<string, unknown>;
}

/** Interface locale du boîtier. Sans PIN, n'écoute que sur 127.0.0.1 ; avec un PIN, elle peut écouter sur le réseau local. */
export function createUiServer(ctl: Controller, opts: { pin?: string } = {}): Server {
  const pinHash = opts.pin ? sha(opts.pin) : null;
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://x");
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors 'none'" });
        return void res.end(PAGE);
      }
      if (!url.pathname.startsWith("/api/")) return json(res, 404, { error: "Introuvable." });
      if (pinHash) {
        const got = sha(String(req.headers["x-pin"] ?? ""));
        if (!timingSafeEqual(got, pinHash)) return json(res, 401, { error: "PIN requis." });
      }
      if (req.method === "GET" && url.pathname === "/api/state") return json(res, 200, ctl.snapshot());
      if (req.method !== "POST") return json(res, 405, { error: "Méthode non permise." });
      const body = await readJson(req);
      let err: string | null = null;
      if (url.pathname === "/api/start") err = ctl.start();
      else if (url.pathname === "/api/stop") await ctl.stop();
      else if (url.pathname === "/api/settings") err = ctl.update(body);
      else if (url.pathname === "/api/link") err = ctl.setLinkEnabled(String(body.name ?? ""), body.enabled === true);
      else return json(res, 404, { error: "Introuvable." });
      return err ? json(res, 400, { error: err }) : json(res, 200, ctl.snapshot());
    } catch (e) {
      return json(res, 400, { error: e instanceof SyntaxError ? "JSON invalide." : (e as Error).message });
    }
  });
}
