// Emplacements d'images de la landing. Dépose `<name>.avif|webp|png|jpg` dans `public/visuals/` : le composant VisualSlot le prend tout seul.
export type VisualSpec = { name: string; label: string; ratio: string; size: string; where: string };

export const VISUALS: VisualSpec[] = [
  { name: "box-photo", label: "Photo ou rendu du boîtier", ratio: "4 / 3", size: "1600 x 1200", where: "Bento, grande carte (remplace le rendu SVG)" },
  { name: "app-mockup", label: "Capture du dashboard, page Appareils", ratio: "16 / 10", size: "2400 x 1500", where: "Section « Une app pour tout configurer » (remplace le mockup généré)" },
  { name: "box-hero", label: "Rendu 3D du boîtier (pleine largeur)", ratio: "5 / 2", size: "2400 x 960", where: "Carte produit des tarifs (remplace le rendu SVG)" },
];
export const visual = (name: string) => VISUALS.find((v) => v.name === name)!;
