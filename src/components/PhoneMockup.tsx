import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import ScreenLandscape from "./moblin/ScreenLandscape";
import RemotePhoneScreen, { type RemoteTab } from "./mockups/RemotePhoneScreen";

// iPhone filaire en portrait (même cadre que le téléphone du ScrollStory /moblin) autour d'une capture d'écran.
// Remplit la largeur de son conteneur. Tant que la capture n'existe pas, affiche l'interface illustrée :
// le paysage de l'écran + une interface Moblin simplifiée, avec le nom de l'étape.
export default function PhoneMockup({
  src,
  alt,
  sizes = "240px",
  eager = false,
  screen,
}: {
  src: string;
  alt: string;
  sizes?: string;
  eager?: boolean;
  /** Écran du Contrôle à distance dessiné en HTML (jamais rogné) à la place d'une capture. */
  screen?: RemoteTab;
}) {
  const exists = existsSync(path.join(process.cwd(), "public", src));

  return (
    <div
      className="relative w-full rounded-[18%/8.3%] border-[1.5px] border-foreground/80 bg-black p-[3.5%] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]"
      style={{ aspectRatio: "9 / 19.5" }}
    >
      {/* Boutons latéraux */}
      <span className="absolute -left-[3px] top-[18%] h-[7%] w-[3px] rounded-full border border-foreground/70" aria-hidden="true" />
      <span className="absolute -left-[3px] top-[27%] h-[7%] w-[3px] rounded-full border border-foreground/70" aria-hidden="true" />
      <span className="absolute -right-[3px] top-[22%] h-[11%] w-[3px] rounded-full border border-foreground/70" aria-hidden="true" />

      <div className="relative h-full w-full overflow-hidden rounded-[14%/6.5%] bg-black [container-type:size]">
        {screen ? (
          <RemotePhoneScreen tab={screen} />
        ) : exists ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : undefined}
            className="object-cover"
          />
        ) : (
          <div role="img" aria-label={`Interface illustrée : ${alt}`} className="absolute inset-0">
            <svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <ScreenLandscape w={390} h={844} />
            </svg>
            <div className="absolute inset-x-0 top-[7%] flex items-center justify-center gap-[2cqw]">
              <Image src="/images/moblin/icon.png" alt="" width={20} height={20} className="h-[7cqw] w-[7cqw] rounded-[22%]" />
              <span className="rounded-[1cqw] bg-[var(--live)] px-[1.6cqw] py-[0.3cqw] font-mono text-[4cqw] font-semibold leading-none text-white">LIVE</span>
              <span className="font-mono text-[4cqw] leading-none text-white/85">6 024 kbps</span>
            </div>
            <p className="absolute inset-x-[8%] bottom-[8%] rounded-[3cqw] border border-foreground/35 bg-black/75 px-[3cqw] py-[2cqw] text-center font-mono text-[4.2cqw] leading-snug text-white">
              {alt}
            </p>
          </div>
        )}
        {/* Dynamic Island */}
        <div className="absolute left-1/2 top-[2.2%] h-[3.6%] w-[30%] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/15" aria-hidden="true" />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent via-40% to-transparent" aria-hidden="true" />
      </div>
    </div>
  );
}
