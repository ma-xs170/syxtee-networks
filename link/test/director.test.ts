import assert from "node:assert/strict";
import { test } from "node:test";
import { AiDirector, anthropicAsk, mistralAsk, ollamaAsk, cleanDirector, DEFAULT_DIRECTOR, type DirectorConfig } from "../src/director.ts";

const beau = (n: number) => `${n}`.padEnd(3000, "x");

const cfg = (over: Partial<DirectorConfig> = {}): DirectorConfig => ({
  ...DEFAULT_DIRECTOR,
  enabled: true,
  eco: false,
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
  o.answer = '{"image": 1}';
  frame();
  await d.tick(2000);
  assert.equal(o.scene, "Cam Osmo"); // caméra vivante, avis de l'IA seulement 1 fois : on ne bouge pas
  // L'Osmo est coupé : image figée. Le modèle choisit l'iPhone : bascule immédiate.
  o.iphone = beau(801);
  o.drone = beau(802);
  await d.tick(4000);
  assert.equal(o.scene, "Cam iPhone");
});

test("régie IA sans clé (gratuit) : reprend sur une caméra vivante quand celle à l'antenne tombe, ne choisit jamais seule", async () => {
  const { o, d, frame } = setup("Cam Osmo");
  d.set(cfg({ apiKey: "" }));
  frame();
  await d.tick(2000);
  assert.equal(o.scene, "Cam Osmo");
  assert.equal(o.asked.length, 0); // aucun appel à l'IA
  o.iphone = beau(701);
  o.drone = beau(702);
  await d.tick(4000);
  assert.equal(o.scene, "Cam iPhone");
});

test("régie IA sans clé : si la scène Live est la scène d'une caméra, elle compte comme caméra à l'antenne", async () => {
  const { o, d, frame } = setup("Cam Osmo");
  d.setLive("Cam Osmo");
  d.set(cfg({ apiKey: "" }));
  frame();
  await d.tick(2000);
  o.iphone = beau(711);
  o.drone = beau(712);
  await d.tick(4000);
  assert.equal(o.scene, "Cam iPhone");
});

test("mode économe : l'IA n'est pas interrogée tant que les images ne changent pas notablement, puis l'est quand elles changent", async () => {
  const { o, d, frame } = setup();
  d.set(cfg({ eco: true }));
  o.answer = '{"camera": 1}';
  for (const t of [2000, 4000, 6000, 8000]) {
    frame(); // images de taille identique : rien de notable
    await d.tick(t);
  }
  // Deux consultations pour confirmer le choix (avis en attente), puis plus rien tant que les images sont stables.
  assert.equal(o.asked.length, 2);
  assert.equal(o.scene, "Cam Osmo");
  // Une caméra change fortement (image bien plus riche) : l'IA est consultée.
  o.osmo = "z".repeat(6000);
  await d.tick(10000);
  assert.equal(o.asked.length, 3);
  // Rafraîchissement au bout de 30 s même sans changement.
  frame();
  o.osmo = "z".repeat(6000) + "1";
  await d.tick(41000);
  assert.equal(o.asked.length, 4);
});

test("mode non économe : l'IA est interrogée à chaque analyse", async () => {
  const { o, d, frame } = setup();
  d.set(cfg({ eco: false }));
  o.answer = '{"camera": 1}';
  for (const t of [2000, 4000, 6000]) {
    frame();
    await d.tick(t);
  }
  assert.equal(o.asked.length, 3);
});

test("régie IA : caméra à l'antenne tombée et réponse illisible = repli sur une caméra vivante ; seule vivante = pas de question", async () => {
  const { o, d, frame } = setup("Cam Osmo");
  o.answer = "je ne sais pas";
  frame();
  await d.tick(2000);
  assert.equal(o.scene, "Cam Osmo");
  const asked = o.asked.length;
  o.iphone = beau(901); // l'Osmo se fige
  o.drone = "";
  await d.tick(4000);
  assert.equal(o.scene, "Cam iPhone");
  assert.equal(o.asked.length, asked); // une seule caméra vivante : l'IA n'est pas interrogée
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
  await anthropicAsk("sk-x", "m", ok, "wrkspc_123")("q", []);
  assert.equal(seen!.headers["anthropic-workspace-id"], "wrkspc_123");
  const bad = (async () => new Response("{}", { status: 401 })) as unknown as typeof fetch;
  await assert.rejects(anthropicAsk("k", "m", bad)("q", []), /clé API refusée/);
  const ws = (async () => new Response(JSON.stringify({ error: { message: "This API key is not scoped to a workspace" } }), { status: 400 })) as unknown as typeof fetch;
  await assert.rejects(anthropicAsk("k", "m", ws)("q", []), /API 400 : This API key is not scoped to a workspace/);
});

