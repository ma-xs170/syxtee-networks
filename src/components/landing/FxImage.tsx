import Image from "next/image";

// Photo traitée comme les vidéos du hero : aberration chromatique (rouge à gauche, bleu à droite), grain de pellicule et trame de petits pixels.
export default function FxImage({ src, alt = "", sizes, priority, className = "" }: { src: string; alt?: string; sizes: string; priority?: boolean; className?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg width="0" height="0" className="absolute" focusable="false" aria-hidden="true">
        <filter id="fx-ca" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feOffset in="r" dx="-3" dy="0" result="ro" />
          <feOffset in="b" dx="3" dy="0" result="bo" />
          <feBlend in="ro" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="bo" mode="screen" />
        </filter>
      </svg>
      <div className="absolute -inset-2" style={{ filter: "url(#fx-ca)" }}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />
      </div>
      <div className="film-grain" />
      <div className="absolute inset-0 opacity-70 mix-blend-multiply" style={{ backgroundImage: "linear-gradient(to right, rgba(0,0,0,.7) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.7) 1px, transparent 1px)", backgroundSize: "2px 2px" }} />
    </div>
  );
}
