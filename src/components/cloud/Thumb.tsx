"use client";

import { useEffect, useState } from "react";
import { coreFetch } from "@/components/dashboard/coreClient";

// Vignette d'un flux : l'image JPEG du Core (une toutes les 3 s), relue tant que le flux est en direct et l'onglet visible.
export default function Thumb({ coreUrl, relayId, live, alt }: { coreUrl: string; relayId: string; live: boolean; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!live) return;
    let stop = false;
    let url: string | null = null;
    async function load() {
      if (document.hidden) return;
      try {
        const res = await coreFetch(coreUrl, `/v1/me/relays/${relayId}/preview.jpg`);
        if (!res.ok || stop) return;
        const next = URL.createObjectURL(await res.blob());
        if (stop) return URL.revokeObjectURL(next);
        const old = url;
        url = next;
        setSrc(next);
        if (old) URL.revokeObjectURL(old);
      } catch {
        /* la vignette précédente reste affichée */
      }
    }
    void load();
    const id = setInterval(load, 3000);
    return () => {
      stop = true;
      clearInterval(id);
      if (url) URL.revokeObjectURL(url);
    };
  }, [coreUrl, relayId, live]);

  // eslint-disable-next-line @next/next/no-img-element -- image blob privée, pas optimisable par next/image
  return live && src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : null;
}
