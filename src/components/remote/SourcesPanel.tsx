"use client";

import { cx, btn, Icon, KindIcon, kindLabel, panel, panelHead } from "./ui";
import type { Obs } from "./useObs";

// Sources de la scène éditée. Touche une source = la sélectionner (Propriétés et Filtres agissent dessus) ; l'œil l'affiche ou la masque.

export default function SourcesPanel({ o, onEdit, className }: { o: Obs; onEdit: (what: "props" | "filters") => void; className?: string }) {
  const sel = o.selectedItem;
  return (
    <section aria-label="Sources de la scène" className={cx(panel, className)}>
      <h2 className={panelHead}>
        Sources <span className="min-w-0 truncate font-normal text-muted">{o.editing || "—"}</span>
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
        {o.items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted">{o.ready ? (o.loaded ? "Aucune source dans cette scène." : "Chargement…") : "En attente d'OBS…"}</p>
        ) : (
          <ul className="grid gap-0.5">
            {o.items.map((i) => {
              const isSel = sel?.id === i.id;
              return (
                <li key={i.id} className={cx("flex min-h-12 items-center gap-1 rounded-lg border pr-1", isSel ? "border-line-strong bg-foreground/10" : "border-transparent")}>
                  <button
                    type="button"
                    aria-pressed={isSel}
                    aria-label={`Sélectionner ${i.name}`}
                    onClick={() => o.setSelected(isSel ? null : { scene: o.editing, id: i.id })}
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 text-left hover:bg-foreground/[0.05]"
                  >
                    <KindIcon kind={i.kind} />
                    <span className={cx("min-w-0 flex-1 truncate text-sm", !i.on && "text-muted line-through")}>{i.name}</span>
                    <span className="hidden shrink-0 font-mono text-[11px] uppercase tracking-wider text-muted min-[420px]:inline">{kindLabel(i.kind)}</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={i.on}
                    aria-label={`${i.on ? "Masquer" : "Afficher"} ${i.name}`}
                    disabled={!o.ready || !o.canLive}
                    onClick={() => o.toggleItem(i)}
                    className="grid size-11 shrink-0 place-items-center rounded-lg text-foreground/80 transition-colors hover:bg-foreground/10 disabled:opacity-40"
                  >
                    <Icon name={i.on ? "eye" : "eye-off"} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-line p-2">
        <span className={cx("min-w-0 flex-1 truncate px-1 text-sm", sel ? "text-foreground" : "text-muted")}>{sel ? sel.name : "Aucune"}</span>
        <button type="button" disabled={!sel || !o.ready} onClick={() => onEdit("props")} className={btn("sm")}>
          Propriétés
        </button>
        <button type="button" disabled={!sel || !o.ready} onClick={() => onEdit("filters")} className={btn("sm")}>
          Filtres
        </button>
      </div>
    </section>
  );
}
