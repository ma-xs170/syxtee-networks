// Régénère src/lib/streamer-photos.ts à partir des fichiers de public/images/streamers (png, webp).
import { readdirSync, writeFileSync } from "node:fs";

const files = readdirSync("public/images/streamers").filter((f) => /\.(png|webp)$/i.test(f)).sort();
const list = files.map((f) => `  "/images/streamers/${f}",`).join("\n");
writeFileSync(
  "src/lib/streamer-photos.ts",
  `// Photos de streamers du hero de l'accueil : PNG détourés (fond transparent), posés dans public/images/streamers/.
// Le site les passe en gris et y ajoute une trame de points. Après avoir ajouté ou retiré un fichier :
// node scripts/list-streamers.mjs (régénère cette liste). Vide : le hero utilise les avatars des streamers inscrits.
export const streamerPhotos: string[] = [${files.length ? `\n${list}\n` : ""}];
`,
);
console.log(files.length, "photo(s)");
