"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, useState, type ReactNode } from "react";

/** Onglets en pilules : l'indicateur glisse d'un onglet à l'autre (layoutId). */
export default function Tabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const uid = useId();
  const reduce = useReducedMotion();
  return (
    <div>
      <div role="tablist" className="inline-flex gap-1 rounded-full border border-line bg-surface p-1">
        {tabs.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={t.id === active} onClick={() => setActive(t.id)} className="relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground">
            {t.id === active && <motion.span layoutId={`tab-${uid}`} className="absolute inset-0 rounded-full bg-surface-2 ring-1 ring-line-strong" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }} />}
            <span className={`relative ${t.id === active ? "text-foreground" : "text-muted"}`}>{t.label}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-5">{tabs.find((t) => t.id === active)?.content}</div>
    </div>
  );
}
