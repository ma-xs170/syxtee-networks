// Faux srt-live-server pour tester le Core en local : API stream-ids + /stats.
// `live` : players qui ont un publieur. Contrôle : POST /__live/<player> et DELETE /__live/<player>.
import { createServer } from "node:http";

export function startFakeSls(port, apiKey) {
  const ids = new Map(); // player → publisher
  const desc = new Map(); // player → description
  const live = new Set();
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const json = (code, body) => (res.writeHead(code, { "Content-Type": "application/json" }), res.end(JSON.stringify(body)));
    const authed = req.headers.authorization === `Bearer ${apiKey}`;
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      if (url.pathname === "/health") return json(200, { status: "ok" });
      if (url.pathname.startsWith("/__live/")) {
        const p = url.pathname.slice(8);
        req.method === "POST" ? live.add(p) : live.delete(p);
        return json(200, { ok: true });
      }
      if (url.pathname.startsWith("/stats/")) {
        const p = decodeURIComponent(url.pathname.slice(7));
        if (!ids.has(p) || !live.has(p)) return json(404, { status: "error" });
        return json(200, { status: "ok", publisher: { bitrate: 5800 + Math.round(Math.random() * 400), rtt: 42, buffer: 2000, dropped_pkts: 3, uptime: 10, latency: 2000, peers: [{ connection_id: "a", bitrate: 3000 }, { connection_id: "b", bitrate: 2900 }] } });
      }
      if (!authed) return json(401, { status: "error" });
      if (url.pathname === "/api/stream-ids" && req.method === "GET") return json(200, { status: "success", data: [...ids].map(([player, publisher]) => ({ player, publisher, description: desc.get(player) })) });
      if (url.pathname === "/api/stream-ids" && req.method === "POST") {
        const { publisher, player, description } = JSON.parse(body);
        if (ids.has(player)) return json(409, { status: "error" });
        ids.set(player, publisher);
        desc.set(player, description);
        return json(200, { status: "success" });
      }
      if (url.pathname.startsWith("/api/stream-ids/") && req.method === "DELETE") {
        const p = decodeURIComponent(url.pathname.slice(16));
        if (!ids.delete(p)) return json(404, { status: "error" });
        return json(200, { status: "success" });
      }
      json(404, { status: "error" });
    });
  });
  server.listen(port);
  return { server, ids, desc, live };
}
