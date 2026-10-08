import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import GlassIcon from "../ui/GlassIcon";
import { visual } from "@/lib/visuals";

// Emplacement d'image : si `public/visuals/<name>.(avif|webp|png|jpg)` existe, on l'affiche avec next/image (ratio fixe, chargement différé, AVIF/WebP) ;
// sinon un placeholder soigné (dégradé, icône verre, nom du visuel attendu), jamais un carré gris vide. Composant serveur.
const EXT = ["avif", "webp", "png", "jpg"];
const BLUR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjUiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjUiIGZpbGw9IiMxMTExMTMiLz48L3N2Zz4=";

export default function VisualSlot({ name, className = "", fallback }: { name: string; className?: string; fallback?: React.ReactNode }) {
  const spec = visual(name);
  const ext = EXT.find((e) => fs.existsSync(path.join(process.cwd(), "public", "visuals", `${name}.${e}`)));
  if (!ext && fallback) return <div className={className}>{fallback}</div>;
  const [w, h] = spec.size.split(" x ").map(Number);
  return (
    <div className={`relative w-full overflow-hidden rounded-xl ${className}`} style={{ aspectRatio: spec.ratio }}>
      {ext ? (
        <Image src={`/visuals/${name}.${ext}`} alt={spec.label} width={w} height={h} sizes="(min-width: 1024px) 40vw, 90vw" loading="lazy" placeholder="blur" blurDataURL={BLUR} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 border border-dashed border-line bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--foreground)_10%,transparent),transparent_65%),var(--surface)]">
          <GlassIcon size={48}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <circle cx="9" cy="10" r="1.5" />
              <path d="M21 16l-5-5-8 9" />
            </svg>
          </GlassIcon>
          <p className="px-4 text-center font-mono text-xs text-muted">
            {spec.label}
            <span className="block text-foreground/40">{name} · {spec.size}</span>
          </p>
        </div>
      )}
    </div>
  );
}
