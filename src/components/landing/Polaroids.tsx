import L from "../L";
import BackpackEncoder from "@/components/illustrations/BackpackEncoder";
import Streamer from "@/components/illustrations/Streamer";
import StarlinkMini from "@/components/illustrations/StarlinkMini";
import BeachView from "@/components/illustrations/BeachView";

// Quatre « polaroïds » penchés sous l'appel à contacter : cadre clair, illustration filaire (à la place des photos), légende manuscrite.
// Le cadre suit les couleurs du thème (fond = encre, texte = fond) ; les images restent des dessins de la charte.
const ITEMS = [
  { tilt: "-rotate-6", drop: "sm:mt-6", fr: "En marche", en: "On the move", art: <Streamer animated={false} /> },
  { tilt: "rotate-3", drop: "sm:mt-0", fr: "Tout dans le sac", en: "Everything in the bag", art: <BackpackEncoder animated={false} /> },
  { tilt: "-rotate-2", drop: "sm:mt-10", fr: "Réseau partout", en: "Network everywhere", art: <StarlinkMini animated={false} className="h-full w-full" /> },
  { tilt: "rotate-6", drop: "sm:mt-4", fr: "En bord de mer", en: "By the sea", art: <BeachView animated={false} className="h-full w-full" /> },
];

export default function Polaroids() {
  return (
    <ul className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-x-4 gap-y-10 px-2 sm:grid-cols-4 sm:gap-x-0 lg:mt-20">
      {ITEMS.map((it) => (
        <li key={it.fr} className={`${it.drop} flex justify-center`}>
          <figure className={`${it.tilt} w-full max-w-[230px] rounded-sm bg-foreground p-3 pb-4 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] transition-transform duration-300 hover:rotate-0 motion-reduce:transition-none sm:-mx-3`}>
            <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[2px] bg-background p-4 text-foreground">{it.art}</div>
            <figcaption className="mt-3 text-center font-[family-name:var(--font-hand)] text-2xl leading-none text-background">
              <L fr={it.fr} en={it.en} />
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
