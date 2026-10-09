import assert from "node:assert/strict";
import { test } from "node:test";
import { AiDirector, anthropicAsk, cleanDirector, DEFAULT_DIRECTOR, type DirectorConfig } from "../src/director.ts";

const beau = (n: number) => `${n}`.padEnd(3000, "x");

const cfg = (over: Partial<DirectorConfig> = {}): DirectorConfig => ({
  ...DEFAULT_DIRECTOR,
  enabled: true,
  apiKey: "sk-test",
  interval: 2,
  hold: 6,
  cams: [
    { source: "OSMO", scene: "Cam Osmo", label: "Osmo à la main" },
    { source: "IPHONE", scene: "Cam iPhone", label: "iPhone sur pied" },
    { source: "DRONE", scene: "Cam Drone", label: "drone" },
  ],
  ...over,
});

function setup(initial = "Live") {
  const o = { scene: initial, osmo: "", iphone: "", drone: "", answer: "{\"camera\": 1}", asked: [] as { prompt: string; n: number }[], switches: [] as string[] };
  const req = async (t: string, d?: Record<string, unknown>) => {
    if (t === "GetSourceScreenshot") {
      const img = { OSMO: o.osmo, IPHONE: o.iphone, DRONE: o.drone }[String(d?.sourceName)] ?? "";
      if (img === "") throw new Error("source absente");
      return { imageData: img };
    }
    if (t === "GetCurrentProgramScene") return { currentProgramSceneName: o.scene };
    if (t === "SetCurrentProgramScene") {
      o.scene = String(d?.sceneName);
      o.switches.push(o.scene);
    }
    return {};
  };
  const ask = async (prompt: string, images: string[]) => {
    o.asked.push({ prompt, n: images.length });
    return o.answer;
  };
  const d = new AiDirector(req, ask);
  d.setLive("Live");
  d.set(cfg());
  let n = 0;
  const frame = () => {
    o.osmo = beau(++n);
    o.iphone = beau(++n);
    o.drone = beau(++n);
  };
  return { o, d, frame };
}

test("régie IA : deux avis concordants avant de basculer, puis la caméra choisie est au programme", async () => {
  const { o, d, frame } = setup();
  o.answer = '{"camera": 2, "raison": "invité parle"}';
  frame();
  await d.tick(2000); // 1er avis
  assert.equal(o.scene, "Live");
  frame();
  await d.tick(4000); // 2e avis identique
  assert.equal(o.scene, "Cam iPhone");
  assert.equal(d.state, "cam");
  assert.equal(d.current, 1);
  // Le modèle a reçu une vignette par caméra vivante.
  assert.equal(o.asked[0].n, 3);
});

test("régie IA : durée minimale sur une caméra (anti-yoyo)", async () => {
  const { o, d, frame } = setup();
  o.answer = '{"camera": 2}';
  for (const t of [2000, 4000]) {
    frame();
    await d.tick(t);
  }
  assert.equal(o.scene, "Cam iPhone");
  o.answer = '{"camera": 1}';
  for (const t of [6000, 8000]) {
    frame();
    await d.tick(t);
  }
  // 4 s seulement depuis la bascule : on reste.
  assert.equal(o.scene, "Cam iPhone");
  for (const t of [10000, 12000]) {
    frame();
    await d.tick(t);
  }
  assert.equal(o.scene, "Cam Osmo");
});

test("régie IA : une caméra figée ou coupée n'est jamais proposée ni choisie", async () => {
  const { o, d, frame } = setup();
  o.answer = '{"camera": 3}'; // le drone est coupé : choix refusé
  o.drone = "";
  for (const t of [2000, 4000, 6000]) {
    frame();
    o.drone = "";
    await d.tick(t);
  }
  assert.equal(o.scene, "Live");
  assert.equal(o.asked[0].n, 2);
});

test("régie IA : la caméra à l'antenne meurt = bascule immédiate sur une vivante", async () => {
  const { o, d, frame } = setup();
  o.answer = '{"camera": 2}';
  for (const t of [2000, 4000]) {
    frame();
    await d.tick(t);
  }
  assert.equal(o.scene, "Cam iPhone");
  // L'iPhone se fige (même image) ; le modèle propose l'Osmo : changement tout de suite, sans attendre le délai ni un 2e avis.
  o.answer = '{"camera": 1}';
  o.osmo = beau(901);
  o.drone = beau(902);
  await d.tick(6000);
  assert.equal(o.scene, "Cam Osmo");
});

