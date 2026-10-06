// Scène de direct : doit contenir la source « Flux SYXTEE » (entrée média qui lit le relais en SRT). Sans elle, la détection de coupure
// et la bascule automatique n'ont rien à surveiller. « Corriger » l'ajoute avec les vraies commandes d'OBS (jamais exposées au site).

export const SOURCE_NAME = "Flux SYXTEE";

type Req = (type: string, data?: Record<string, unknown>) => Promise<Record<string, unknown>>;

/** La scène contient-elle la source « Flux SYXTEE » ? */
export async function hasSource(req: Req, scene: string): Promise<boolean> {
  if (!scene) return false;
  const r = await req("GetSceneItemList", { sceneName: scene });
  return ((r.sceneItems as { sourceName?: string }[]) ?? []).some((i) => i.sourceName === SOURCE_NAME);
}

/** Entrée média SRT : reconnexion automatique, pas de décodage matériel imposé, tampon court. */
export const sourceSettings = (url: string) => ({
  input: url,
  is_local_file: false,
  close_when_inactive: false,
  restart_on_activate: false,
  hw_decode: true,
  buffering_mb: 2,
  reconnect_delay_sec: 3,
});

/** Ajoute (ou rattache, ou remet à jour) la source « Flux SYXTEE » dans la scène. Renvoie un message lisible. */
export async function fixLiveScene(req: Req, scene: string, url: string): Promise<{ ok: boolean; message: string }> {
  if (!scene) return { ok: false, message: "Choisis d'abord la scène de direct." };
  if (!url) return { ok: false, message: "Choisis d'abord un flux de destination." };
  if (await hasSource(req, scene)) {
    await req("SetInputSettings", { inputName: SOURCE_NAME, inputSettings: sourceSettings(url), overlay: true });
    return { ok: true, message: "La source « Flux SYXTEE » était déjà là : son adresse est à jour." };
  }
  const inputs = ((await req("GetInputList")).inputs as { inputName?: string }[]) ?? [];
  if (inputs.some((i) => i.inputName === SOURCE_NAME)) {
    // La source existe dans une autre scène : on la réutilise (même image partout) et on met son adresse à jour.
    await req("SetInputSettings", { inputName: SOURCE_NAME, inputSettings: sourceSettings(url), overlay: true });
    await req("CreateSceneItem", { sceneName: scene, sourceName: SOURCE_NAME, sceneItemEnabled: true });
  } else {
    await req("CreateInput", { sceneName: scene, inputName: SOURCE_NAME, inputKind: "ffmpeg_source", inputSettings: sourceSettings(url), sceneItemEnabled: true });
  }
  return { ok: true, message: `Source « ${SOURCE_NAME} » ajoutée à la scène « ${scene} ».` };
}
