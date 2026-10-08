// Emplacements d'images de la landing. Dépose `<name>.avif|webp|png|jpg` dans `public/visuals/` : le composant VisualSlot le prend tout seul.
export type VisualSpec = { name: string; label: string; ratio: string; size: string; where: string };

export const VISUALS: VisualSpec[] = [
  { name: "relay-3d", label: "Rendu 3D du relais", ratio: "4 / 3", size: "1600 x 1200", where: "Bento, grande carte « Un relais, plusieurs connexions »" },
  { name: "app-mockup", label: "Capture du dashboard", ratio: "16 / 10", size: "2400 x 1500", where: "Bento, carte « Contrôle à distance »" },
  { name: "pricing-free", label: "Visuel formule Gratuit", ratio: "16 / 9", size: "1200 x 675", where: "Tarifs, carte Gratuit" },
  { name: "pricing-paid", label: "Visuel formule Payant", ratio: "16 / 9", size: "1200 x 675", where: "Tarifs, carte Payant (mise en avant)" },
  { name: "pricing-partner", label: "Visuel formule Partenaire", ratio: "16 / 9", size: "1200 x 675", where: "Tarifs, carte Partenaire" },
];
export const visual = (name: string) => VISUALS.find((v) => v.name === name)!;
