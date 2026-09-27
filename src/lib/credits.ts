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
  {
    file: "ipinfo_lite.mmdb (serveur)",
    title: "Données opérateur : IPinfo (CC BY-SA 4.0)",
    author: "IPinfo",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    source: "https://ipinfo.io/lite",
    changes: "Numéros d'AS regroupés par marque d'opérateur (Orange Caraïbe, Digicel…)",
    page: "/confidentialite#couverture",
  },
];

export function creditFor(file: string) {
  return credits.find((c) => c.file.split(" / ").includes(file));
}
