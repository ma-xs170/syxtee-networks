// Faux serveur Twitch pour les tests e2e : jeton applicatif, /helix/streams et /helix/users.
// La chaîne « e2e-live-1 » est toujours en live avec 42 viewers.
import { createServer } from "node:http";

export const LIVE = { "e2e-live-1": { viewers: 42, login: "e2e_live" } };

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const json = (body, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (url.pathname === "/health") return json({ ok: true });
  if (url.pathname === "/oauth2/token") return json({ access_token: "e2e-token", expires_in: 3600, token_type: "bearer" });
  if (url.pathname === "/helix/streams") {
    const data = url.searchParams
      .getAll("user_id")
      .filter((id) => LIVE[id])
      .map((id) => ({ user_id: id, user_login: LIVE[id].login, type: "live", viewer_count: LIVE[id].viewers, title: "Live e2e" }));
    return json({ data });
  }
  if (url.pathname === "/helix/users") {
    const id = url.searchParams.get("id");
    return json({ data: id ? [{ id, login: `user_${id}`, display_name: `User_${id}`, profile_image_url: "" }] : [] });
  }
  json({ error: "not found" }, 404);
}).listen(3999, () => console.log("Faux Twitch sur :3999"));
