"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";

// Aperçu du programme. Les images arrivent environ 10 fois par seconde : elles ne passent jamais par l'état React
// (cela re-rendrait tout le Studio à chaque image). Chaque image est décodée hors du fil principal, puis dessinée
// sur un canvas au prochain rafraîchissement d'écran. Si plusieurs images arrivent entre deux rafraîchissements,
// seule la plus récente est dessinée.

export type FrameSink = MutableRefObject<((dataUrl: string) => void) | null>;

export default function ProgramPreview({ sinkRef, program, live, title = "Programme", tag = "" }: { sinkRef: FrameSink; program: string; live: boolean; title?: string; tag?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    let latest: string | null = null;
    let decoding = false;
    let raf = 0;
    let gone = false;
    let shown = false;

    const draw = (bmp: ImageBitmap) => {
      const c = canvas.current;
      if (!c || gone) return bmp.close();
      if (c.width !== bmp.width || c.height !== bmp.height) {
        c.width = bmp.width;
        c.height = bmp.height;
      }
      c.getContext("2d")?.drawImage(bmp, 0, 0);
      bmp.close();
      if (!shown) {
        shown = true;
        setHasFrame(true);
      }
    };

    const pump = async () => {
      raf = 0;
      if (decoding || latest === null || gone) return;
      const src = latest;
      latest = null;
      decoding = true;
      try {
        const blob = await (await fetch(src)).blob();
        const bmp = await createImageBitmap(blob);
        // Dessin au prochain rafraîchissement : pas de déchirure, pas de travail inutile en onglet caché.
        requestAnimationFrame(() => draw(bmp));
      } catch {
        // Image illisible : on attend la suivante.
      } finally {
        decoding = false;
        if (latest !== null && !raf) raf = requestAnimationFrame(() => void pump());
      }
    };

    sinkRef.current = (src) => {
      latest = src;
      if (!decoding && !raf && !document.hidden) raf = requestAnimationFrame(() => void pump());
    };
    return () => {
      gone = true;
      sinkRef.current = null;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [sinkRef]);

  return (
    <div className="relative h-full w-full" data-live={live} data-tag={tag}>
      <canvas ref={canvas} role="img" aria-label={`${title} : ${program}`} className={`absolute inset-0 h-full w-full object-contain ${hasFrame ? "opacity-100" : "opacity-0"}`} />
      {!hasFrame && <div className="absolute inset-0 grid place-items-center text-[13px] text-neutral-400">En attente de l&apos;image…</div>}
    </div>
  );
}
