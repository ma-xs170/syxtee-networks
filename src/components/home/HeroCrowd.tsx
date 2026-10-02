import Image from "next/image";
import { streamerPhotos } from "@/lib/streamer-photos";
import type { HomeStreamer } from "@/lib/streamers";

// Rangée de streamers sous les boutons du hero, derrière la fenêtre de démo (qui la recouvre par le bas).
// 1. Photos détourées de public/images/streamers (src/lib/streamer-photos.ts) : grises, tramées de points, se fondant vers le bas.
// 2. À défaut, les avatars Twitch des streamers inscrits avec consentement (public_streamers), au même traitement.
// Rien ne s'affiche sans au moins 3 photos ou 4 avatars.

const MAX = 8;
const HEIGHTS = ["h-52 sm:h-72", "h-60 sm:h-80", "h-56 sm:h-[19rem]", "h-64 sm:h-[22rem]", "h-56 sm:h-[19rem]", "h-60 sm:h-80", "h-52 sm:h-72", "h-56 sm:h-[19rem]"];

export function hasCrowd(streamers: HomeStreamer[]) {
  return streamerPhotos.length >= 3 || streamers.filter((s) => s.avatar).length >= 4;
}

export default function HeroCrowd({ streamers }: { streamers: HomeStreamer[] }) {
  const cutouts = streamerPhotos.length >= 3;
  const faces = streamers.filter((s) => s.avatar).slice(0, MAX);
  if (!cutouts && faces.length < 4) return null;

  return (
    <div aria-hidden="true" className="halftone-fade pointer-events-none relative z-0 mx-auto -mb-28 flex max-w-6xl items-end justify-center overflow-hidden px-4 sm:-mb-40">
      {cutouts
        ? streamerPhotos.slice(0, MAX).map((src, i) => (
            <div key={src} className={`float-slow relative aspect-[3/4] shrink-0 -mx-4 sm:-mx-6 ${HEIGHTS[i % HEIGHTS.length]} ${i > 3 ? "hidden lg:block" : ""}`}>
              <Image src={src} alt="" fill sizes="280px" className="halftone object-contain object-bottom" />
            </div>
          ))
        : faces.map((s, i) => (
            <div key={s.handle} className={`float-slow relative aspect-[3/4] shrink-0 -mx-3 overflow-hidden rounded-[2rem] sm:-mx-5 ${HEIGHTS[i % HEIGHTS.length]} ${i > 3 ? "hidden lg:block" : ""}`}>
              <Image src={s.avatar!} alt="" fill sizes="240px" className="halftone object-cover" />
            </div>
          ))}
    </div>
  );
}
