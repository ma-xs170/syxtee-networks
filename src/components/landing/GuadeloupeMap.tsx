import { GP_DOTS, GP_OUTLINE, GP_PIN, GP_VIEW } from "./guadeloupe-geo";

// Fond de l'appel final : la Guadeloupe en points et en contour fin (couleurs d'encre du thème), avec un repère sur Petit-Bourg.
// Dessin statique (aucun script) ; le repère pulse doucement, immobile sous prefers-reduced-motion.
export default function GuadeloupeMap() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center text-foreground">
      <svg viewBox={`0 0 ${GP_VIEW.w} ${GP_VIEW.h}`} className="h-[96%] w-auto max-w-none" fill="none" style={{ maskImage: "radial-gradient(closest-side, #000 55%, transparent 100%)", WebkitMaskImage: "radial-gradient(closest-side, #000 55%, transparent 100%)" }}>
        <path d={GP_DOTS} stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity="0.22" />
        <path d={GP_OUTLINE} stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" opacity="0.5" />
        <g transform={`translate(${GP_PIN.x} ${GP_PIN.y})`}>
          <circle r="16" fill="var(--bad)" opacity="0.28" className="animate-ping motion-reduce:animate-none" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
          <circle r="5.5" fill="var(--bad)" />
        </g>
      </svg>
    </div>
  );
}
