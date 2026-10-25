"use client";

import Image from "next/image";
import { useRef, useState } from "react";

// Image de polaroïd qui laisse place à une vraie vidéo au survol (ou au focus clavier). Même traitement que le hero :
// flou de mouvement (dans le fichier), aberration chromatique, ombre sur les bords, mais sans trame de pixels.
// Sans survol (écran tactile) ou sous prefers-reduced-motion : l'image reste affichée.
export default function HoverVideo({ src, video }: { src: string; video: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);

  const start = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setOn(true);
    const v = ref.current;
    if (v) { v.currentTime = 0; void v.play().catch(() => {}); }
  };
  const stop = () => {
    setOn(false);
    window.setTimeout(() => ref.current?.pause(), 350);
  };

  return (
    <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-[2px]" onMouseEnter={start} onMouseLeave={stop} onFocus={start} onBlur={stop}>
      <Image src={src} alt="" width={600} height={800} sizes="260px" className="aspect-[3/4] w-full object-cover" />
      <svg width="0" height="0" className="absolute" focusable="false" aria-hidden="true">
        <filter id="ev-ca" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feOffset in="r" dx="-2" dy="0" result="ro" />
          <feOffset in="b" dx="2" dy="0" result="bo" />
          <feBlend in="ro" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="bo" mode="screen" />
        </filter>
      </svg>
      <span aria-hidden="true" className={`absolute inset-0 transition-opacity duration-300 motion-reduce:hidden ${on ? "opacity-100" : "opacity-0"}`}>
        <video ref={ref} className="absolute -inset-1 size-[calc(100%+0.5rem)] max-w-none object-cover" style={{ filter: "url(#ev-ca)" }} muted loop playsInline preload="none">
          <source src={`${video}.webm`} type="video/webm" />
          <source src={`${video}.mp4`} type="video/mp4" />
        </video>
        <span className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 45%, transparent 50%, rgba(0,0,0,0.55) 100%)" }} />
      </span>
    </span>
  );
}
