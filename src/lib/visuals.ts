// Emplacements d'images de la landing. Dépose `<name>.avif|webp|png|jpg` dans `public/visuals/` : le composant VisualSlot le prend tout seul.
export type VisualSpec = { name: string; label: string; ratio: string; size: string; where: string };

export const VISUALS: VisualSpec[] = [
  { name: "obs-hero", label: "Capture d'OBS CLOUD (Mac + iPhone)", ratio: "16 / 10", size: "2400 x 1500", where: "Hero (remplace la démo interactive : à ne fournir que si tu veux une image fixe)" },
  { name: "encoder-hero", label: "Rendu du boîtier Encodeur", ratio: "16 / 9", size: "2400 x 1350", where: "Section Encodeur (remplace le rendu SVG)" },
  { name: "coverage-map", label: "Capture de la carte Où capter", ratio: "16 / 10", size: "1600 x 1000", where: "Section Relais, carte « Où capter »" },
];
export const visual = (name: string) => VISUALS.find((v) => v.name === name)!;
