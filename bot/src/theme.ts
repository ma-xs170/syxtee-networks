import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { fileURLToPath } from "node:url";

// Charte SYXTEE sur Discord : gris doux + un seul rouge d'accent, bandeau dégradé noir → rouge, logo en vignette.

export const RED = 0xd92d2d;
export const ASSETS = fileURLToPath(new URL("../assets/", import.meta.url));

const SEP = "▰".repeat(3) + "▱".repeat(1);

export function logoFile() {
  return new AttachmentBuilder(ASSETS + "logo.png", { name: "logo.png" });
}
export function bannerFile() {
  return new AttachmentBuilder(ASSETS + "banner.png", { name: "banner.png" });
}

/** Embed de base : auteur + logo, rouge SYXTEE, pied de page. `banner` ajoute le bandeau dégradé en bas. */
export function baseEmbed(opts: { title?: string; description?: string; banner?: boolean } = {}) {
  const e = new EmbedBuilder()
    .setColor(RED)
    .setAuthor({ name: "SYXTEE NETWORKS", iconURL: "attachment://logo.png" })
    .setThumbnail("attachment://logo.png")
    .setFooter({ text: "SYXTEE NETWORKS · IRL streaming" })
    .setTimestamp();
  if (opts.title) e.setTitle(opts.title);
  if (opts.description) e.setDescription(opts.description);
  if (opts.banner) e.setImage("attachment://banner.png");
  return e;
}

export function files(banner = false) {
  return banner ? [logoFile(), bannerFile()] : [logoFile()];
}

/** Barre de progression en blocs, ex. bar(62) → ▰▰▰▰▰▰▱▱▱▱ */
export function bar(percent: number, size = 10) {
  const n = Math.max(0, Math.min(size, Math.round((percent / 100) * size)));
  return "▰".repeat(n) + "▱".repeat(size - n);
}

export function title(text: string) {
  return `${SEP} **${text.toUpperCase()}**`;
}

export function duration(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}
