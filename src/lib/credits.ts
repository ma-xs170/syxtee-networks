// Crédits des visuels tiers utilisés sur le site. Affichés sur la page concernée et sur /credits.
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
    file: "mini.png / mini-video.jpg",
    title: "Starlink Mini Overland and Camping Power Testing",
    author: "Overland Calling",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
    source: "https://commons.wikimedia.org/wiki/File:Starlink_Mini_Overland_and_Camping_Power_Testing.webm",
    changes: "Image extraite de la vidéo, détourée et recadrée",
    page: "/starlink",
  },
  {
    file: "mini-trepied.jpg",
    title: "Starlink mini 1st article mount on a camera tripod",
    author: "chiricahua mountains",
    license: "CC BY-ND 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-nd/2.0/",
    source: "https://www.flickr.com/photos/119848013@N04/54031775015",
    changes: "Aucune",
    page: "/starlink",
  },
  {
    file: "icon.png",
    title: "Icône de l'app Moblin",
    author: "© 2023 Erik Moqvist (eerimoq)",
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
