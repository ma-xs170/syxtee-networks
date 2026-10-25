"use client";

import Image from "next/image";
import { useRef, useState } from "react";

// Polaroïd vidéo : une image extraite de la vidéo et un bouton lecture montrent qu'il y a de la vidéo ; elle démarre au survol (ou au focus clavier). Même traitement que le hero :
// grain de pellicule, ombre sur les bords, mais sans trame de pixels.
// Sans survol (écran tactile) ou sous prefers-reduced-motion : l'image extraite reste affichée.
export default function HoverVideo({ video, mark }: { video: string; mark?: boolean }) {
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
      <Image src={`${video}.jpg`} alt="" width={720} height={960} sizes="(min-width: 560px) 260px, 100vw" quality={90} className="aspect-[3/4] w-full object-cover" />
      {mark && <Image src="/images/syxtee-networks-mark.webp" alt="" width={600} height={92} sizes="140px" className="pointer-events-none absolute left-1/2 top-[6%] z-10 w-[50%] -translate-x-1/2" />}
      <span aria-hidden="true" className={`absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-black/55 backdrop-blur-sm transition-opacity duration-300 motion-reduce:opacity-100 ${on ? "opacity-0" : "opacity-100"}`}>
        <svg viewBox="0 0 10 10" className="ml-0.5 size-3 fill-white"><path d="M1 0l9 5-9 5z" /></svg>
      </span>
      <span aria-hidden="true" className={`absolute inset-0 transition-opacity duration-300 motion-reduce:hidden ${on ? "opacity-100" : "opacity-0"}`}>
        <video ref={ref} className="absolute inset-0 size-full object-cover" muted loop playsInline preload="none">
          <source src={`${video}.webm`} type="video/webm" />
          <source src={`${video}.mp4`} type="video/mp4" />
        </video>
        <span className="film-grain" />
        <span className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 45%, transparent 50%, rgba(0,0,0,0.55) 100%)" }} />
      </span>
    </span>
  );
}
