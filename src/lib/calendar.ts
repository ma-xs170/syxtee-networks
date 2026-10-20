import { siFacebook, siInstagram, siKick, siTiktok, siTwitch, siX, siYoutube, type SimpleIcon } from "@/lib/brand-icons";

// Calendrier des prochains directs (migration 0060). Partagé entre le serveur (actions, flux .ics, page publique) et le navigateur.

export const PLATFORMS = [
  { id: "twitch", label: "Twitch", icon: siTwitch },
  { id: "youtube", label: "YouTube", icon: siYoutube },
  { id: "kick", label: "Kick", icon: siKick },
  { id: "tiktok", label: "TikTok", icon: siTiktok },
  { id: "facebook", label: "Facebook", icon: siFacebook },
  { id: "instagram", label: "Instagram", icon: siInstagram },
  { id: "x", label: "X", icon: siX },
] as const satisfies readonly { id: string; label: string; icon: SimpleIcon }[];

export type PlatformId = (typeof PLATFORMS)[number]["id"];
export const PLATFORM_IDS = PLATFORMS.map((p) => p.id) as [PlatformId, ...PlatformId[]];
export const platformOf = (id: string) => PLATFORMS.find((p) => p.id === id);

/** Un live planifié tel que le navigateur le manipule (dates en ISO, UTC). */
export type LiveEvent = {
  id: string;
  title: string;
  location: string;
  description: string;
  platforms: PlatformId[];
  starts_at: string;
  ends_at: string;
};

export const LIVE_COLUMNS = "id, title, location, description, platforms, starts_at, ends_at";

/** Durée maximale d'un live planifié (la base la vérifie aussi). */
export const MAX_DURATION_MS = 7 * 24 * 3600_000;

export const SHARE_TOKEN = /^[0-9a-f]{32}$/;
