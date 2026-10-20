import { platformOf, type LiveEvent } from "@/lib/calendar";

// Petites briques communes du calendrier : logo de plateforme, couleur d'un live, suivi du pointeur pour le glisser-déposer.

/** Logo d'une plateforme. Les logos noirs (X, TikTok) prennent la couleur du texte pour rester lisibles en thème sombre comme en clair. */
export function PlatformIcon({ id, size = 14, className = "" }: { id: string; size?: number; className?: string }) {
  const p = platformOf(id);
  if (!p) return null;
  const fill = p.icon.hex === "000000" ? "currentColor" : `#${p.icon.hex}`;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d={p.icon.path} />
    </svg>
  );
}

/** Couleur de la barre d'un live : celle de sa première plateforme, sinon le gris du thème. */
export function eventColor(e: Pick<LiveEvent, "platforms">): string {
  const p = platformOf(e.platforms[0] ?? "");
  return !p || p.icon.hex === "000000" ? "color-mix(in srgb, var(--foreground) 45%, transparent)" : `#${p.icon.hex}`;
}

export const platformNames = (e: Pick<LiveEvent, "platforms">) => e.platforms.map((id) => platformOf(id)?.label ?? id).join(", ");

/** Suit le pointeur jusqu'au relâchement (fenêtre entière : le geste continue même hors du composant). */
export function trackPointer(opts: { onMove: (ev: PointerEvent) => void; onUp: (ev: PointerEvent, cancelled: boolean) => void }) {
  const move = (ev: PointerEvent) => opts.onMove(ev);
  const end = (ev: PointerEvent, cancelled: boolean) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel);
    window.removeEventListener("keydown", key);
    opts.onUp(ev, cancelled);
  };
  const up = (ev: PointerEvent) => end(ev, false);
  const cancel = (ev: PointerEvent) => end(ev, true);
  // Échap annule le geste en cours.
  const key = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") end(new PointerEvent("pointercancel"), true);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel);
  window.addEventListener("keydown", key);
}
