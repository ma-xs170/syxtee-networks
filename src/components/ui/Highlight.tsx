"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Surlignage blanc d'une partie de titre (un seul par titre, jamais dans un paragraphe).
// À l'apparition, une seule fois : le fond blanc se déroule de gauche à droite en 0,6 s et le texte passe au noir,
// 0,15 s après l'entrée à l'écran. Dans un ScrollStory (titres empilés en fondu), il attend aussi que son bloc soit
// réellement visible (opacité des parents ≥ 0,5). prefers-reduced-motion : surligné d'emblée, sans animation.

/** Vrai si aucun parent n'a une opacité inline < 0,5 (fondus pilotés par motion). */
function ancestorsVisible(el: HTMLElement) {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const o = n.style.opacity;
    if (o !== "" && parseFloat(o) < 0.5) return false;
  }
  return true;
}

export default function Highlight({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let poll: ReturnType<typeof setInterval> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        clearInterval(poll);
        if (!e.isIntersecting) return;
        const check = () => {
          if (!ancestorsVisible(el)) return;
          clearInterval(poll);
          io.disconnect();
          timer = setTimeout(() => setOn(true), 150);
        };
        check();
        if (!timer) poll = setInterval(check, 120);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearInterval(poll);
      clearTimeout(timer);
    };
  }, []);

  return (
    <span
      ref={ref}
      data-on={on}
      className="rounded-[2px] bg-[linear-gradient(var(--accent),var(--accent))] bg-[length:0%_100%] bg-left bg-no-repeat px-1 text-inherit transition-[background-size,color] duration-[600ms] ease-out [-webkit-box-decoration-break:clone] [box-decoration-break:clone] data-[on=true]:bg-[length:100%_100%] data-[on=true]:text-on-accent motion-reduce:bg-[length:100%_100%] motion-reduce:text-on-accent motion-reduce:transition-none"
    >
      {children}
    </span>
  );
}
