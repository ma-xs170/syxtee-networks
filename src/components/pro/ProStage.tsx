"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { motion, useTransform, type MotionValue } from "motion/react";
import { useStoryActive } from "@/components/story/StoryContext";
import { band, lerp, ramp } from "@/components/story/timeline";
import ProExploded from "./ProExploded";
import { PlacesRow } from "./ProPlaces";
import { PRO_TIMELINE as TL } from "./timeline";

// Visuel persistant de l'histoire SYXTEE PRO : scène 3D chargée à la demande (client uniquement),
// avec le défilé de lieux filaires derrière pendant la scène « Partout ». Sans WebGL : vue éclatée SVG statique.

const ProScene3D = dynamic(() => import("./ProScene3D"), { ssr: false, loading: () => <ProExploded /> });

let webglCache: boolean | undefined;
function hasWebGL() {
  if (webglCache === undefined) {
    try {
      const c = document.createElement("canvas");
      webglCache = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webglCache = false;
    }
  }
  return webglCache;
}
const noop = () => () => {};
const useWebGL = () => useSyncExternalStore(noop, hasWebGL, () => false);

export default function ProStage({ p }: { p: MotionValue<number> }) {
  const active = useStoryActive() ?? true;
  const webgl = useWebGL();
  const placesOpacity = useTransform(p, (v) => 0.55 * band(v, ...TL.places));
  const x = useTransform(p, (v) => `${lerp(8, -62, ramp(v, TL.places[0], TL.places[3]))}%`);

  return (
    <div className="relative h-full w-full">
      <motion.div style={{ opacity: placesOpacity }} className="fade-x pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden" aria-hidden="true">
        <motion.div style={{ x }} className="w-max">
          <PlacesRow />
        </motion.div>
      </motion.div>
      {webgl ? (
        <div className="absolute inset-0">
          <ProScene3D p={p} active={active} />
        </div>
      ) : (
        <ProExploded />
      )}
    </div>
  );
}
