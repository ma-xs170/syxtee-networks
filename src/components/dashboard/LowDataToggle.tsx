"use client";

import { useState } from "react";
import { LOW_DATA_COOKIE, LOW_DATA_PAGE } from "@/lib/low-data";

// Case « Connexion basse » : pose le cookie, puis ouvre la page légère (ou ramène au dashboard complet).
export default function LowDataToggle({ initial, variant = "box" }: { initial: boolean; variant?: "box" | "link" }) {
  const [on, setOn] = useState(initial);

  function change(next: boolean) {
    setOn(next);
    document.cookie = `${LOW_DATA_COOKIE}=${next ? "1" : ""}; path=/; max-age=${next ? 31_536_000 : 0}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
    // Navigation complète : le dashboard complet charge ses scripts, la page légère n'en charge presque aucun.
    window.location.href = next ? LOW_DATA_PAGE : "/dashboard";
  }

  if (variant === "link") {
    return (
      <button type="button" onClick={() => change(false)} className="h-9 rounded-full border border-line px-4 text-sm hover:bg-foreground/10">
        Quitter la connexion basse
      </button>
    );
  }
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
      <input type="checkbox" checked={on} onChange={(e) => change(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
      <span>Activer la connexion basse</span>
    </label>
  );
}
