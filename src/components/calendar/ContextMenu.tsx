"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Menu du clic droit (comme Apple Calendrier) : « Nouveau live », « Coller le live » sur un créneau vide ; « Modifier », « Copier »,
// « Dupliquer », « Supprimer » sur un live. Se ferme au clic ailleurs, au défilement, à Échap ; flèches haut/bas pour naviguer.

export type MenuItem = { label: string; onSelect: () => void; disabled?: boolean; danger?: boolean };

export default function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // Reste entièrement visible : le menu se replie vers la gauche ou le haut près d'un bord de la fenêtre.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ left: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)), top: Math.max(8, Math.min(y, window.innerHeight - r.height - 8)) });
    el.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [x, y]);

  useEffect(() => {
    const away = (e: Event) => {
      if (!box.current?.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const list = [...(box.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
      const i = list.indexOf(document.activeElement as HTMLButtonElement);
      list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length]?.focus();
    };
    window.addEventListener("pointerdown", away, true);
    window.addEventListener("contextmenu", away, true);
    window.addEventListener("keydown", key);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("pointerdown", away, true);
      window.removeEventListener("contextmenu", away, true);
      window.removeEventListener("keydown", key);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  return (
    <div ref={box} role="menu" style={pos} className="fixed z-50 min-w-[13rem] rounded-xl border border-line-strong bg-surface-2 p-1.5 shadow-2xl">
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          role="menuitem"
          disabled={it.disabled}
          onClick={() => {
            onClose();
            it.onSelect();
          }}
          className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:bg-foreground/[0.1] focus-visible:outline-none enabled:hover:bg-foreground/[0.1] disabled:text-muted/50 ${it.danger ? "text-bad" : "text-foreground"}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
