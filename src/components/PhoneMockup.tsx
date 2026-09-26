import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";

// Mockup iPhone en CSS (cadre noir arrondi + Dynamic Island) autour d'une capture d'écran.
// Remplit la largeur de son conteneur. Tant que la capture n'existe pas, affiche un écran « Capture à venir ».
export default function PhoneMockup({
  src,
  alt,
  sizes = "240px",
  eager = false,
}: {
  src: string;
  alt: string;
  sizes?: string;
  eager?: boolean;
}) {
  const exists = existsSync(path.join(process.cwd(), "public", src));

  return (
    <div
      className="relative w-full rounded-[18%/8.3%] bg-neutral-900 p-[3.5%] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
      style={{ aspectRatio: "9 / 19.5" }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[14%/6.5%] bg-black">
        {exists ? (
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
          <div role="img" aria-label={`Capture à venir : ${alt}`} className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
              <path d="M10.5 5h3" />
            </svg>
            <p className="font-mono text-[10px] leading-snug text-muted">Capture à venir : {alt}</p>
          </div>
        )}
        {/* Dynamic Island */}
        <div className="absolute left-1/2 top-[2.2%] h-[3.6%] w-[30%] -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
      </div>
    </div>
  );
}
