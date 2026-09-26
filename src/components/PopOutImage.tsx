import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import type { ReactNode } from "react";
import PopOutParallax from "./PopOutParallax";

// Carte dont l'image PNG transparente déborde du cadre.
// overflow="side" ne s'active qu'à partir de xl : en dessous, l'image déborderait de l'écran,
// elle dépasse donc par le haut comme overflow="top".
export default function PopOutImage({
  src,
  alt,
  side = "right",
  overflow = "top",
  fallback,
  children,
}: {
  src: string;
  alt: string;
  side?: "left" | "right";
  overflow?: "top" | "side";
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const isSide = overflow === "side";

  // Image : 160 px en mobile, 320 px à partir de md. Elle dépasse d'environ 30 % de sa hauteur.
  const top = "-top-12 md:-top-24";
  const horizontal = side === "left" ? "left-6 md:left-10" : "right-6 md:right-10";
  const position = isSide
    ? `${top} ${horizontal} ${side === "left" ? "xl:-left-16" : "xl:-right-16"} xl:top-1/2 xl:-translate-y-1/2`
    : `${top} ${horizontal}`;

  // Le texte ne passe jamais sous l'image : place réservée en haut, ou sur le côté en xl.
  const padding = isSide
    ? `pt-32 md:pt-60 xl:flex xl:min-h-80 xl:items-center xl:pt-10 ${side === "left" ? "xl:pl-80" : "xl:pr-80"}`
    : "pt-32 md:pt-60";

  return (
    <div
      data-popout-card
      className={`relative overflow-visible rounded-3xl border border-line bg-gradient-to-b from-white/[0.06] to-transparent p-6 sm:p-10 ${padding}`}
    >
      <div className={`pointer-events-none absolute z-10 h-40 w-40 md:h-80 md:w-80 ${position}`}>
        <PopOutArt src={src} alt={alt} fallback={fallback} sizes="(min-width: 768px) 320px, 160px" />
      </div>

      <div className="relative">{children}</div>
    </div>
  );
}

// Visuel détouré : halo, ombre réaliste, parallaxe au scroll. Remplit son conteneur (qui doit avoir une taille).
export function PopOutArt({
  src,
  alt,
  fallback,
  sizes,
  eager = false,
}: {
  src: string;
  alt: string;
  fallback?: ReactNode;
  sizes: string;
  eager?: boolean;
}) {
  const exists = existsSync(path.join(process.cwd(), "public", src));

  return (
    <PopOutParallax>
      <div className="relative h-full w-full">
        <div className="absolute inset-[15%] rounded-full bg-white/5 blur-3xl" aria-hidden="true" />
        <div className="relative h-full w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.8)]">
          {exists ? (
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
