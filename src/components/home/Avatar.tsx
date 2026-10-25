"use client";

import Image from "next/image";
import { useState } from "react";

// Photo de profil ronde ; si l'image manque ou ne charge pas, la première lettre du pseudo prend la place.
export default function Avatar({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg font-semibold uppercase text-muted">{name.charAt(0)}</span>;
  }
  return <Image src={src} alt="" width={96} height={96} onError={() => setFailed(true)} className="size-12 shrink-0 rounded-full object-cover" />;
}
