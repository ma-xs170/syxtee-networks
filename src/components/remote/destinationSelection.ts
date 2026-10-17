// Destinations choisies pour le prochain direct : mémorisées par appareil dans ce navigateur. Cocher ne lance rien ;
// « Passer en direct » (Contrôle à distance) démarre les sorties cochées.
const key = (deviceId: string) => `syxtee-dest-sel:${deviceId}`;

export function readSelection(deviceId: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key(deviceId)) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function writeSelection(deviceId: string, ids: string[]) {
  try {
    localStorage.setItem(key(deviceId), JSON.stringify(ids));
  } catch {
    // stockage indisponible
  }
}
