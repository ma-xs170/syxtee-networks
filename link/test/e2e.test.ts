import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { WebSocket, WebSocketServer } from "ws";
import { createRemote } from "../../core/src/remote.ts";
import { fakeDb } from "../../core/test/fake-db.ts";
import { Agent } from "../src/agent.ts";
import { defaults } from "../src/config.ts";

// Bout en bout : navigateur ↔ vrai Core (remote.ts) ↔ vrai agent ↔ faux OBS.

const U = "00000000-0000-4000-8000-000000000001";
const listen = (s: ReturnType<typeof createServer>) => new Promise<number>((r) => s.listen(0, "127.0.0.1", () => r((s.address() as AddressInfo).port)));
const until = async (f: () => boolean, ms = 3000) => {
  const t = Date.now();
  while (!f()) {
    if (Date.now() - t > ms) throw new Error("délai dépassé");
    await new Promise((r) => setTimeout(r, 10));
  }
};

test("télécommande de bout en bout : scène, backup enregistré, commande interdite", async () => {
  process.env.SYXTEE_LINK_HOME = mkdtempSync(join(tmpdir(), "syxtee-link-"));

  // Faux OBS
  const obsHttp = createServer();
  const obsWss = new WebSocketServer({ server: obsHttp, handleProtocols: () => "obswebsocket.json" });
  const obsState = { scene: "Live", calls: [] as string[] };
  obsWss.on("connection", (ws) => {
    ws.send(JSON.stringify({ op: 0, d: { obsWebSocketVersion: "5.5.0", rpcVersion: 1 } }));
    ws.on("message", (raw) => {
      const m = JSON.parse(String(raw));
      if (m.op === 1) return ws.send(JSON.stringify({ op: 2, d: { negotiatedRpcVersion: 1 } }));
      if (m.op !== 6) return;
      const { requestType: t, requestId: id, requestData: d } = m.d;
      obsState.calls.push(t);
      let data: Record<string, unknown> = {};
      if (t === "GetVersion") data = { obsVersion: "31.0.0" };
      if (t === "GetSceneList") data = { currentProgramSceneName: obsState.scene, scenes: [{ sceneName: "BRB" }, { sceneName: "Live" }] };
      if (t === "SetCurrentProgramScene") {
        obsState.scene = d.sceneName;
        ws.send(JSON.stringify({ op: 7, d: { requestType: t, requestId: id, requestStatus: { result: true, code: 100 } } }));
        return void ws.send(JSON.stringify({ op: 5, d: { eventType: "CurrentProgramSceneChanged", eventData: { sceneName: d.sceneName } } }));
      }
      ws.send(JSON.stringify({ op: 7, d: { requestType: t, requestId: id, requestStatus: { result: true, code: 100 }, responseData: data } }));
    });
  });
  const obsPort = await listen(obsHttp);

  // Vrai Core (partie télécommande)
  const db = fakeDb({ link_devices: ["token_hash"] }, { link_devices: () => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), last_seen: null }) });
  const remote = createRemote({ db: db as never, canUse: (id) => id === U, verifyUser: async (h) => (h === "Bearer jwt" ? U : null), log: () => {} });
  const core = createServer();
  core.on("upgrade", (req, socket, head) => void (remote.upgrade(req, socket, head) || socket.destroy()));
  const corePort = await listen(core);

  // Appairage puis agent
  const claim = await remote.claim("1.1.1.1", remote.newCode(U).code, "PC", "darwin");
  assert.ok("token" in claim);
  const cfg = { ...defaults(), core: `http://127.0.0.1:${corePort}`, token: claim.token, obs: { host: "127.0.0.1", port: obsPort, password: "" } };
  const agent = new Agent(cfg);
  agent.start();
  await until(() => agent.status.core === "on" && agent.status.obs === "on");
  assert.equal(agent.status.obsVersion, "31.0.0");

  // Navigateur
  const b = new WebSocket(`ws://127.0.0.1:${corePort}/v1/link/remote`);
  const inbox: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  b.on("message", (r) => inbox.push(JSON.parse(String(r))));
  await new Promise((r) => b.once("open", r));
  b.send(JSON.stringify({ type: "hello", access: "jwt" }));
  await until(() => inbox.some((m) => m.type === "ready"));
  assert.equal(inbox.find((m) => m.type === "ready").agent.online, true);
  const ask = async (id: string, method: string, params?: unknown) => {
    b.send(JSON.stringify({ type: "req", id, method, params }));
    await until(() => inbox.some((m) => m.type === "res" && m.id === id));
    return inbox.find((m) => m.type === "res" && m.id === id);
  };

  const sl = await ask("1", "GetSceneList");
  assert.equal(sl.ok, true);
  assert.equal(sl.result.currentProgramSceneName, "Live");

  assert.equal((await ask("2", "SetCurrentProgramScene", { sceneName: "BRB" })).ok, true);
  assert.equal(obsState.scene, "BRB");
  await until(() => inbox.some((m) => m.type === "event" && m.name === "CurrentProgramSceneChanged" && m.data.sceneName === "BRB"));

  // Backup : enregistré sur le PC (config.json), valeurs bornées.
  const bk = await ask("3", "link.setBackup", { enabled: true, source: "SRT", scene: "BRB", freezeSeconds: 999 });
  assert.equal(bk.ok, true);
  assert.equal(bk.result.freezeSeconds, 60);
  const saved = JSON.parse(readFileSync(join(process.env.SYXTEE_LINK_HOME!, "config.json"), "utf8"));
  assert.equal(saved.backup.scene, "BRB");
  assert.equal(saved.token, claim.token);

  // Commande hors liste blanche : refusée par le Core, et même chose si elle atteignait l'agent.
  assert.equal((await ask("4", "RemoveScene", { sceneName: "BRB" })).error, "method_not_allowed");
  assert.ok(!obsState.calls.includes("RemoveScene"));

  b.close();
  agent.stop();
  remote.close();
  core.close();
  obsWss.close();
  obsHttp.close();
});
