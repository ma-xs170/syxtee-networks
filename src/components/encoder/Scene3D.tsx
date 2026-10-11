"use client";

import { useEffect, useRef } from "react";
import type { SceneHandle, SceneKind } from "./scenes3d/engine";

/** Diorama 3D : three.js n'est chargé que lorsque la carte approche de l'écran, et le rendu s'arrête dès qu'elle en sort. */
export default function Scene3D({ kind, label }: { kind: SceneKind; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let handle: SceneHandle | null = null;
    let disposed = false;
    const io = new IntersectionObserver(
      async ([e]) => {
        const visible = e.isIntersecting;
        if (visible && !handle) {
          try {
            const m = await import("./scenes3d/engine");
            if (disposed) return;
            handle = m.createScene(canvas, kind);
          } catch {
            handle = null; // WebGL indisponible : la carte garde son titre
          }
        }
        handle?.setActive(visible);
      },
      { rootMargin: "160px" },
    );
    io.observe(canvas);
    return () => {
      disposed = true;
      io.disconnect();
      handle?.dispose();
    };
  }, [kind]);
  return (
    <div className="h-full w-full">
      <canvas ref={ref} role="img" aria-label={label} className="block h-full w-full" />
    </div>
  );
}
