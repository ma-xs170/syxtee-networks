// Faux SYXTEE Core pour les tests e2e : relais en mémoire (même API que core/src/server.ts), /ping, et 404 sur /v1/me/*.
import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:http";

export const CORE_TOKEN = "e2e-core-token-0123456789abcdef0123";
const HOST = "relais.e2e";
const relays = new Map(); // id → relais

const hex = () => randomBytes(16).toString("hex");
const view = (r) => ({
  id: r.id,
  name: r.name,
  protocol: r.protocol,
  server: r.server,
  host: HOST,
  archived: r.archived,
  live: false,
  mode: r.mode,
  regie_available: false,
  urls:
    r.protocol === "rist"
      ? { rist_url: `rist://${HOST}:6001?secret=${"a".repeat(48)}&aes-type=256&profile=1`, rist_server: `rist://${HOST}:6001`, rist_host: HOST, rist_port: 6001, rist_secret: "a".repeat(48) }
      : r.protocol === "rtmp"
      ? { rtmp_server: `rtmp://${HOST}:1935/live`, rtmp_key: r.publish_id, rtmp_url: `rtmp://${HOST}:1935/live/${r.publish_id}` }
      : { srtla_url: `srtla://${HOST}:5000?streamid=${r.publish_id}`, srt_url: `srt://${HOST}:4001?streamid=${r.publish_id}` },
  obs_srt_url: `srt://${HOST}:4000?streamid=${r.play_id}`,
  created_at: r.created_at,
  rotated_at: r.rotated_at,
  last_live_at: null,
});

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type" };
  const json = (body, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json", ...cors });
    res.end(body === null ? "" : JSON.stringify(body));
  };
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    if (req.method === "OPTIONS") return json(null, 204);
    if (url.pathname === "/health") return json({ ok: true });
    if (url.pathname === "/ping") return json(null, 204);
    if (url.pathname.startsWith("/v1/me/")) return json({ error: "no_relay" }, 404);
    if (req.headers.authorization !== `Bearer ${CORE_TOKEN}`) return json({ error: "unauthorized" }, 401);
    const m = url.pathname.match(/^\/v1\/users\/([^/]+)\/(relays|cam)(?:\/([^/]+))?(?:\/(rotate))?$/);
    if (!m) return json({ error: "not_found" }, 404);
    const [, user, kind, rid, action] = m;
    const data = body ? JSON.parse(body) : {};
    const mine = [...relays.values()].filter((r) => r.user === user);
    if (kind === "cam") return json({ error: "no_relay" }, 404);
    if (!rid) {
      if (req.method === "GET") return json({ relays: mine.map(view) });
      if (req.method === "DELETE") {
        for (const r of mine) relays.delete(r.id);
        return json(null, 204);
      }
      if (req.method === "POST") {
        if (data.server !== "nyc1") return json({ error: "server_unavailable" }, 409);
        if (mine.filter((r) => !r.archived).length >= data.limit) return json({ error: "quota" }, 403);
        const r = { id: randomUUID(), user, name: data.name, protocol: data.protocol, server: data.server, publish_id: `live_${hex()}`, play_id: `play_${hex()}`, mode: "direct", archived: false, created_at: new Date().toISOString(), rotated_at: null };
        relays.set(r.id, r);
        return json(view(r));
      }
    }
    const r = relays.get(rid);
    if (!r || r.user !== user) return json({ error: "no_relay" }, 404);
    if (req.method === "GET") return json(view(r));
    if (req.method === "DELETE") return relays.delete(r.id), json(null, 204);
    if (action === "rotate") return (r.publish_id = `live_${hex()}`), (r.play_id = `play_${hex()}`), (r.rotated_at = new Date().toISOString()), json(view(r));
    if (req.method === "PATCH") {
      if (data.archived === false && r.archived && mine.filter((x) => !x.archived).length >= data.limit) return json({ error: "quota" }, 403);
      Object.assign(r, Object.fromEntries(Object.entries(data).filter(([k]) => ["name", "archived", "mode"].includes(k))));
      return json(view(r));
    }
    json({ error: "not_found" }, 404);
  });
}).listen(3998);
