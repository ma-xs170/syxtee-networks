import Image from "next/image";
import L from "../L";
import HoverVideo from "./HoverVideo";

// Catégories Twitch où diffuse l'IRL : pochettes officielles (1080×1440 recadrées en 600×800) posées en « polaroïds » penchés, légende manuscrite.
// Le cadre suit les couleurs du thème (fond = encre, texte = fond). Chaque polaroïd ouvre la catégorie sur Twitch.
const ITEMS = [
  { src: "/images/categories/irl.webp", tilt: "-rotate-6", drop: "sm:mt-8", fr: "Mobilité", en: "Mobility", video: "/videos/mobilite-hover", href: "https://www.twitch.tv/directory/category/irl" },
  { src: "/images/categories/evenements-speciaux.webp", tilt: "rotate-2", drop: "sm:mt-0", fr: "Événements", en: "Events", href: "https://www.twitch.tv/directory/category/special-events" },
  { src: "/images/categories/piscines-plages.webp", tilt: "rotate-6", drop: "sm:mt-6", fr: "Sortie en mer", en: "At sea", href: "https://www.twitch.tv/directory/category/pools-hot-tubs-and-beaches" },
];

export default function TwitchCategories() {
  return (
    <ul className="mx-auto mt-16 grid max-w-4xl grid-cols-1 justify-items-center gap-10 px-4 min-[560px]:grid-cols-3 min-[560px]:gap-0 lg:mt-20">
      {ITEMS.map((it) => (
        <li key={it.src} className={`${it.drop} w-full max-w-[260px]`}>
          <a href={it.href} target="_blank" rel="noopener noreferrer" className={`${it.tilt} block rounded-sm bg-foreground p-3 pb-4 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] transition-transform duration-300 hover:rotate-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground motion-reduce:transition-none min-[560px]:-mx-2`}>
            {"video" in it && it.video ? <HoverVideo video={it.video} /> : <Image src={it.src} alt="" width={600} height={800} sizes="260px" className="aspect-[3/4] w-full rounded-[2px] object-cover" />}
            <span className="mt-3 block text-center font-[family-name:var(--font-hand)] text-2xl leading-tight text-background">
              <L fr={it.fr} en={it.en} />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
