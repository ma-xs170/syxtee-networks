// Configuration centrale du site — modifie ici les liens, textes clés et relais.
export const site = {
  name: "SYXTEE NETWORKS",
  url: "https://syxtee-networks.vercel.app", // ← remplace par ton domaine final
  description:
    "Relais IRL SRTLA low-cost : streame en extérieur avec ton téléphone, connexions 4G/5G combinées, compatible Moblin, IRL Pro et OBS.",
  discord: "https://discord.gg/CD68F8yZuZ",
  year: new Date().getFullYear(),
};

export const nav = [
  { label: "Services", href: "#services" },
  { label: "Fonctionnement", href: "#fonctionnement" },
  { label: "Relais", href: "#relais" },
  { label: "Offres", href: "#offres" },
  { label: "FAQ", href: "#faq" },
];

export type Relay = {
  city: string;
  region: string;
  status: "online" | "soon";
  protocols: string[];
};

export const relays: Relay[] = [
  { city: "New York", region: "USA · Côte Est", status: "online", protocols: ["SRTLA", "SRT"] },
];

export const compat = ["Moblin", "IRL Pro", "BELABOX", "OBS Studio", "Twitch", "Kick", "YouTube", "TikTok Live"];

export type Streamer = {
  handle: string;
  platform: "twitch" | "kick" | "youtube" | "tiktok";
  url: string;
  avatar?: string; // ex. "/streamers/imsyxtee.jpg" (fichier dans public/streamers/)
};

// Uniquement de vrais utilisateurs qui ont donné leur accord.
export const streamers: Streamer[] = [
  { handle: "imsyxtee", platform: "twitch", url: "https://twitch.tv/imsyxtee" },
];
