"use client";

import { WifiLow } from "@phosphor-icons/react";
import { useState } from "react";
import { LOW_DATA_COOKIE, LOW_DATA_PAGE } from "@/lib/low-data";

// Case « Connexion basse » : pose le cookie, puis ouvre la page légère (ou ramène au dashboard complet).
export default function LowDataToggle({ initial, variant = "box" }: { initial: boolean; variant?: "box" | "link" | "icon" | "pill" }) {
  const [on, setOn] = useState(initial);

  function change(next: boolean) {
    setOn(next);
    document.cookie = `${LOW_DATA_COOKIE}=${next ? "1" : ""}; path=/; max-age=${next ? 31_536_000 : 0}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
    // Navigation complète : le dashboard complet charge ses scripts, la page légère n'en charge presque aucun.
    window.location.href = next ? LOW_DATA_PAGE : "/dashboard";
  }

  // Accès rapide depuis les barres du dashboard : un appui active la connexion basse.
  if (variant === "icon" || variant === "pill") {
    const label = "Connexion basse : page légère, peu de données";
    return (
      <button
        type="button"
        onClick={() => change(true)}
        title={label}
        aria-label={variant === "icon" ? label : undefined}
        className={
          variant === "icon"
            ? "grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-foreground/10 hover:text-foreground"
            : "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-line px-3 text-sm text-muted transition-colors hover:bg-foreground/10 hover:text-foreground"
        }
      >
        <WifiLow size={variant === "icon" ? 20 : 16} aria-hidden="true" />
        {variant === "pill" && "Connexion basse"}
      </button>
    );
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
