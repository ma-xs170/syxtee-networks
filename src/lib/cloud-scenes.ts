// OBS Cloud : modèle des scènes (pur, sans React). Une scène = une liste de sources (des relais), de bas en haut comme dans OBS.
// La mise en page est calculée à partir des sources visibles : 1 = plein cadre, 2 = côte à côte, 3 et 4 = grille 2x2, au-delà 3 colonnes.

export type SceneItem = { id: string; relayId: string; visible: boolean };
export type Scene = { id: string; name: string; items: SceneItem[] };
export type Rect = { x: number; y: number; w: number; h: number };

const uid = () => Math.random().toString(36).slice(2, 10);

export const newItem = (relayId: string): SceneItem => ({ id: uid(), relayId, visible: true });
export const newScene = (name: string, relayIds: string[] = []): Scene => ({ id: uid(), name, items: relayIds.map(newItem) });

/** Rectangles en pourcentage du cadre 16:9, un par source visible, dans l'ordre. */
export function layoutOf(count: number): Rect[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 0, y: 0, w: 100, h: 100 }];
  if (count === 2) return [{ x: 0, y: 25, w: 50, h: 50 }, { x: 50, y: 25, w: 50, h: 50 }];
  const cols = count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const w = 100 / cols;
  const h = 100 / rows;
  return Array.from({ length: count }, (_, i) => ({ x: (i % cols) * w, y: Math.floor(i / cols) * h, w, h }));
}

/** Sources visibles d'une scène, de la première (fond) à la dernière. */
export const visibleItems = (s: Scene | undefined) => (s ? s.items.filter((i) => i.visible) : []);

/** Relais présents dans une scène (visibles), pour l'audio « ON AIR ». */
export const sceneRelayIds = (s: Scene | undefined) => visibleItems(s).map((i) => i.relayId);

/** Nom libre : « Scène », « Scène 2 », « Scène 3 »… */
export function uniqueName(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  for (let n = 2; ; n++) if (!taken.includes(`${base} ${n}`)) return `${base} ${n}`;
}

/** Déplace l'élément `id` d'un cran (`-1` vers le haut de la liste, `1` vers le bas). */
export function moveItem(items: SceneItem[], id: string, dir: -1 | 1): SceneItem[] {
  const i = items.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= items.length) return items;
  const next = [...items];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Scènes de départ : une par relais (CAM n), et « Multi » avec les deux premiers. */
export function defaultScenes(relays: { id: string; n: number; name: string }[]): Scene[] {
  const singles = relays.map((r) => newScene(`CAM ${r.n} · ${r.name}`, [r.id]));
  if (relays.length < 2) return singles.length ? singles : [newScene("Scène")];
  return [...singles, newScene("Multi", relays.slice(0, 2).map((r) => r.id))];
}

/** Relit des scènes enregistrées : forme vérifiée, relais disparus retirés. Retourne null si rien d'exploitable. */
export function parseScenes(raw: unknown, knownRelayIds: string[]): Scene[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Scene[] = [];
  for (const s of raw) {
    if (!s || typeof s !== "object" || typeof s.id !== "string" || typeof s.name !== "string" || !Array.isArray(s.items)) continue;
    const items: SceneItem[] = s.items
      .filter((i: unknown): i is SceneItem => !!i && typeof i === "object" && typeof (i as SceneItem).id === "string" && typeof (i as SceneItem).relayId === "string" && knownRelayIds.includes((i as SceneItem).relayId))
      .map((i: SceneItem) => ({ id: i.id, relayId: i.relayId, visible: i.visible !== false }));
    out.push({ id: s.id, name: s.name.slice(0, 60), items });
  }
  return out.length ? out : null;
}
