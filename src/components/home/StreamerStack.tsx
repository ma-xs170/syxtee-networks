"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Avatar = { handle: string; avatar: string | null };

/** Hero : avatars de quelques streamers tirés au hasard (pile de cercles qui se chevauchent) + « Ils diffusent déjà avec nous ». Renvoie vers le mur de chaînes. */
export default function StreamerStack({ streamers }: { streamers: Avatar[] }) {
  const withAvatar = streamers.filter((s) => s.avatar);
  // Ordre de départ identique sur le serveur et dans le navigateur ; le tirage au hasard se fait après l'affichage (callback d'effet).
  const [order, setOrder] = useState<number[] | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOrder([...withAvatar.keys()].sort(() => Math.random() - 0.5)));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamers]);
  const picks = (order ?? [...withAvatar.keys()]).slice(0, 4).map((i) => withAvatar[i]).filter(Boolean);
  if (picks.length === 0) return null;
  return (
    <a href="#mur-titre" className="mx-auto inline-flex items-center gap-4 rounded-full px-2 py-1 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
      <span className="flex" aria-hidden="true">
        {picks.map((s, i) => (
          <Image key={s.handle} src={s.avatar!} alt="" width={96} height={96} className={`h-12 w-12 rounded-full border-2 border-background object-cover ${i ? "-ml-3" : ""}`} />
        ))}
      </span>
      <span className="text-base text-muted">Ils diffusent déjà avec nous</span>
    </a>
  );
}
