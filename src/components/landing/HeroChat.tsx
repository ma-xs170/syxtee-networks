"use client";

import { useEffect, useState } from "react";

// Faux chat Twitch posé sur le hero : ambiance d'un direct IRL, messages qui arrivent un à un et défilent vers le haut.
// Purement décoratif (aria-hidden). Sous prefers-reduced-motion : quelques messages fixes, sans défilement.
type Badge = "mod" | "sub" | "vip" | "";
type Msg = { u: string; c: string; t: string; b?: Badge };

const MSGS: Msg[] = [
  { u: "kev_971", c: "#ff7a45", t: "ça passe nickel en 4G là 😳", b: "sub" },
  { u: "Lilou_gwada", c: "#c084fc", t: "le débit tient même dans la foule", b: "sub" },
  { u: "mod_Tony", c: "#4ade80", t: "pas de coupure depuis 2h, propre", b: "mod" },
  { u: "xX_Marco_Xx", c: "#60a5fa", t: "LET'S GOOO 🔥🔥" },
  { u: "ptitbeur", c: "#f472b6", t: "la qualité de l'image est folle" },
  { u: "JayDee", c: "#fbbf24", t: "c'est quoi comme relais ?", b: "sub" },
  { u: "Nadège_Q", c: "#2dd4bf", t: "SRTLA, il l'a dit tout à l'heure", b: "vip" },
  { u: "tiboo_irl", c: "#fb7185", t: "j'ai failli rater le live, heureusement 😂" },
  { u: "mod_Tony", c: "#4ade80", t: "on a 2 800 viewers, merci tout le monde ❤️", b: "mod" },
  { u: "Sam_Fwi", c: "#a78bfa", t: "même sur le bateau ça lag pas wtf", b: "sub" },
  { u: "Dorian.b", c: "#38bdf8", t: "gg le cadreur 👏" },
  { u: "Chacha", c: "#f97316", t: "l'ambiance est incroyable", b: "sub" },
  { u: "Ruben_971", c: "#84cc16", t: "tu peux zoomer sur la scène ?" },
  { u: "mimi_stream", c: "#e879f9", t: "j'étais en Guadeloupe l'an dernier, ça me manque 🥲" },
  { u: "KaribBoy", c: "#22d3ee", t: "SUB hype 💜", b: "vip" },
  { u: "Océane_L", c: "#fb923c", t: "le son est parfait aussi" },
  { u: "Maxou", c: "#facc15", t: "premier ici 😎" },
  { u: "Joss_GP", c: "#f87171", t: "qui est là pour le feu d'artifice ?", b: "sub" },
];

const MAX = 13;

// Pastille de plateforme (Twitch violet ou YouTube rouge), comme sur un chat incrusté dans une vidéo.
function Platform({ id }: { id: number }) {
  const tw = id % 3 === 0;
  return (
    <span className={`mr-1.5 inline-grid h-[11px] w-[15px] translate-y-[1px] place-items-center rounded-[3px] ${tw ? "bg-[#9146ff]" : "bg-[#ff0000]"}`}>
      <svg viewBox="0 0 8 8" className="size-[6px] fill-white"><path d={tw ? "M1 0h7v5L5.5 7.5H4L2.5 8V7.5H1zm2 1v3h1V1zm2 0v3h1V1z" : "M1 0l6 4-6 4z"} /></svg>
    </span>
  );
}

export default function HeroChat() {
  const [list, setList] = useState<(Msg & { id: number })[]>([]);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0;
    let id = 0;
    const push = () => {
      const m = MSGS[i % MSGS.length];
      i += 1;
      id += 1;
      setList((l) => [...l.slice(-(MAX - 1)), { ...m, id }]);
    };
    if (still) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- l'état initial dépend de matchMedia, inconnu côté serveur
      setList(MSGS.slice(0, MAX).map((m, n) => ({ ...m, id: n })));
      return;
    }
    let timer: number;
    const loop = () => {
      push();
      timer = window.setTimeout(loop, 600 + Math.random() * 1300);
    };
    timer = window.setTimeout(loop, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-[calc(65px+0.5rem)] z-10 hidden w-[17rem] flex-col justify-end gap-[3px] overflow-hidden text-[12.5px] leading-[1.35] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_0_8px_rgba(0,0,0,0.6)] sm:flex lg:right-6"
      style={{ height: "21rem", maskImage: "linear-gradient(to bottom, transparent 0%, #000 22%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 22%)" }}
    >
      {list.map((m) => (
        <p key={m.id} className="chat-in">
          <Platform id={m.id} />
          <span className="font-semibold" style={{ color: m.c }}>{m.u}</span>
          <span>: </span>
          {m.t}
        </p>
      ))}
    </div>
  );
}
