import Image from "next/image";
import L from "../L";

// Catégories Twitch où diffuse l'IRL : visuels officiels des catégories (pochettes), titre et pastille « IRL », comme sur Twitch.
const ITEMS = [
  { src: "/images/categories/irl.webp", fr: "IRL", en: "IRL", href: "https://www.twitch.tv/directory/category/irl" },
  { src: "/images/categories/evenements-speciaux.webp", fr: "Événements spéciaux", en: "Special Events", href: "https://www.twitch.tv/directory/category/special-events" },
  { src: "/images/categories/piscines-plages.webp", fr: "Piscines, jacuzzi et plages", en: "Pools, Hot Tubs & Beaches", href: "https://www.twitch.tv/directory/category/pools-hot-tubs-and-beaches" },
];

export default function TwitchCategories() {
  return (
    <ul className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-8 px-4 min-[480px]:grid-cols-3 sm:gap-6 lg:mt-20">
      {ITEMS.map((it) => (
        <li key={it.src}>
          <a href={it.href} target="_blank" rel="noopener noreferrer" className="group block text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
            <Image src={it.src} alt="" width={285} height={380} sizes="(min-width: 768px) 220px, 45vw" className="aspect-[3/4] w-full rounded-xl border border-line object-cover transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none" />
            <p className="mt-3 text-sm font-medium leading-snug"><L fr={it.fr} en={it.en} /></p>
            <span className="mt-2 inline-flex h-6 items-center rounded-full bg-foreground/[0.1] px-2.5 text-xs font-semibold">IRL</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
