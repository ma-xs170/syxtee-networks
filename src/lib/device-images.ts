import fs from "node:fs";
import path from "node:path";

// Rendus 3D facultatifs des appareils : `public/devices/<name>.(webp|png)`. Renvoie l'URL si le fichier existe, sinon null (le composant dessine l'appareil en SVG + CSS).
export type DeviceName = "laptop" | "phone" | "watch" | "tablet" | "encoder";

export function deviceImage(name: DeviceName): string | null {
  const ext = ["webp", "png"].find((e) => fs.existsSync(path.join(process.cwd(), "public", "devices", `${name}.${e}`)));
  return ext ? `/devices/${name}.${ext}` : null;
}
