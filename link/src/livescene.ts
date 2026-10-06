// Scène de direct : doit contenir la source « Flux › NOM » du flux de destination (entrée média qui lit le relais en SRT). Sans elle, la
// détection de coupure et la bascule automatique n'ont rien à surveiller. « Corriger » l'ajoute : le plugin crée la source (ou réutilise celle
// qui existe, même source dans plusieurs scènes) ; sans plugin, repli sur les commandes d'OBS. Jamais exposé au site.

export type Relay = { id: string; name: string; url: string };
export const fluxName = (relayName: string) => `Flux › ${relayName}`;

type Req = (type: string, data?: Record<string, unknown>) => Promise<Record<string, unknown>>;
type Item = { sourceName?: string; syxteeRelayId?: string };

async function items(req: Req, scene: string): Promise<Item[]> {
  if (!scene) return [];
  return ((await req("GetSceneItemList", { sceneName: scene })).sceneItems as Item[]) ?? [];
}

/** Nom de la source de ce flux dans la scène (liée au relais par le plugin, ou nommée « Flux › … » sans le plugin), sinon null. */
export async function sourceFor(req: Req, scene: string, relayId?: string): Promise<string | null> {
  const list = await items(req, scene);
  const linked = list.find((i) => (relayId ? i.syxteeRelayId === relayId : !!i.syxteeRelayId));
  if (linked) return linked.sourceName ?? null;
  // Sans le plugin, OBS ne dit pas quelle source est liée à quel flux : on se fie au nom « Flux › … ».
  if (list.some((i) => i.syxteeRelayId !== undefined)) return null;
  return list.find((i) => !!i.sourceName?.startsWith("Flux ›"))?.sourceName ?? null;
}

/** La scène contient-elle la source du flux ? */
export async function hasSource(req: Req, scene: string, relayId?: string): Promise<boolean> {
  return (await sourceFor(req, scene, relayId)) !== null;
}

/** Entrée média SRT : reconnexion automatique, tampon court. */
export const sourceSettings = (r: Relay) => ({
  input: r.url,
  is_local_file: false,
  close_when_inactive: false,
  restart_on_activate: false,
  hw_decode: true,
  buffering_mb: 2,
  reconnect_delay_sec: 3,
  syxtee_relay_id: r.id,
});

/** Ajoute (ou rattache, ou remet à jour) la source du flux dans la scène. Renvoie un message lisible. */
export async function fixLiveScene(req: Req, scene: string, relay: Relay | undefined): Promise<{ ok: boolean; message: string; source?: string }> {
  if (!scene) return { ok: false, message: "Choisis d'abord la scène de direct." };
  if (!relay?.url) return { ok: false, message: "Choisis d'abord un flux de destination." };
  const name = fluxName(relay.name);
  const have = await sourceFor(req, scene, relay.id);
  if (have) {
    await req("SetInputSettings", { inputName: have, inputSettings: { input: relay.url }, overlay: true }).catch(() => {});
    return { ok: true, message: `La source « ${have} » était déjà là : son adresse est à jour.`, source: have };
  }
  try {
    // Plugin : crée la source liée au flux, ou réutilise celle qui existe déjà dans OBS, puis la place dans la scène.
    await req("link.addRelaySources", { relayIds: [relay.id], scenes: [scene] });
  } catch (e) {
    if (!/inconnue|unknown|not supported/i.test((e as Error).message)) throw e;
    // Sans le plugin (essais, Qt incompatible) : commandes d'OBS.
    const inputs = ((await req("GetInputList")).inputs as { inputName?: string }[]) ?? [];
    if (inputs.some((i) => i.inputName === name)) {
      await req("SetInputSettings", { inputName: name, inputSettings: sourceSettings(relay), overlay: true });
      await req("CreateSceneItem", { sceneName: scene, sourceName: name, sceneItemEnabled: true });
    } else {
      await req("CreateInput", { sceneName: scene, inputName: name, inputKind: "ffmpeg_source", inputSettings: sourceSettings(relay), sceneItemEnabled: true });
    }
  }
  const placed = (await sourceFor(req, scene, relay.id)) ?? name;
  return { ok: true, message: `Source « ${placed} » ajoutée à la scène « ${scene} ».`, source: placed };
}
