# Commutateur : diffusion YouTube / Twitch / Kick et chat incrusté : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Diffuser le programme du Commutateur vers YouTube, Twitch et Kick en copy vidéo (zéro réencodage), avec le chat dessiné en haut à gauche de l'image.

**Architecture:** Le Core a déjà `core/src/studio.ts` (session WHIP `stu_<hex>`, ffmpeg vers RTMP, anti-SSRF, clés jamais loguées). On y ajoute un mode `copy` (un ffmpeg par destination : `-c:v copy`, audio AAC), l'état par destination et la mise à jour des destinations en cours de session. Les clés collées par l'utilisateur sont chiffrées en base côté Next (même AES-GCM que le chat) ; au Go live, une server action les déchiffre pour le navigateur du propriétaire, qui ouvre la session du Core comme aujourd'hui. Le chat est une fonction de dessin canvas pure, alimentée par `MultiChat`.

**Tech Stack:** Core : Node 24, Fastify, zod, `node:test`. Site : Next.js (lire `node_modules/next/dist/docs/` avant d'écrire du code Next, conformément à `AGENTS.md`), Supabase, `node:test` via `npm run test:unit`.

**Spec:** `docs/superpowers/specs/2026-10-06-commutateur-diffusion-design.md` (corrigée par la Tâche 0).

## Global Constraints

- Vidéo en copy : `-c:v copy`, jamais `libx264` dans le mode `copy`. Audio converti : `-c:a aac -b:a 160k -ar 48000 -ac 2`.
- Une sortie qui échoue n'arrête pas les autres. Maximum 3 destinations par session (YouTube, Twitch, Kick), noms uniques.
- La clé de stream n'apparaît jamais dans les logs, ni dans une réponse d'API (liste masquée : `••••` + 4 derniers caractères).
- Anti-SSRF existant (`checkDestination`) inchangé : `rtmp(s)://` vers IP publique seulement.
- Charte SYXTEE : tokens (`--background`, `--surface`, `--foreground`, `--accent`, `--on-accent`), jamais `text-white`/`bg-black`/`#000`/`#fff` sauf surface vidéo ; `font-mono` pour les libellés techniques ; `--live` (`bg-live`) réservé à l'état EN LIVE ; Go live en `bg-accent text-on-accent` ; `min-h-dvh` ; `prefers-reduced-motion` respecté ; pas de `window.addEventListener('scroll')`.
- Migrations appliquées à la main par l'utilisateur (SQL Editor) : copier le SQL avec `pbcopy`, une étape à la fois.
- Après chaque tâche : `npx tsc --noEmit` (racine) ou `npm --prefix core run typecheck`, puis commit + push `main`.
- Hors périmètre : le **lot A** (pipeline Mix réel : sources WHEP → canvas → `MediaStream` du programme). Ce plan expose un `program: MediaStream | null` ; sans lui, le bouton Go live est désactivé avec « Programme non publié ». Le lot A aura son propre plan.

## Review Focus

- Deux destinations de même nom (ou même plateforme deux fois) : refusées, pas écrasées en silence (Tâche 1).
- Mise à jour des destinations sans session ouverte, ou avec une liste vide : erreur claire, pas de plantage (Tâches 1-2).
- Clé avec espace, `/`, retour ligne ou vide ; URL sans schéma ; URL de plus de 600 caractères : refusées avant tout envoi (Tâche 3).
- Message de chat très long, sans espaces, vide, ou emoji seul : pas de débordement ni de ligne vide (Tâche 5).
- Navigateur fermé pendant le direct : sorties coupées, aucune relance sans pilote (comportement `drop` existant, vérifié Tâche 1).
- Erreur ffmpeg contenant l'adresse RTMP : jamais copiée dans `error` ni dans les logs (Tâche 1).

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `core/src/supervisor.ts` (modif) | `hooks` optionnels `onStart` / `onExit` |
| `core/src/studio.ts` (modif) | mode `copy`, sorties par destination, `setDestinations`, `outputState`, `errorKind` |
| `core/src/server.ts` (modif) | `mode` dans la session, `PUT /v1/me/studio/destinations`, `outputs` dans le statut |
| `core/test/studio.test.ts` (modif) | tests Core |
| `supabase/migrations/0042_mix_outputs.sql` | table des destinations chiffrées |
| `src/lib/mix-outputs-shared.ts` + `.test.ts` | plateformes, URL par défaut, `joinDestination`, `maskKey` (pur, sans `server-only`) |
| `src/app/(studio)/commutateur/outputs.ts` | server actions : enregistrer, supprimer, lister (masqué), `destinationsFor` |
| `src/components/mix/chat-overlay.ts` + `.test.ts` | mise en page et dessin canvas du chat |
| `src/components/dashboard/MultiChat.tsx` (modif) | prop `onMessages` |
| `src/components/mix/OutputsPanel.tsx` | panneau Diffusion |
| `src/components/mix/MixApp.tsx` (modif) | tiroir « Diffusion », chat caché qui alimente l'overlay |

---

### Task 0: Corriger la spec

**Files:**
- Modify: `docs/superpowers/specs/2026-10-06-commutateur-diffusion-design.md`

- [ ] **Step 1: Remplacer la section « Core (`core/src/mix-out.ts`) »**

Remplacer son contenu par :

```markdown
### 2. Core (`core/src/studio.ts`, existant, étendu)

Le module Studio fait déjà : session WHIP `stu_<hex>`, ffmpeg RTSP local → RTMP, anti-SSRF, aucune clé dans les logs. On ajoute :

- mode `copy` (défaut) : un ffmpeg **par destination**, `-c:v copy -c:a aac -b:a 160k`. L'ancien mode `encode` (x264, un seul ffmpeg en tee) reste disponible comme repli si les images clés de Chrome sont trop espacées ;
- `PUT /v1/me/studio/destinations` : remplace la liste des destinations d'une session ouverte (mode `copy`) ; les ffmpeg de destinations retirées s'arrêtent, les nouvelles démarrent, les autres ne sont pas touchées ;
- `GET /v1/me/studio/status` : ajoute `outputs: [{ name, state: "connecting" | "live" | "retrying", error: "refused" | "unreachable" | "failed" | null }]`.

Le Core ne stocke aucune clé : le navigateur les envoie à l'ouverture de session, comme aujourd'hui. Le chiffrement en base est côté Next (`mix_outputs`, `CHAT_TOKEN_KEY`) ; une server action déchiffre pour le propriétaire seulement.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-10-06-commutateur-diffusion-design.md docs/superpowers/plans/2026-10-06-commutateur-diffusion.md
git commit -m "Plan Commutateur diffusion ; spec alignée sur studio.ts existant

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Core : mode copy, une sortie par destination

**Files:**
- Modify: `core/src/supervisor.ts`
- Modify: `core/src/studio.ts`
- Test: `core/test/studio.test.ts`

**Interfaces:**
- Consumes: `supervise(name, cmd, args, log, env?)` existant.
- Produces:
  - `supervise(name, cmd, args, log, env?, hooks?: { onStart?: () => void; onExit?: (tail: string) => void }): Supervised`
  - `export type Mode = "copy" | "encode"`
  - `export type ErrorKind = "refused" | "unreachable" | "failed"`
  - `export function errorKind(tail: string): ErrorKind`
  - `export function copyArgs(rtspUrl: string, path: string, url: string): string[]`
  - `export function outputState(o: { running: boolean; startedAt: number; now: number }): "connecting" | "live" | "retrying"`
  - `createStudio(...).open(userId, destinations, bitrateKbps, mode?: Mode)` ; `.setDestinations(userId, destinations): Promise<{ error: string } | { ok: true }>` ; `.status(userId)` renvoie en plus `outputs`.

- [ ] **Step 1: Écrire les tests qui échouent** (ajouter à `core/test/studio.test.ts`, et ajouter `copyArgs, errorKind, outputState` à l'import existant)

```ts
test("copy : vidéo copiée, jamais x264, audio AAC, une URL", () => {
  const a = copyArgs("rtsp://127.0.0.1:8554", "stu_" + "a".repeat(32), "rtmp://a/app/k1");
  const s = a.join(" ");
  assert.ok(s.includes("-c:v copy"));
  assert.ok(!s.includes("libx264"));
  assert.ok(s.includes("-c:a aac -b:a 160k -ar 48000 -ac 2"));
  assert.equal(a[a.length - 1], "rtmp://a/app/k1");
  assert.equal(a[a.length - 2], "flv");
});

test("errorKind : classe l'erreur sans citer l'adresse", () => {
  assert.equal(errorKind("rtmp://live.twitch.tv/app/live_SECRET: Server returned 403 Forbidden"), "refused");
  assert.equal(errorKind("Handshake failed"), "refused");
  assert.equal(errorKind("Connection refused"), "unreachable");
  assert.equal(errorKind("Connection timed out"), "unreachable");
  assert.equal(errorKind("Name or service not known"), "unreachable");
  assert.equal(errorKind("autre chose"), "failed");
  assert.equal(errorKind(""), "failed");
});

test("outputState : connexion 3 s, puis live ; arrêté = retrying", () => {
  assert.equal(outputState({ running: true, startedAt: 1000, now: 2000 }), "connecting");
  assert.equal(outputState({ running: true, startedAt: 1000, now: 4001 }), "live");
  assert.equal(outputState({ running: false, startedAt: 1000, now: 9000 }), "retrying");
});

test("session copy : noms uniques, setDestinations exige une session, liste vide refusée", async () => {
  const { studio } = setup();
  studio.setUsers(new Set([U]));
  const T = { name: "Twitch", url: "rtmp://live.twitch.tv/app/k" };
  assert.deepEqual(await studio.open(U, [T, { name: "Twitch", url: "rtmp://a.rtmp.youtube.com/live2/k" }], 4500, "copy"), { error: "destinations" });
  assert.deepEqual(await studio.setDestinations(U, [T]), { error: "no_session" });
  const s = await studio.open(U, [T], 4500, "copy");
  assert.ok("path" in s);
  assert.deepEqual(await studio.setDestinations(U, []), { error: "destinations" });
  assert.deepEqual(await studio.setDestinations(U, [{ name: "X", url: "rtmp://127.0.0.1/app/k" }]), { error: "host_private" });
  assert.deepEqual(await studio.setDestinations(U, [T, { name: "YouTube", url: "rtmp://a.rtmp.youtube.com/live2/k2" }]), { ok: true });
  assert.deepEqual(studio.status(U).destinations, ["Twitch", "YouTube"]);
  studio.stopAll();
});

test("session copy : une sortie par destination, états, aucune clé dans les logs", async () => {
  const { studio, logs, setReady } = setup();
  studio.setUsers(new Set([U]));
  const s = await studio.open(U, [{ name: "T", url: "rtmp://live.twitch.tv/app/live_SECRETKEY" }], 4500, "copy");
  assert.ok("path" in s);
  setReady(["path" in s ? s.path : ""]);
  await studio.sync();
  const st = studio.status(U);
  assert.equal(st.state, "live");
  assert.equal(st.outputs.length, 1);
  assert.equal(st.outputs[0].name, "T");
  assert.ok(["connecting", "live", "retrying"].includes(st.outputs[0].state));
  assert.ok(!JSON.stringify(st).includes("SECRETKEY"));
  assert.ok(!logs.some((l) => l.includes("SECRETKEY")));
  setReady([]);
  await studio.sync(); // navigateur parti : session fermée, aucune relance
  assert.equal(studio.status(U).state, "idle");
  studio.stopAll();
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npm --prefix core test -- 2>&1 | tail -30` (ou `cd core && node --experimental-strip-types --test test/studio.test.ts`)
Expected: FAIL (`copyArgs` / `errorKind` / `outputState` non exportés).

- [ ] **Step 3: `supervisor.ts` : hooks**

Remplacer la signature et le corps de `start` :

```ts
export type Hooks = { onStart?: () => void; onExit?: (tail: string) => void };

export function supervise(name: string, cmd: string, args: string[], log: (msg: string) => void, env?: NodeJS.ProcessEnv, hooks?: Hooks): Supervised {
```

Dans `start`, juste après `const startedAt = Date.now();` ajouter `hooks?.onStart?.();`. Dans le handler `exit`, après `if (stopped) return;` ajouter `hooks?.onExit?.(tail);`.

- [ ] **Step 4: `studio.ts` : types et fonctions pures** (sous `studioArgs`)

```ts
export type Mode = "copy" | "encode";
export type ErrorKind = "refused" | "unreachable" | "failed";

/** Classe la fin d'un ffmpeg sans jamais garder son texte (il peut citer l'adresse, donc la clé de stream). */
export function errorKind(tail: string): ErrorKind {
  const t = tail.toLowerCase();
  if (/403|401|forbidden|unauthorized|handshake|denied|invalid.*key|stream key/.test(t)) return "refused";
  if (/refused|timed out|timeout|not known|unreachable|no route|resolve|name or service/.test(t)) return "unreachable";
  return "failed";
}

/** ffmpeg d'une destination en copy : vidéo recopiée telle quelle, son Opus converti en AAC (exigé par les plateformes). */
export function copyArgs(rtspUrl: string, path: string, url: string) {
  return [
    "-hide_banner", "-loglevel", "error",
    "-rtsp_transport", "tcp",
    "-i", `${rtspUrl}/${path}`,
    "-map", "0:v:0", "-map", "0:a:0?",
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2",
    "-f", "flv", url,
  ];
}

const CONNECT_MS = 3000;
export function outputState(o: { running: boolean; startedAt: number; now: number }): "connecting" | "live" | "retrying" {
  if (!o.running) return "retrying";
  return o.now - o.startedAt > CONNECT_MS ? "live" : "connecting";
}
```

- [ ] **Step 5: `studio.ts` : session et sync**

Changer le type `Session` :

```ts
type Output = { dest: Destination; proc?: Supervised; startedAt: number; error?: ErrorKind };
type Session = { userId: string; mode: Mode; destinations: Destination[]; bitrateKbps: number; createdAt: number; proc?: Supervised; startedAt?: number; outputs: Map<string, Output> };
```

Ajouter dans `createStudio`, après `drop` :

```ts
  const stopOutputs = (s: Session) => {
    for (const out of s.outputs.values()) out.proc?.stop();
    s.outputs.clear();
  };

  /** Mode copy : aligne les ffmpeg sur la liste de destinations (arrête les retirées, démarre les nouvelles). */
  const reconcile = (path: string, s: Session) => {
    const want = new Map(s.destinations.map((d) => [d.name, d]));
    for (const [name, out] of s.outputs) {
      const w = want.get(name);
      if (!w || w.url !== out.dest.url) {
        out.proc?.stop();
        s.outputs.delete(name);
      }
    }
    for (const d of s.destinations) {
      if (s.outputs.has(d.name)) continue;
      const out: Output = { dest: d, startedAt: now() };
      out.proc = supervise(`studio ${s.userId.slice(0, 8)} ${d.name}`, "ffmpeg", copyArgs(o.rtspUrl, path, d.url), slog, undefined, {
        onStart: () => (out.startedAt = now()),
        onExit: (tail) => (out.error = errorKind(tail)),
      });
      s.outputs.set(d.name, out);
    }
  };
```

Dans `drop`, remplacer `s.proc?.stop();` par `s.proc?.stop(); stopOutputs(s);`.

Dans `open`, nouvelle signature `open(userId, destinations, bitrateKbps, mode: Mode = "copy")`, valider l'unicité après la vérification de longueur :

```ts
      if (new Set(destinations.map((d) => d.name)).size !== destinations.length) return { error: "destinations" };
```

et créer la session avec `{ userId, mode, destinations, bitrateKbps, createdAt: now(), outputs: new Map() }`.

Ajouter la méthode :

```ts
    /** Remplace les destinations d'une session ouverte en mode copy ; les sorties inchangées ne sont pas touchées. */
    async setDestinations(userId: string, destinations: Destination[]): Promise<{ error: string } | { ok: true }> {
      const path = byUser.get(userId);
      const s = path ? sessions.get(path) : undefined;
      if (!path || !s) return { error: "no_session" };
      if (s.mode !== "copy") return { error: "mode" };
      if (destinations.length === 0 || destinations.length > MAX_DESTINATIONS) return { error: "destinations" };
      if (new Set(destinations.map((d) => d.name)).size !== destinations.length) return { error: "destinations" };
      for (const d of destinations) {
        const err = await checkDestination(d, o.resolve);
        if (err) return { error: err };
      }
      s.destinations = destinations;
      if (s.startedAt) reconcile(path, s); // programme déjà publié : applique tout de suite
      return { ok: true };
    },
```

`status` : remplacer par

```ts
    status(userId: string) {
      const path = byUser.get(userId);
      const s = path ? sessions.get(path) : undefined;
      if (!s) return { state: "idle" as const, destinations: [] as string[], outputs: [] as { name: string; state: "connecting" | "live" | "retrying"; error: ErrorKind | null }[] };
      const outputs = [...s.outputs.values()].map((out) => {
        const state = outputState({ running: out.proc?.running() ?? false, startedAt: out.startedAt, now: now() });
        return { name: out.dest.name, state, error: state === "live" ? null : (out.error ?? null) };
      });
      const up = s.mode === "copy" ? s.startedAt !== undefined : !!s.proc;
      return { state: up ? ("live" as const) : ("waiting" as const), since: s.startedAt ?? null, destinations: s.destinations.map((d) => d.name), outputs };
    },
```

`sync` : dans la boucle `for (const [path, s] of sessions)`, remplacer les trois branches par :

```ts
        const up = ready.includes(path);
        const running = s.mode === "copy" ? s.startedAt !== undefined : !!s.proc;
        if (running && !up) {
          s.proc?.stop();
          stopOutputs(s);
          o.log(`studio ${s.userId.slice(0, 8)} : publication arrêtée`);
          drop(path); // le navigateur est parti : session fermée, aucune relance sans pilote
        } else if (!running && up) {
          if (s.mode === "copy") reconcile(path, s);
          else s.proc = supervise(`studio ${s.userId.slice(0, 8)}`, "ffmpeg", studioArgs(o.rtspUrl, path, s.destinations.map((d) => d.url), s.bitrateKbps), slog);
          s.startedAt = now();
          o.log(`studio ${s.userId.slice(0, 8)} en direct → ${s.destinations.length} destination(s) (${s.mode})`);
        } else if (!running && now() - s.createdAt > WAIT_MS) {
          drop(path);
        }
```

Dans les tests existants, `studio.open(U, [...], 4500)` passe maintenant par `copy` par défaut : le test existant « sync : démarre à la publication… » reste valide (état `live` via `startedAt`). Si un test existant affirme `proc`, l'adapter.

- [ ] **Step 6: Lancer**

Run: `cd core && node --experimental-strip-types --test test/studio.test.ts && npm run typecheck`
Expected: PASS, typecheck sans erreur.

- [ ] **Step 7: Commit**

```bash
git add core/src/supervisor.ts core/src/studio.ts core/test/studio.test.ts
git commit -m "Core studio : mode copy (vidéo recopiée, une sortie par destination), états et destinations modifiables

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Core : routes

**Files:**
- Modify: `core/src/server.ts:948-972`
- Test: `core/test/server.test.ts` (ajouter un cas ; reprendre le montage existant de ce fichier pour construire l'app avec un `studio` factice)

**Interfaces:**
- Consumes: `studio.open(userId, destinations, bitrateKbps, mode)`, `studio.setDestinations(userId, destinations)` (Tâche 1).
- Produces: `POST /v1/me/studio/session` accepte `mode` (`"copy" | "encode"`, défaut `"copy"`) ; `PUT /v1/me/studio/destinations` `{ destinations }` → `{ ok: true }` ou `{ error }` (400, 404 si pas de session) ; `GET …/status` ajoute `outputs`.

- [ ] **Step 1: Test qui échoue** : dans `core/test/server.test.ts`, suivre le style du fichier (même `buildServer`, même jeton utilisateur de test) : appeler `PUT /v1/me/studio/destinations` sans session et attendre `404` + `{ error: "no_session" }` ; avec corps invalide (`destinations: []`) attendre `400`.

- [ ] **Step 2: Lancer, vérifier l'échec** : `cd core && node --experimental-strip-types --test test/server.test.ts` → FAIL (route absente, 404 sans corps attendu).

- [ ] **Step 3: Implémenter** : dans `server.ts`, étendre `body` :

```ts
      mode: z.enum(["copy", "encode"]).default("copy"),
```

appeler `studio.open(id, p.data.destinations, p.data.bitrate_kbps, p.data.mode)`, et ajouter après la route `status` :

```ts
    app.put("/v1/me/studio/destinations", async (req, reply) => {
      const id = await userId(req, reply);
      if (!id) return;
      const p = z.object({ destinations: body.shape.destinations }).safeParse(req.body);
      if (!p.success) return reply.code(400).send({ error: "invalid" });
      const r = await studio.setDestinations(id, p.data.destinations);
      if ("error" in r) return reply.code(r.error === "no_session" ? 404 : r.error === "mode" ? 409 : 400).send({ error: r.error });
      return r;
    });
```

- [ ] **Step 4: Lancer** : `cd core && npm test && npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add core/src/server.ts core/test/server.test.ts
git commit -m "Core : PUT /v1/me/studio/destinations et mode de session

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Données : migration et fonctions partagées

**Files:**
- Create: `supabase/migrations/0042_mix_outputs.sql`
- Create: `src/lib/mix-outputs-shared.ts`
- Test: `src/lib/mix-outputs-shared.test.ts`

**Interfaces:**
- Produces:
  - `export const PLATFORMS = ["youtube", "twitch", "kick"] as const; export type Platform = (typeof PLATFORMS)[number]`
  - `export const PLATFORM_LABEL: Record<Platform, string>` (`YouTube`, `Twitch`, `Kick`)
  - `export const DEFAULT_URL: Record<Platform, string>`
  - `export const isPlatform = (s: unknown): s is Platform`
  - `export function joinDestination(url: string, key: string): string | null`
  - `export function maskKey(key: string): string`

- [ ] **Step 1: Test qui échoue** (`src/lib/mix-outputs-shared.test.ts`)

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_URL, isPlatform, joinDestination, maskKey } from "./mix-outputs-shared.ts";

test("joinDestination : rtmp(s) + clé, barres finales retirées", () => {
  assert.equal(joinDestination("rtmp://live.twitch.tv/app/", "live_abc"), "rtmp://live.twitch.tv/app/live_abc");
  assert.equal(joinDestination("  rtmps://x.example:443/app  ", " k1 "), "rtmps://x.example:443/app/k1");
});

test("joinDestination : refuse l'invalide", () => {
  assert.equal(joinDestination("http://live.twitch.tv/app", "k"), null);
  assert.equal(joinDestination("live.twitch.tv/app", "k"), null);
  assert.equal(joinDestination("rtmp://a/app", ""), null);
  assert.equal(joinDestination("rtmp://a/app", "a b"), null);
  assert.equal(joinDestination("rtmp://a/app", "a/b"), null);
  assert.equal(joinDestination("rtmp://a/app", "a\nb"), null);
  assert.equal(joinDestination("rtmp://a/app b", "k"), null);
  assert.equal(joinDestination("rtmp://a/" + "x".repeat(600), "k"), null);
});

test("maskKey : jamais la clé entière", () => {
  assert.equal(maskKey("live_abcdef1234"), "••••1234");
  assert.equal(maskKey("abc"), "••••");
  assert.ok(!maskKey("live_abcdef1234").includes("abcdef"));
});

test("plateformes", () => {
  assert.equal(isPlatform("twitch"), true);
  assert.equal(isPlatform("tiktok"), false);
  assert.equal(DEFAULT_URL.twitch, "rtmp://live.twitch.tv/app");
  assert.equal(DEFAULT_URL.kick, "");
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `node --experimental-strip-types --test src/lib/mix-outputs-shared.test.ts`
Expected: FAIL (module absent).

- [ ] **Step 3: Implémenter** (`src/lib/mix-outputs-shared.ts`)

```ts
// Destinations de diffusion du Commutateur : fonctions pures partagées (serveur, navigateur, tests).

export const PLATFORMS = ["youtube", "twitch", "kick"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const PLATFORM_LABEL: Record<Platform, string> = { youtube: "YouTube", twitch: "Twitch", kick: "Kick" };
// Kick : l'adresse d'ingestion dépend du compte (dashboard Kick), à coller.
export const DEFAULT_URL: Record<Platform, string> = { youtube: "rtmp://a.rtmp.youtube.com/live2", twitch: "rtmp://live.twitch.tv/app", kick: "" };

export const isPlatform = (s: unknown): s is Platform => typeof s === "string" && (PLATFORMS as readonly string[]).includes(s);

const MAX_URL = 600; // même limite que le Core

/** Adresse RTMP complète (adresse + clé), ou null si l'adresse ou la clé est invalide. */
export function joinDestination(url: string, key: string): string | null {
  const u = url.trim().replace(/\/+$/, "");
  const k = key.trim();
  if (!/^rtmps?:\/\/[^\s]+$/i.test(u)) return null;
  if (!k || /[\s/]/.test(k)) return null;
  const full = `${u}/${k}`;
  return full.length > MAX_URL ? null : full;
}

export function maskKey(key: string): string {
  return key.length > 4 ? `••••${key.slice(-4)}` : "••••";
}
```

- [ ] **Step 4: Lancer** : même commande → PASS.

- [ ] **Step 5: Migration** (`supabase/migrations/0042_mix_outputs.sql`)

```sql
-- Destinations de diffusion du commutateur (YouTube, Twitch, Kick). La clé de stream est chiffrée côté serveur (AES-GCM).
create table if not exists public.mix_outputs (
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('youtube', 'twitch', 'kick')),
  url text not null check (char_length(url) <= 300),
  key_enc text not null,
  key_hint text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, platform)
);

alter table public.mix_outputs enable row level security;

create policy "Diffusion MIX : lire les siennes" on public.mix_outputs for select to authenticated using ((select auth.uid()) = user_id);
create policy "Diffusion MIX : créer les siennes" on public.mix_outputs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Diffusion MIX : modifier les siennes" on public.mix_outputs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Diffusion MIX : supprimer les siennes" on public.mix_outputs for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.mix_outputs to authenticated;
```

- [ ] **Step 6: Commit** (puis donner le SQL à l'utilisateur : `pbcopy < supabase/migrations/0042_mix_outputs.sql`, il l'applique dans le SQL Editor)

```bash
git add supabase/migrations/0042_mix_outputs.sql src/lib/mix-outputs-shared.ts src/lib/mix-outputs-shared.test.ts
git commit -m "Commutateur : table mix_outputs (0042) et validation des destinations

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Server actions des destinations

**Files:**
- Create: `src/app/(studio)/commutateur/outputs.ts`

**Interfaces:**
- Consumes: `encrypt`, `decrypt`, `hasChatKey` (`src/lib/chat/crypto.ts`) ; `joinDestination`, `maskKey`, `isPlatform`, `PLATFORM_LABEL`, `DEFAULT_URL`, `Platform` (Tâche 3) ; `requireUser`, `allow`, `getPlan`, `can`, `createClient` comme dans `actions.ts` voisin.
- Produces:
  - `export type OutputView = { platform: Platform; url: string; hint: string }`
  - `listOutputs(): Promise<OutputView[]>`
  - `saveOutput(platform: string, url: string, key: string): Promise<{ ok: boolean; error?: string }>`
  - `removeOutput(platform: string): Promise<{ ok: boolean }>`
  - `destinationsFor(platforms: string[]): Promise<{ ok: true; destinations: { name: string; url: string }[] } | { ok: false; error: string }>`

- [ ] **Step 1: Lire** `src/app/(studio)/commutateur/actions.ts` (déjà lu : même garde `requireUser` + `can(await getPlan(), "commutateur")` + `allow(clé, n, secondes)`). Suivre ce modèle.

- [ ] **Step 2: Écrire** `src/app/(studio)/commutateur/outputs.ts`

```ts
"use server";

import { requireUser } from "@/lib/auth/dal";
import { allow } from "@/lib/auth/rateLimit";
import { getPlan } from "@/lib/auth/plan";
import { decrypt, encrypt, hasChatKey } from "@/lib/chat/crypto";
import { DEFAULT_URL, PLATFORM_LABEL, isPlatform, joinDestination, maskKey, type Platform } from "@/lib/mix-outputs-shared";
import { can } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

// Destinations de diffusion du commutateur. La clé de stream est chiffrée en base ; elle ne revient au navigateur qu'au
// moment d'un Go live, et seulement au propriétaire (destinationsFor).

export type OutputView = { platform: Platform; url: string; hint: string };

async function guard() {
  const user = await requireUser("/commutateur");
  if (!can(await getPlan(), "commutateur")) return null;
  return user;
}

export async function listOutputs(): Promise<OutputView[]> {
  const user = await guard();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("mix_outputs").select("platform,url,key_hint").eq("user_id", user.id);
  return (data ?? []).filter((r) => isPlatform(r.platform)).map((r) => ({ platform: r.platform as Platform, url: r.url as string, hint: r.key_hint as string }));
}

export async function saveOutput(platform: string, url: string, key: string): Promise<{ ok: boolean; error?: string }> {
  const user = await guard();
  if (!user) return { ok: false, error: "plan" };
  if (!isPlatform(platform)) return { ok: false, error: "platform" };
  if (!hasChatKey) return { ok: false, error: "no_key" };
  if (!(await allow(`mixout:${user.id}`, 20, 60))) return { ok: false, error: "rate" };
  const address = url.trim() || DEFAULT_URL[platform];
  if (!joinDestination(address, key)) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.from("mix_outputs").upsert({ user_id: user.id, platform, url: address.trim().replace(/\/+$/, ""), key_enc: encrypt(key.trim()), key_hint: maskKey(key.trim()), updated_at: new Date().toISOString() });
  return error ? { ok: false, error: "db" } : { ok: true };
}

export async function removeOutput(platform: string): Promise<{ ok: boolean }> {
  const user = await guard();
  if (!user || !isPlatform(platform)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("mix_outputs").delete().eq("user_id", user.id).eq("platform", platform);
  return { ok: !error };
}

/** Adresses RTMP complètes des plateformes demandées, pour ouvrir la session du Core. Une plateforme sans clé enregistrée est refusée. */
export async function destinationsFor(platforms: string[]): Promise<{ ok: true; destinations: { name: string; url: string }[] } | { ok: false; error: string }> {
  const user = await guard();
  if (!user) return { ok: false, error: "plan" };
  const wanted = [...new Set(platforms)].filter(isPlatform);
  if (wanted.length === 0 || wanted.length > 3) return { ok: false, error: "invalid" };
  if (!(await allow(`mixgolive:${user.id}`, 30, 60))) return { ok: false, error: "rate" };
  const supabase = await createClient();
  const { data } = await supabase.from("mix_outputs").select("platform,url,key_enc").eq("user_id", user.id).in("platform", wanted);
  const rows = new Map((data ?? []).map((r) => [r.platform as string, r]));
  const destinations: { name: string; url: string }[] = [];
  for (const p of wanted) {
    const r = rows.get(p);
    if (!r) return { ok: false, error: `missing:${p}` };
    let full: string | null = null;
    try {
      full = joinDestination(r.url as string, decrypt(r.key_enc as string));
    } catch {
      return { ok: false, error: `unreadable:${p}` }; // CHAT_TOKEN_KEY changée : la clé est à ressaisir
    }
    if (!full) return { ok: false, error: `invalid:${p}` };
    destinations.push({ name: PLATFORM_LABEL[p], url: full });
  }
  return { ok: true, destinations };
}
```

- [ ] **Step 3: Vérifier** : `npx tsc --noEmit` → aucune erreur (corriger les chemins d'import si `rateLimit`/`plan`/`dal` diffèrent : ils sont identiques à `actions.ts`).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(studio)/commutateur/outputs.ts"
git commit -m "Commutateur : server actions des destinations (clés chiffrées)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Chat incrusté : mise en page et dessin

**Files:**
- Create: `src/components/mix/chat-overlay.ts`
- Test: `src/components/mix/chat-overlay.test.ts`

**Interfaces:**
- Produces:
  - `export type ChatMsg = { id: string; platform: "twitch" | "kick" | "youtube"; user: string; color: string | null; text: string }`
  - `export type ChatLine = { platform: ChatMsg["platform"]; user: string | null; color: string | null; text: string }`
  - `export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[]`
  - `export function layoutChat(msgs: ChatMsg[], o: { maxWidth: number; maxLines: number }, measure: (s: string) => number): ChatLine[]`
  - `export type ChatOverlayOpts = { enabled: boolean; platforms: ReadonlySet<ChatMsg["platform"]>; scale: number; opacity: number }`
  - `export const DEFAULT_CHAT_OVERLAY: ChatOverlayOpts`
  - `export function drawChatOverlay(ctx: CanvasRenderingContext2D, msgs: ChatMsg[], o: ChatOverlayOpts, canvasWidth: number): void` (appelée par la boucle `requestAnimationFrame` du lot A, après les sources)

- [ ] **Step 1: Test qui échoue** (`chat-overlay.test.ts`; `measure = (s) => s.length * 10`)

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutChat, wrapText, type ChatMsg } from "./chat-overlay.ts";

const m = (s: string) => s.length * 10;
const msg = (id: string, user: string, text: string, platform: ChatMsg["platform"] = "twitch"): ChatMsg => ({ id, platform, user, color: null, text });

test("wrapText : coupe aux mots", () => {
  assert.deepEqual(wrapText("aaaa bbbb cc", 90, m), ["aaaa bbbb", "cc"]);
  assert.deepEqual(wrapText("", 90, m), []);
  assert.deepEqual(wrapText("   ", 90, m), []);
});

test("wrapText : mot plus long que la largeur coupé en morceaux", () => {
  assert.deepEqual(wrapText("abcdefghijkl", 50, m), ["abcde", "fghij", "kl"]);
  for (const l of wrapText("x".repeat(500), 80, m)) assert.ok(m(l) <= 80);
});

test("layoutChat : pseudo sur la première ligne seulement, les plus récents gardés", () => {
  const lines = layoutChat([msg("1", "ana", "salut tout le monde ici"), msg("2", "bob", "ok")], { maxWidth: 120, maxLines: 10 }, m);
  assert.equal(lines.find((l) => l.text === "ok")?.user, "bob");
  assert.equal(lines.filter((l) => l.user === "ana").length, 1);
  const few = layoutChat([msg("1", "a", "un deux trois quatre cinq six sept"), msg("2", "b", "fin")], { maxWidth: 80, maxLines: 2 }, m);
  assert.equal(few.length, 2);
  assert.equal(few[few.length - 1].text, "fin");
});

test("layoutChat : message vide ignoré, texte sans pseudo ne plante pas", () => {
  assert.deepEqual(layoutChat([msg("1", "x", "")], { maxWidth: 100, maxLines: 5 }, m), []);
  assert.equal(layoutChat([msg("1", "", "bonjour")], { maxWidth: 200, maxLines: 5 }, m).length, 1);
});
```

- [ ] **Step 2: Lancer, vérifier l'échec** : `node --experimental-strip-types --test src/components/mix/chat-overlay.test.ts` → FAIL.

- [ ] **Step 3: Implémenter** (`chat-overlay.ts`)

Le pseudo occupe de la largeur sur sa ligne : `layoutChat` le mesure avec `measure(user + " ")` et réduit la largeur de la 1re ligne ; pour rester simple et testable, la 1re ligne est coupée avec `maxWidth - measure(user + " ")` (minimum 1 caractère).

```ts
// Chat incrusté dans l'image du programme (haut gauche). Mise en page pure, testée sans canvas ; le dessin utilise le contexte 2D
// du canvas du programme (appelé dans sa boucle requestAnimationFrame, après les sources, sans état React).

export type ChatMsg = { id: string; platform: "twitch" | "kick" | "youtube"; user: string; color: string | null; text: string };
export type ChatLine = { platform: ChatMsg["platform"]; user: string | null; color: string | null; text: string };
export type ChatOverlayOpts = { enabled: boolean; platforms: ReadonlySet<ChatMsg["platform"]>; scale: number; opacity: number };
export const DEFAULT_CHAT_OVERLAY: ChatOverlayOpts = { enabled: true, platforms: new Set(["twitch", "kick", "youtube"]), scale: 1, opacity: 0.6 };

export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let w = word;
    while (measure(w) > maxWidth && w.length > 1) {
      let n = w.length - 1;
      while (n > 1 && measure(w.slice(0, n)) > maxWidth) n--;
      if (line) {
        out.push(line);
        line = "";
      }
      out.push(w.slice(0, n));
      w = w.slice(n);
    }
    const next = line ? `${line} ${w}` : w;
    if (!line || measure(next) <= maxWidth) line = next;
    else {
      out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  return out;
}

export function layoutChat(msgs: ChatMsg[], o: { maxWidth: number; maxLines: number }, measure: (s: string) => number): ChatLine[] {
  const lines: ChatLine[] = [];
  for (const m of msgs.slice(-o.maxLines)) {
    const prefix = m.user ? measure(`${m.user} `) : 0;
    const first = wrapText(m.text, Math.max(1, o.maxWidth - prefix), measure);
    if (first.length === 0) continue;
    // La 1re ligne porte le pseudo ; le reste du message reprend la pleine largeur.
    const rest = first.length > 1 ? wrapText(first.slice(1).join(" "), o.maxWidth, measure) : [];
    [first[0], ...rest].forEach((text, i) => lines.push({ platform: m.platform, user: i === 0 && m.user ? m.user : null, color: m.color, text }));
  }
  return lines.slice(-o.maxLines);
}

const BADGE: Record<ChatMsg["platform"], string> = { twitch: "#9146ff", kick: "#53fc18", youtube: "#ff0033" };

/** Dessine le chat en haut à gauche. `canvasWidth` : largeur du canvas du programme (1280). */
export function drawChatOverlay(ctx: CanvasRenderingContext2D, msgs: ChatMsg[], o: ChatOverlayOpts, canvasWidth: number): void {
  if (!o.enabled) return;
  const shown = msgs.filter((m) => o.platforms.has(m.platform));
  if (shown.length === 0) return;
  const size = Math.round(20 * o.scale);
  const pad = Math.round(10 * o.scale);
  const gap = Math.round(4 * o.scale);
  const boxW = Math.round(canvasWidth * 0.3);
  const font = `600 ${size}px system-ui, sans-serif`;
  ctx.save();
  ctx.font = font;
  const measure = (s: string) => ctx.measureText(s).width;
  const lines = layoutChat(shown, { maxWidth: boxW - pad * 2 - size, maxLines: 8 }, measure);
  const h = lines.length * (size + gap) + pad * 2 - gap;
  ctx.globalAlpha = o.opacity;
  ctx.fillStyle = "#101010";
  ctx.fillRect(16, 16, boxW, h);
  ctx.globalAlpha = 1;
  ctx.textBaseline = "top";
  lines.forEach((l, i) => {
    const y = 16 + pad + i * (size + gap);
    ctx.fillStyle = BADGE[l.platform];
    ctx.fillRect(16 + pad, y + 3, 4, size - 6);
    let x = 16 + pad + 10;
    if (l.user) {
      ctx.fillStyle = l.color ?? "#e8e8e8";
      ctx.fillText(l.user, x, y);
      x += measure(`${l.user} `);
    }
    ctx.fillStyle = "#f5f5f5";
    ctx.fillText(l.text, x, y);
  });
  ctx.restore();
}
```

Note : les couleurs en dur (`#101010`, `#f5f5f5`) sont autorisées ici, car le canvas est l'image diffusée (pas l'interface) et doit rester lisible quel que soit le thème du site.

- [ ] **Step 4: Lancer** : même commande → PASS. Vérifier à la main qu'aucun test ne dépend de `ctx` (le dessin n'est pas testé en unitaire ; il est vérifié visuellement à la Tâche 8).

- [ ] **Step 5: Commit**

```bash
git add src/components/mix/chat-overlay.ts src/components/mix/chat-overlay.test.ts
git commit -m "Commutateur : chat incrusté (mise en page testée, dessin canvas)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: MultiChat alimente l'overlay

**Files:**
- Modify: `src/components/dashboard/MultiChat.tsx:99` (signature) et `:142` (où `setMsgs` reçoit les messages)

**Interfaces:**
- Produces: prop optionnelle `onMessages?: (msgs: Msg[]) => void` sur `MultiChat`, appelée à chaque mise à jour du fil (les 200 derniers). `Msg` est déjà `{ id, platform, user, color, text }`, identique à `ChatMsg`.

- [ ] **Step 1: Lire** `MultiChat.tsx` autour de `useState<Msg[]>` (ligne 104) et du `setMsgs((cur) => …)` (ligne 142) pour voir la forme exacte du fil.

- [ ] **Step 2: Ajouter la prop** : étendre la signature (`onMessages?: (msgs: Msg[]) => void`) puis un effet :

```tsx
  useEffect(() => {
    onMessages?.(msgs);
  }, [msgs, onMessages]);
```

(placer l'effet après le `useState` de `msgs`). Aucun autre changement de comportement ; `onMessages` absent = comportement actuel.

- [ ] **Step 3: Vérifier** : `npx tsc --noEmit` et `npx eslint src/components/dashboard/MultiChat.tsx` → pas d'erreur. Ouvrir le dashboard : le chat marche comme avant.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/MultiChat.tsx
git commit -m "MultiChat : prop onMessages (alimente le chat incrusté du Commutateur)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Panneau Diffusion

**Files:**
- Create: `src/components/mix/OutputsPanel.tsx`

**Interfaces:**
- Consumes: `listOutputs`, `saveOutput`, `removeOutput`, `destinationsFor` (Tâche 4) ; `PLATFORMS`, `PLATFORM_LABEL`, `DEFAULT_URL`, `Platform` (Tâche 3) ; `coreFetch(coreUrl, path, init)` (`src/components/dashboard/coreClient.ts`) ; `whipPublish(url, stream, maxBitrate, opts)` et `WhipSession` (`src/components/cam/whip.ts`).
- Produces: `export default function OutputsPanel(props: { coreUrl: string; program: MediaStream | null })`.

- [ ] **Step 1: Écrire le composant**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { whipPublish, type WhipSession } from "@/components/cam/whip";
import { coreFetch } from "@/components/dashboard/coreClient";
import { listOutputs, removeOutput, saveOutput, destinationsFor, type OutputView } from "@/app/(studio)/commutateur/outputs";
import { DEFAULT_URL, PLATFORMS, PLATFORM_LABEL, type Platform } from "@/lib/mix-outputs-shared";

// Panneau « Diffusion » du Commutateur : une ligne par plateforme. La vidéo est recopiée (badge COPY), seul le son est converti en AAC.
// Go live ouvre la session du Core (WHIP) avec les adresses déchiffrées pour toi seul, publie le programme, puis les ffmpeg partent.

type OutState = { name: string; state: "connecting" | "live" | "retrying"; error: "refused" | "unreachable" | "failed" | null };
type Status = { state: "idle" | "waiting" | "live"; outputs: OutState[]; allowed?: boolean };

const ERR: Record<string, string> = {
  refused: "Clé refusée par la plateforme.",
  unreachable: "Plateforme injoignable.",
  failed: "Échec de l'envoi, nouvelle tentative…",
  plan: "Ta formule n'inclut pas le Commutateur.",
  no_key: "Chiffrement indisponible (CHAT_TOKEN_KEY).",
  invalid: "Adresse ou clé invalide.",
  rate: "Trop de tentatives, réessaie dans une minute.",
  host_private: "Adresse refusée (non publique).",
  not_allowed: "Aucun relais autorisé sur ce compte.",
};
const say = (code: string) => ERR[code.split(":")[0]] ?? (code.startsWith("missing") ? `${PLATFORM_LABEL[code.split(":")[1] as Platform]} : enregistre d'abord la clé.` : "Erreur, réessaie.");

export default function OutputsPanel({ coreUrl, program }: { coreUrl: string; program: MediaStream | null }) {
  const [saved, setSaved] = useState<OutputView[]>([]);
  const [wanted, setWanted] = useState<Set<Platform>>(new Set());
  const [status, setStatus] = useState<Status>({ state: "idle", outputs: [] });
  const [edit, setEdit] = useState<Platform | null>(null);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const whip = useRef<WhipSession | null>(null);

  const refresh = useCallback(async () => setSaved(await listOutputs()), []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  // État des sorties : une lecture toutes les 2 s tant qu'une session existe.
  const active = status.state !== "idle";
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await coreFetch(coreUrl, "/v1/me/studio/status");
        if (!stop && r.ok) setStatus((await r.json()) as Status);
      } catch {}
    };
    void tick();
    const t = setInterval(tick, active ? 2000 : 10000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [coreUrl, active]);

  const closeAll = useCallback(async () => {
    whip.current?.pc.close();
    whip.current = null;
    await coreFetch(coreUrl, "/v1/me/studio/session", { method: "DELETE" }).catch(() => null);
    setStatus({ state: "idle", outputs: [] });
  }, [coreUrl]);

  // Applique la sélection : ouvre la session au premier Go live, sinon met à jour les destinations.
  const apply = async (next: Set<Platform>) => {
    setBusy(true);
    setMsg(null);
    try {
      if (next.size === 0) {
        await closeAll();
        setWanted(next);
        return;
      }
      const d = await destinationsFor([...next]);
      if (!d.ok) return setMsg(say(d.error));
      if (status.state === "idle") {
        if (!program) return setMsg("Programme non publié.");
        const r = await coreFetch(coreUrl, "/v1/me/studio/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destinations: d.destinations, mode: "copy" }) });
        const j = (await r.json()) as { whip_url?: string; error?: string };
        if (!r.ok || !j.whip_url) return setMsg(say(j.error ?? "x"));
        whip.current = await whipPublish(j.whip_url, program, 4500, { stereo: true });
      } else {
        const r = await coreFetch(coreUrl, "/v1/me/studio/destinations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destinations: d.destinations }) });
        if (!r.ok) return setMsg(say(((await r.json()) as { error?: string }).error ?? "x"));
      }
      setWanted(next);
    } catch {
      setMsg("Connexion au Core impossible.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (p: Platform) => {
    const next = new Set(wanted);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    void apply(next);
  };

  const submit = async () => {
    if (!edit) return;
    const r = await saveOutput(edit, url, key);
    if (!r.ok) return setMsg(say(r.error ?? "x"));
    setKey("");
    setEdit(null);
    void refresh();
  };

  return (
    <div className="space-y-3">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted">Vidéo recopiée (COPY) · son converti en AAC</p>
      {PLATFORMS.map((p) => {
        const row = saved.find((s) => s.platform === p);
        const out = status.outputs.find((o) => o.name === PLATFORM_LABEL[p]);
        const live = out?.state === "live";
        return (
          <div key={p} className="rounded-lg border border-line bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{PLATFORM_LABEL[p]}</span>
              <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase text-muted">
                {live ? <span className="h-2 w-2 rounded-full bg-live" aria-hidden /> : null}
                {out ? (live ? "En live" : out.state === "connecting" ? "Connexion…" : "Nouvelle tentative") : wanted.has(p) ? "…" : "Inactif"}
              </span>
            </div>
            {out?.error && !live ? <p className="mt-1 text-xs text-muted">{ERR[out.error]}</p> : null}
            {edit === p ? (
              <div className="mt-2 space-y-2">
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={DEFAULT_URL[p] || "rtmps://…"} aria-label={`Adresse ${PLATFORM_LABEL[p]}`} className="w-full rounded-md border border-line bg-surface px-2 py-1.5 font-mono text-xs" />
                <input value={key} onChange={(e) => setKey(e.target.value)} type="password" autoComplete="off" placeholder="Clé de stream" aria-label={`Clé ${PLATFORM_LABEL[p]}`} className="w-full rounded-md border border-line bg-surface px-2 py-1.5 font-mono text-xs" />
                <div className="flex gap-2">
                  <button type="button" onClick={submit} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent">Enregistrer</button>
                  <button type="button" onClick={() => setEdit(null)} className="rounded-md px-3 py-1.5 text-xs text-muted hover:bg-foreground/10">Annuler</button>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted">{row ? row.hint : "Pas de clé"}</span>
                <button type="button" onClick={() => { setEdit(p); setUrl(row?.url ?? DEFAULT_URL[p]); setKey(""); }} className="rounded-md border border-line px-2 py-1 text-xs hover:bg-foreground/10">{row ? "Modifier" : "Ajouter"}</button>
                {row ? <button type="button" onClick={async () => { await removeOutput(p); void refresh(); }} className="rounded-md px-2 py-1 text-xs text-muted hover:bg-foreground/10">Supprimer</button> : null}
                <button type="button" disabled={!row || busy || (!program && status.state === "idle" && !wanted.has(p))} onClick={() => toggle(p)} className={`ml-auto rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${wanted.has(p) ? "border border-line hover:bg-foreground/10" : "bg-accent text-on-accent"}`}>
                  {wanted.has(p) ? "Couper" : "Go live"}
                </button>
              </div>
            )}
          </div>
        );
      })}
      {!program ? <p className="text-xs text-muted">Programme non publié : le Go live s'active quand le programme du Commutateur est prêt.</p> : null}
      {msg ? <p role="status" className="text-xs text-muted">{msg}</p> : null}
      <div className="flex gap-2">
        <button type="button" disabled={busy || saved.length === 0 || !program} onClick={() => void apply(new Set(saved.map((s) => s.platform)))} className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-on-accent disabled:opacity-40">Tout lancer</button>
        <button type="button" disabled={busy || !active} onClick={() => void apply(new Set())} className="rounded-md border border-line px-3 py-2 text-xs hover:bg-foreground/10 disabled:opacity-40">Tout couper</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier** : `npx tsc --noEmit && npx eslint src/components/mix/OutputsPanel.tsx` → pas d'erreur ; corriger les règles `react-hooks` signalées sans désactiver sauf le cas identique à `MixApp.tsx:105`.

- [ ] **Step 3: Commit**

```bash
git add src/components/mix/OutputsPanel.tsx
git commit -m "Commutateur : panneau Diffusion (clés, Go live par plateforme, états)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Brancher dans le Commutateur

**Files:**
- Modify: `src/components/mix/MixApp.tsx` (type du tiroir ligne 74 ; ajout d'un `Drawer` près de la ligne 268 ; état du chat)
- Modify: `src/components/mix/TopBar.tsx` (bouton « Diffusion »)

**Interfaces:**
- Consumes: `OutputsPanel` (Tâche 7), `MultiChat` `onMessages` (Tâche 6), `ChatMsg`, `ChatOverlayOpts`, `DEFAULT_CHAT_OVERLAY` (Tâche 5).
- Produces: dans `MixApp`, un état `chat: ChatMsg[]` (ref, pas d'état React par message) et `chatOpts` ; `drawChatOverlay` est prêt pour la boucle canvas du lot A (non appelé tant que le canvas n'existe pas).

- [ ] **Step 1:** `TopBar.tsx` : lire le fichier, ajouter une prop `onOutputs: () => void` et un bouton « Diffusion » à côté du bouton « Lien OBS » (même style).

- [ ] **Step 2:** `MixApp.tsx` :
  - `useState<"obs" | "settings" | "outputs" | null>` pour `drawer` ;
  - `const chatRef = useRef<ChatMsg[]>([])` et `const [chatOpts, setChatOpts] = useState<ChatOverlayOpts>(DEFAULT_CHAT_OVERLAY)` ;
  - un `Drawer` `open={drawer === "outputs"}` `title="Diffusion"` contenant, dans l'ordre : `<OutputsPanel coreUrl={coreUrl} program={null} />` (remplacé par le `MediaStream` du lot A), puis un bloc « Chat sur l'image » : case « Activé » (`chatOpts.enabled`), trois cases plateformes, curseurs Taille (`scale` 0,6 à 1,6) et Opacité (`opacity` 0 à 1) ;
  - un `MultiChat` masqué (`className="hidden"` sur son conteneur : `<div hidden><MultiChat defaults={…} onMessages={(m) => (chatRef.current = m)} /></div>`), monté uniquement quand `!demo`. `defaults` : mêmes valeurs que sur la page dashboard qui monte `MultiChat` (chercher `ChatDefaults` dans `src/app/(dashboard)` et le passer depuis `page.tsx` si ce n'est pas déjà disponible).

- [ ] **Step 3: Vérifier** : `npx tsc --noEmit && npx eslint src/components/mix`. Lancer `npm run dev`, ouvrir `/commutateur` (compte admin) : le bouton ouvre le tiroir, ajouter une clé Twitch de test enregistre et affiche `••••` + 4 caractères ; le bouton Go live est désactivé avec « Programme non publié ».

- [ ] **Step 4: Test unitaire global** : `npm run test:unit` → tout PASS.

- [ ] **Step 5: Commit et push**

```bash
git add src/components/mix src/components/dashboard "src/app/(studio)/commutateur"
git commit -m "Commutateur : tiroir Diffusion et chat incrusté branchés

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push origin main
```

---

### Task 9: Déploiement et test réel (manuel, avec l'utilisateur)

Rien à coder. À faire dans l'ordre, une étape à la fois, commande copiée avec `pbcopy` :

- [ ] Appliquer `0042_mix_outputs.sql` dans le SQL Editor Supabase.
- [ ] Redéployer le Core sur le VPS (`git pull`, relancer le conteneur).
- [ ] Test Core sans navigateur : ouvrir une session (`POST /v1/me/studio/session`, `mode: "copy"`), publier un fichier test en WHIP, vérifier `ffmpeg … -c:v copy` dans `ps` et l'état `live` dans `GET /v1/me/studio/status`.
- [ ] **Mesurer les images clés** : sur un vrai direct Twitch de test, lire dans le tableau de bord Twitch (ou `ffprobe -show_frames`) l'intervalle des images clés du flux Chrome. Si > 2 s (Twitch) ou > 4 s (YouTube), repasser en `mode: "encode"` pour ces plateformes et noter le résultat dans la spec.
- [ ] Vérifier le chat dessiné quand le lot A fournit le canvas (hors de ce plan).

---

## Self-review

**Couverture de la spec :**
- Vidéo copy, audio AAC, un ffmpeg par destination, états : Tâche 1.
- Routes, mode, mise à jour des destinations : Tâche 2.
- Clés chiffrées en base, jamais renvoyées (masque), 3 plateformes : Tâches 3-4.
- Chat canvas haut gauche, réglages, plateformes : Tâches 5, 6, 8.
- Panneau Diffusion, Tout lancer / Tout couper, `--live` seulement sur l'état : Tâche 7.
- Erreurs (clé refusée, injoignable, navigateur fermé → coupure) : `errorKind`, `drop` existant, Tâche 1.
- Risque images clés : Tâche 9 + repli `mode: "encode"`.
- Plafond par formule : `can(plan, "commutateur")` (Tâche 4) et `allowed` du Core (relais autorisé). Le plafond « 3 sorties » est porté par `PLATFORMS` (3) et `MAX_DESTINATIONS` (5, inchangé).
- Écart connu avec la spec initiale : « Core redémarré = sorties à idle » est vrai par construction (sessions en mémoire) ; la spec parlait de `mix_<hex>`, ici le chemin reste `stu_<hex>` (existant).

**Placeholders :** aucun. Les Tâches 2, 6 et 8 renvoient à une lecture du fichier voisin pour le montage exact (test serveur, forme du fil, `TopBar`) ; ces fichiers ne sont pas recopiés ici pour ne pas figer des lignes susceptibles de bouger.

**Cohérence des types :** `Mode`, `ErrorKind`, `outputState`, `copyArgs`, `setDestinations` (Tâche 1) sont repris tels quels en Tâches 2 et 7 ; `OutState` (Tâche 7) correspond à `outputs` de `status` (Tâche 1) ; `ChatMsg` (Tâche 5) a la même forme que `Msg` de `MultiChat`.
