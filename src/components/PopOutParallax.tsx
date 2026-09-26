"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Monte son contenu de 20 px quand l'élément observé entre à l'écran. Rien si prefers-reduced-motion.
export default function PopOutParallax({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // On observe la carte (le parent positionné), pas l'image qui déborde.
    const target = el.closest("[data-popout-card]") ?? el;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="h-full w-full transition-transform duration-700 ease-out motion-reduce:transform-none motion-reduce:transition-none"
      style={{ transform: visible ? "translateY(-20px)" : "translateY(0)" }}
    >
      {children}
    </div>
  );
}
