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

const MAX = 6;

function Badge({ kind }: { kind: Badge }) {
  if (!kind) return null;
  const style = kind === "mod" ? "bg-[#00ad03]" : kind === "sub" ? "bg-[#8b5cf6]" : "bg-[#e91e63]";
  return (
    <span className={`mr-1.5 inline-grid size-[15px] translate-y-[2px] place-items-center rounded-[3px] ${style}`}>
      <svg viewBox="0 0 16 16" className="size-[10px] fill-white"><path d={kind === "mod" ? "M2 14l2-4 6-6 2 2-6 6zm9-12l3 3-2 2-3-3z" : "M8 1l2.2 4.6 5 .7-3.6 3.5.9 5L8 12.4 3.5 14.8l.9-5L.8 6.3l5-.7z"} /></svg>
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
      setList(MSGS.slice(0, MAX).map((m, n) => ({ ...m, id: n })));
      return;
    }
    let timer: number;
    const loop = () => {
      push();
      timer = window.setTimeout(loop, 900 + Math.random() * 1700);
    };
    timer = window.setTimeout(loop, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-8 left-4 z-10 hidden w-[19.5rem] flex-col justify-end gap-1.5 text-[13px] leading-snug sm:flex lg:bottom-12 lg:left-8"
      style={{ maskImage: "linear-gradient(to bottom, transparent 0%, #000 45%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 45%)" }}
    >
      {list.map((m) => (
        <p key={m.id} className="chat-in rounded-md bg-black/45 px-2.5 py-1.5 text-white/90 backdrop-blur-[2px]">
          <Badge kind={m.b ?? ""} />
          <span className="font-semibold" style={{ color: m.c }}>{m.u}</span>
          <span className="text-white/60">: </span>
          {m.t}
        </p>
      ))}
    </div>
  );
}
