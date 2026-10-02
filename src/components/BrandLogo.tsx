import { siDji, siDiscord, siKick, siObsstudio, siTiktok, siTwitch, siYoutube } from "simple-icons";

// Logos de marques (Simple Icons, tracé inline en couleur du texte : suit le thème clair ou sombre). Usage nominatif.
// GoPro n'est plus dans Simple Icons : son nom en lettres, dans le même cadre.
const ICONS = { dji: siDji, discord: siDiscord, kick: siKick, obs: siObsstudio, tiktok: siTiktok, twitch: siTwitch, youtube: siYoutube };
export type Brand = keyof typeof ICONS | "gopro";

export default function BrandLogo({ brand, className = "h-6 w-6" }: { brand: Brand; className?: string }) {
  if (brand === "gopro")
    return (
      <svg viewBox="0 0 72 24" role="img" aria-label="GoPro" className={className} fill="currentColor">
        <text x="0" y="19" fontSize="20" fontWeight="700" letterSpacing="-0.5" fontFamily="system-ui, sans-serif">
          GoPro
        </text>
      </svg>
    );
  const i = ICONS[brand];
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={i.title} className={className} fill="currentColor">
      <path d={i.path} />
    </svg>
  );
}
