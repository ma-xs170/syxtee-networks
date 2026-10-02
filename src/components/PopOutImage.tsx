import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import type { ReactNode } from "react";
import PopOutParallax from "./PopOutParallax";

// Carte dont l'image PNG transparente déborde du cadre.
// overflow="side" ne s'active qu'à partir de xl : en dessous, l'image déborderait de l'écran,
// elle dépasse donc par le haut comme overflow="top".
// shape="phone" : visuel haut (mockup iPhone passé dans `art`) qui dépasse par le haut ;
// le texte passe dessous en mobile, à côté à partir de md.
export default function PopOutImage({
  src = "",
  alt,
  side = "right",
  overflow = "top",
  shape = "square",
  art,
  fallback,
  eager = false,
  children,
}: {
  src?: string;
  alt: string;
  side?: "left" | "right";
  overflow?: "top" | "side" | "bottom";
  shape?: "square" | "phone";
  art?: ReactNode;
  fallback?: ReactNode;
  eager?: boolean;
  children: ReactNode;
}) {
  const isSide = overflow === "side";
  const isBottom = overflow === "bottom";
  const isPhone = shape === "phone";

  // Image : 160 px en mobile, 320 px à partir de md. Elle dépasse d'environ 30 % de sa hauteur.
  // En "bottom", l'image prend toute la largeur de la carte et dépasse par le bas.
  const top = "-top-12 md:-top-24";
  const horizontal = side === "left" ? "left-6 md:left-10" : "right-6 md:right-10";
  const position = isPhone
    ? `w-36 -top-16 md:w-52 md:-top-24 ${horizontal}`
    : isBottom
      ? "inset-x-6 -bottom-12 h-40 md:inset-x-10 md:-bottom-24 md:h-72"
      : isSide
        ? `h-40 w-40 md:h-80 md:w-80 ${top} ${horizontal} ${side === "left" ? "xl:-left-16" : "xl:-right-16"} xl:top-1/2 xl:-translate-y-1/2`
        : `h-40 w-40 md:h-80 md:w-80 ${top} ${horizontal}`;

  // Le texte ne passe jamais sous l'image : place réservée en haut, en bas, ou sur le côté en xl.
  const padding = isPhone
    ? `pt-[17rem] md:min-h-[24rem] md:pt-10 ${side === "left" ? "md:pl-72" : "md:pr-72"}`
    : isBottom
      ? "pb-32 md:pb-56"
      : isSide
        ? `pt-32 md:pt-60 xl:flex xl:min-h-80 xl:items-center xl:pt-10 ${side === "left" ? "xl:pl-80" : "xl:pr-80"}`
        : "pt-32 md:pt-60";
  const sizes = isBottom ? "(min-width: 1024px) 560px, 100vw" : "(min-width: 768px) 320px, 160px";

  return (
    <div
      data-popout-card
      className={`relative h-full overflow-visible rounded-3xl border border-line bg-gradient-to-b from-accent/[0.06] to-transparent p-6 sm:p-10 ${padding}`}
    >
      <div className={`pointer-events-none absolute z-10 ${position}`}>
        <PopOutArt src={src} alt={alt} art={art} fallback={fallback} sizes={sizes} eager={eager} />
      </div>

      <div className="relative flex h-full flex-col">{children}</div>
    </div>
  );
}

// Visuel détouré : halo, ombre réaliste, parallaxe au scroll. Remplit son conteneur (qui doit avoir une taille).
// `art` remplace l'image (ex. mockup iPhone) tout en gardant halo, ombre et parallaxe.
export function PopOutArt({
  src,
  alt,
  art,
  fallback,
  sizes,
  eager = false,
}: {
  src: string;
  alt: string;
  art?: ReactNode;
  fallback?: ReactNode;
  sizes: string;
  eager?: boolean;
}) {
  const exists = !art && src !== "" && existsSync(path.join(process.cwd(), "public", src));

  return (
    <PopOutParallax>
      <div className="relative h-full w-full">
        <div className="absolute inset-[15%] rounded-full bg-foreground/10 blur-3xl" aria-hidden="true" />
        <div className="relative h-full w-full drop-shadow-[0_30px_40px_var(--shadow-pop)]">
          {art ? (
            art
          ) : exists ? (
            <Image
              src={src}
              alt={alt}
              fill
              sizes={sizes}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : undefined}
              className="object-contain"
            />
          ) : (
            fallback && (
              <div role="img" aria-label={alt} className="h-full w-full">
                {fallback}
              </div>
            )
          )}
        </div>
      </div>
    </PopOutParallax>
  );
}
