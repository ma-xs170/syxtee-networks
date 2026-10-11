import { networkInterfaces } from "node:os";

// Liens réseau utilisables pour le bonding : une adresse IPv4 par interface active.
export type LinkKind = "wifi" | "eth" | "cell" | "usb" | "other";
export type Link = { name: string; address: string; kind: LinkKind };

/** Devine le type d'un lien d'après le nom de l'interface (Linux : wlan, eth, wwan, usb ; macOS : en0 = Wi-Fi). */
export function classify(name: string, platform: NodeJS.Platform = process.platform): LinkKind {
  if (/^(wl|wlan)/.test(name)) return "wifi";
  if (/^(ww|rmnet|ppp)/.test(name)) return "cell";
  if (/^(usb|enx)/.test(name)) return "usb"; // clé 4G USB en mode RNDIS/CDC : usb0, enx<mac>
  if (/^(eth|en[pPos])/.test(name)) return "eth";
  if (platform === "darwin" && /^en\d+$/.test(name)) return name === "en0" ? "wifi" : "eth";
  return "other";
}

export function listLinks(platform: NodeJS.Platform = process.platform): Link[] {
  const out: Link[] = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== "IPv4" || a.internal || a.address.startsWith("169.254.")) continue;
      out.push({ name, address: a.address, kind: classify(name, platform) });
    }
  }
  return out;
}

/** Contenu du fichier d'adresses locales de srtla_send : une adresse par ligne. */
export function ipsFile(links: Link[]): string {
  return links.map((l) => l.address).join("\n") + "\n";
}
