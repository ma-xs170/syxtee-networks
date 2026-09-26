// Crédits des visuels tiers utilisés sur le site (le reste est illustré par SYXTEE NETWORKS). Affichés sur /credits.
export type Credit = {
  file: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
  changes: string;
  page: string;
};

export const credits: Credit[] = [
  {
    file: "icon.png",
    title: "Logo Moblin",
    author: "eerimoq",
    license: "MIT",
    licenseUrl: "https://github.com/eerimoq/moblin/blob/main/LICENSE",
    source: "https://github.com/eerimoq/moblin/blob/main/Moblin/Assets.xcassets/AppIcon.appiconset/logo-square.png",
    changes: "Aucune",
    page: "/moblin",
  },
];

export function creditFor(file: string) {
  return credits.find((c) => c.file.split(" / ").includes(file));
}
