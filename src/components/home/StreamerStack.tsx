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
  const picks = (order ?? [...withAvatar.keys()]).slice(0, 5).map((i) => withAvatar[i]).filter(Boolean);
  if (picks.length === 0) return null;
  const more = streamers.length - picks.length;
  return (
    <a href="#mur-titre" className="stack group mx-auto inline-flex items-center gap-4 rounded-full px-2 py-1 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
      <span className="flex" aria-hidden="true">
        {picks.map((s, i) => (
          <Image
            key={s.handle}
            src={s.avatar!}
            alt=""
            width={96}
            height={96}
            style={{ "--i": i } as React.CSSProperties}
            className={`stack-av h-12 w-12 rounded-full border-2 border-background object-cover transition-[margin] duration-300 ${i ? "-ml-3 group-hover:-ml-1" : ""}`}
          />
        ))}
        {more > 0 && (
          <span style={{ "--i": picks.length } as React.CSSProperties} className="stack-av -ml-3 flex h-12 min-w-12 items-center justify-center rounded-full border-2 border-background bg-surface-2 px-2 text-sm font-medium tabular-nums transition-[margin] duration-300 group-hover:-ml-1">
            +{more}
          </span>
        )}
      </span>
      <span className="text-base text-muted">Ils diffusent déjà avec nous</span>
    </a>
  );
}