test("mistralAsk : images en data URI, clé en Bearer, texte lu, erreurs lisibles", async () => {
  let seen: { url: string; headers: Record<string, string>; body: any } | null = null;
  const ok = (async (url: string, init: RequestInit) => {
    seen = { url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) };
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"camera": 2}' } }] }), { status: 200 });
  }) as unknown as typeof fetch;
  const text = await mistralAsk("mk", "mistral-small-latest", ok)("quoi ?", ["data:image/jpeg;base64,AAAA", "BBBB"]);
  assert.equal(text, '{"camera": 2}');
  assert.equal(seen!.url, "https://api.mistral.ai/v1/chat/completions");
  assert.equal(seen!.headers.authorization, "Bearer mk");
  assert.equal(seen!.body.messages[0].content[0].image_url, "data:image/jpeg;base64,AAAA");
  assert.equal(seen!.body.messages[0].content[1].image_url, "data:image/jpeg;base64,BBBB");
  const limit = (async () => new Response("{}", { status: 429 })) as unknown as typeof fetch;
  await assert.rejects(mistralAsk("k", "m", limit)("q", []), /limite de requêtes/);
  const bad = (async () => new Response(JSON.stringify({ message: "Unknown model" }), { status: 400 })) as unknown as typeof fetch;
  await assert.rejects(mistralAsk("k", "m", bad)("q", []), /API 400 : Unknown model/);
});

test("cleanDirector : fournisseur Mistral par défaut, valeur inconnue ignorée", () => {
  assert.equal(cleanDirector(undefined).provider, "mistral");
  assert.equal(cleanDirector({ provider: "anthropic" }).provider, "anthropic");
  assert.equal(cleanDirector({ provider: "x" }, { ...DEFAULT_DIRECTOR, provider: "anthropic" }).provider, "anthropic");
});

test("ollamaAsk : appel local sans clé, images en base64 brut, erreurs lisibles", async () => {
  let seen: { url: string; body: any } | null = null;
  const ok = (async (url: string, init: RequestInit) => {
    seen = { url, body: JSON.parse(String(init.body)) };
    return new Response(JSON.stringify({ message: { content: '{"camera": 1}' } }), { status: 200 });
  }) as unknown as typeof fetch;
  assert.equal(await ollamaAsk("gemma3:4b", ok)("quoi ?", ["data:image/jpeg;base64,AAAA"]), '{"camera": 1}');
  assert.equal(seen!.url, "http://127.0.0.1:11434/api/chat");
  assert.deepEqual(seen!.body.messages[0].images, ["AAAA"]);
  assert.equal(seen!.body.stream, false);
  const down = (async () => {
    throw new TypeError("fetch failed");
  }) as unknown as typeof fetch;
  await assert.rejects(ollamaAsk("m", down)("q", []), /Ollama ne répond pas/);
  const missing = (async () => new Response("{}", { status: 404 })) as unknown as typeof fetch;
  await assert.rejects(ollamaAsk("gemma3:4b", missing)("q", []), /ollama pull gemma3:4b/);
});

test("régie IA locale : sans clé, la décision passe par le modèle de ce PC (pas par le mode de reprise seule)", async () => {
  const { o, d, frame } = setup();
  d.set(cfg({ apiKey: "", provider: "local" }));
  o.answer = '{"camera": 2}';
  for (const t of [2000, 4000]) {
    frame();
    await d.tick(t);
  }
  assert.equal(o.scene, "Cam iPhone");
  assert.ok(o.asked.length >= 2);
});
