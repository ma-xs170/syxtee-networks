import fs from "node:fs";
import path from "node:path";
import GlassIconView, { type GlassName } from "./GlassIconView";

export type { GlassName };

/** Icône verre 3D (composant serveur) : si `public/glass-icons/<name>.(webp|png)` existe, ce rendu 3D remplace l'icône SVG générée. */
export default function GlassIcon({ name, size = 72, float = true, className = "" }: { name: GlassName; size?: number; float?: boolean; className?: string }) {
  const ext = ["webp", "png"].find((e) => fs.existsSync(path.join(process.cwd(), "public", "glass-icons", `${name}.${e}`)));
  return <GlassIconView name={name} size={size} float={float} className={className} src={ext ? `/glass-icons/${name}.${ext}` : null} />;
}
