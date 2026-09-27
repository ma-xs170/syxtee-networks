"use client";

import { useEffect, useState } from "react";
import { coreFetch } from "./coreClient";

// Aperçu : dernière vignette du flux (toutes les 3 s), servie par le Core au seul propriétaire du flux.

export default function StreamPreview({ coreUrl }: { coreUrl: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let current: string | null = null;
    let stopped = false;
    const load = async () => {
      try {
        const res = await coreFetch(coreUrl, "/v1/me/preview.jpg");
        const next = res.ok ? URL.createObjectURL(await res.blob()) : null;
        if (stopped) return next && URL.revokeObjectURL(next);
        if (current) URL.revokeObjectURL(current);
        current = next;
        setSrc(next);
      } catch {
        // Relais injoignable : on garde la dernière image, prochain essai dans 3 s.
      }
    };
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 3000);
    return () => {
      stopped = true;
      clearInterval(t);
      if (current) URL.revokeObjectURL(current);
    };
  }, [coreUrl]);

  return (
    <section className="overflow-hidden rounded-2xl border border-line" aria-labelledby="apercu">
      <h2 id="apercu" className="sr-only">
        Aperçu du flux
      </h2>
      <div className="relative aspect-video bg-white/[0.02]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- image locale (blob:), rafraîchie toutes les 3 s
          <img src={src} alt="Aperçu de ton flux" className="h-full w-full object-cover" />
        ) : (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted">L&apos;aperçu apparaît dès que ton flux est en ligne.</p>
        )}
        {src && <span className="absolute left-3 top-3 rounded bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white">Aperçu · 3 s</span>}
      </div>
    </section>
  );
}
