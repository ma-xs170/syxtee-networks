import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";

// Bloc photo avec légende. Tant que le fichier n'est pas dans public/, affiche un cadre « Photo à venir ».
export default function Figure({
  src,
  alt,
  caption,
  ratio = "16/9",
  sizes = "(min-width: 1024px) 560px, 100vw",
  eager = false,
  fit = "cover",
}: {
  src: string;
  alt: string;
  caption?: string;
  ratio?: string;
  sizes?: string;
  eager?: boolean; // image visible dès l'arrivée sur la page : chargée en priorité au lieu de lazy
  fit?: "cover" | "contain"; // contain pour les photos qu'on n'a pas le droit de rogner (licences ND)
}) {
  const exists = existsSync(path.join(process.cwd(), "public", src));

  return (
    <figure>
      {exists ? (
        <div className="relative overflow-hidden rounded-2xl border border-line" style={{ aspectRatio: ratio }}>
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : undefined}
            className={fit === "contain" ? "object-contain" : "object-cover"}
          />
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-white/[0.02] p-6 text-center"
          style={{ aspectRatio: ratio }}
          role="img"
          aria-label={`Photo à venir : ${alt}`}
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.3l1.4-2h7.6l1.4 2h2.3A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          <p className="max-w-xs font-mono text-xs text-muted">Photo à venir : {alt}</p>
        </div>
      )}
      {caption && <figcaption className="mt-3 font-mono text-xs text-muted">{caption}</figcaption>}
    </figure>
  );
}