test("régie IA : une scène de caméra mise à l'antenne à la main est reprise, et bascule seule si sa caméra tombe", async () => {
  const { o, d, frame } = setup("Cam Osmo");
  o.answer = '{"camera": 2}';
  frame();
  await d.tick(2000);
  assert.equal(o.scene, "Cam Osmo"); // caméra vivante, avis de l'IA seulement 1 fois : on ne bouge pas
  // L'Osmo est coupé : image figée. Le modèle choisit l'iPhone : bascule immédiate.
  o.iphone = beau(801);
  o.drone = beau(802);
  await d.tick(4000);
  assert.equal(o.scene, "Cam iPhone");
});

test("régie IA : scène autre que Live ou la nôtre = rien ne bascule ; réponse illisible = rien ne change", async () => {
  const a = setup("Pause");
  a.o.answer = '{"camera": 2}';
  for (const t of [2000, 4000, 6000]) {
    a.frame();
    await a.d.tick(t);
  }
  assert.deepEqual(a.o.switches, []);
  const b = setup();
  b.o.answer = "je ne sais pas";
  for (const t of [2000, 4000, 6000]) {
    b.frame();
    await b.d.tick(t);
  }
  assert.deepEqual(b.o.switches, []);
});

test("régie IA : le retour manuel sur Live suspend la régie", async () => {
  const { o, d, frame } = setup();
  o.answer = '{"camera": 2}';
  for (const t of [2000, 4000]) {
    frame();
    await d.tick(t);
  }
  o.scene = "Live"; // l'utilisateur reprend la main
  for (const t of [6000, 8000, 10000, 12000]) {
    frame();
    await d.tick(t);
  }
  assert.equal(o.scene, "Live");
});

test("régie IA : fonctionne avec deux caméras seulement (Osmo + iPhone) ; une seule = inactive", async () => {
  const two = setup();
  two.d.set(cfg({ cams: cfg().cams.slice(0, 2) }));
  two.o.answer = '{"camera": 1}';
  for (const t of [2000, 4000]) {
    two.frame();
    await two.d.tick(t);
  }
  assert.equal(two.o.scene, "Cam Osmo");
  const one = setup();
  one.d.set(cfg({ cams: cfg().cams.slice(0, 1) }));
  one.frame();
  await one.d.tick(2000);
  assert.equal(one.o.asked.length, 0);
});

test("cleanDirector : bornes, clé jamais effacée par une valeur vide, clearKey l'efface", () => {
  const prev = cfg();
  assert.equal(cleanDirector({ apiKey: "" }, prev).apiKey, "sk-test");
  assert.equal(cleanDirector({ clearKey: true }, prev).apiKey, "");
  assert.equal(cleanDirector({ interval: 0 }, prev).interval, 2);
  assert.equal(cleanDirector({ hold: 9999 }, prev).hold, 120);
  assert.equal(cleanDirector({ cams: Array.from({ length: 20 }, () => ({ source: "a", scene: "b", label: "c" })) }, prev).cams.length, 6);
  assert.deepEqual(cleanDirector({ cams: [{ source: 3 }] }, prev).cams, [{ source: "", scene: "", label: "" }]);
});

test("anthropicAsk : envoie les images en base64 avec la clé, lit le texte, signale une clé refusée", async () => {
  let seen: { url: string; headers: Record<string, string>; body: any } | null = null;
  const ok = (async (url: string, init: RequestInit) => {
    seen = { url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) };
    return new Response(JSON.stringify({ content: [{ type: "text", text: '{"camera": 2}' }] }), { status: 200 });
  }) as unknown as typeof fetch;
  const text = await anthropicAsk("sk-x", "claude-haiku-5-5", ok)("quoi ?", ["data:image/jpeg;base64,AAAA"]);
  assert.equal(text, '{"camera": 2}');
  assert.equal(seen!.headers["x-api-key"], "sk-x");
  assert.equal(seen!.body.messages[0].content[0].source.data, "AAAA");
  const bad = (async () => new Response("{}", { status: 401 })) as unknown as typeof fetch;
  await assert.rejects(anthropicAsk("k", "m", bad)("q", []), /clé API refusée/);
});
