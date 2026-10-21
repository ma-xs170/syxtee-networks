"use client";

import { useRef, useState } from "react";
import { Plus } from "@phosphor-icons/react";
import type { LiveEvent } from "@/lib/calendar";
import { addDays, dayKey, dayLabel, diffDays, parseDayKey, sameDay, startOfDay, startOfMonth, startOfWeek, timeLabel, weekdayShort } from "./date";
import { eventColor, PlatformIcon, trackPointer } from "./parts";

// Vue « Mois » : 6 semaines, lundi en premier. Un clic sur un jour vide crée un live, on glisse un live sur un autre jour pour le déplacer
// (même heure, même durée). Au clavier : Entrée ouvre la fiche, où les dates se changent.

const MAX_CHIPS = 3;
const DRAG_PX = 5;

type Drag = { event: LiveEvent; grabbed: Date; x: number; y: number; over: string | null };

export default function MonthView({
  anchor,
  events,
  today,
  editable,
  onCreate,
  onOpen,
  onMove,
  onPickDay,
  onContext,
  selectedId,
  onSelect,
}: {
  anchor: Date;
  events: LiveEvent[];
  today: Date;
  editable: boolean;
  onCreate: (day: Date) => void;
  onOpen: (e: LiveEvent) => void;
  onMove: (e: LiveEvent, newStart: Date) => void;
  onPickDay: (day: Date) => void;
  onContext: (ev: React.MouseEvent, target: { at: Date } | { event: LiveEvent }) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const first = startOfWeek(startOfMonth(anchor));
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const [drag, setDrag] = useState<Drag | null>(null);
  const moved = useRef(false);
  const pointer = useRef<string>("mouse");
  const [phoneDay, setPhoneDay] = useState<Date | null>(null);
  const isPhone = () => window.matchMedia("(max-width: 639px)").matches;

  const forDay = (d: Date) => {
    const a = d.getTime();
    const b = addDays(d, 1).getTime();
    return events.filter((e) => Date.parse(e.starts_at) < b && Date.parse(e.ends_at) > a).sort((x, y) => Date.parse(x.starts_at) - Date.parse(y.starts_at));
  };

  function startDrag(ev: React.PointerEvent, event: LiveEvent, day: Date) {
    if (!editable || ev.button !== 0) return;
    const x0 = ev.clientX;
    const y0 = ev.clientY;
    let active = false;
    let over: string | null = null;
    moved.current = false;
    trackPointer({
      onMove: (m) => {
        if (!active && Math.hypot(m.clientX - x0, m.clientY - y0) < DRAG_PX) return;
        if (!active) document.body.style.cursor = "grabbing";
        active = true;
        moved.current = true;
        over = (document.elementFromPoint(m.clientX, m.clientY)?.closest("[data-day]") as HTMLElement | null)?.dataset.day ?? null;
        setDrag({ event, grabbed: day, x: m.clientX, y: m.clientY, over });
      },
      onUp: (u, cancelled) => {
        document.body.style.cursor = "";
        setDrag(null);
        if (!active || cancelled) return;
        // Case sous le pointeur AU RELÂCHEMENT (pas au dernier mouvement : un geste rapide en saute).
        const drop = (document.elementFromPoint(u.clientX, u.clientY)?.closest("[data-day]") as HTMLElement | null)?.dataset.day ?? over;
        if (!drop) return;
        const delta = diffDays(day, parseDayKey(drop));
        if (delta !== 0) onMove(event, addDays(new Date(event.starts_at), delta));
      },
    });
  }

  // Liste du jour (téléphone) : le jour touché, sinon aujourd'hui, sinon le 1er du mois affiché.
  const inAnchor = (d: Date) => d.getFullYear() === anchor.getFullYear() && d.getMonth() === anchor.getMonth();
  const listDay = phoneDay && inAnchor(phoneDay) ? phoneDay : inAnchor(today) ? today : startOfMonth(anchor);
  const listEvents = forDay(listDay);
  return (
    <>
    <div onPointerDownCapture={(e) => (pointer.current = e.pointerType)} className="select-none overflow-hidden rounded-2xl border border-line" role="grid" aria-label="Calendrier du mois">
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] border-b border-line bg-surface text-center font-mono text-[11px] uppercase tracking-[0.12em] text-muted" role="row">
        {days.slice(0, 7).map((d) => (
          <div key={d.getDay()} role="columnheader" className="py-2.5">
            {weekdayShort(d)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))]" role="rowgroup">
        {days.map((d, i) => {
          const list = forDay(d);
          const isToday = sameDay(d, today);
          const inMonth = d.getMonth() === anchor.getMonth();
          const key = dayKey(d);
          const target = drag?.over === key;
          return (
            <div
              key={key}
              role="gridcell"
              data-day={key}
              onContextMenu={(ev) => {
                if (!editable) return;
                const at = new Date(d);
                at.setHours(20, 0, 0, 0);
                onContext(ev, { at });
              }}
              onClick={(e) => {
                if (e.target !== e.currentTarget) return;
                // Téléphone : un toucher choisit le jour (sa liste s'affiche sous la grille). Souris : un clic désélectionne, un double-clic crée
                // (comme Apple Calendrier). Tablette tactile : un toucher crée.
                if (isPhone()) setPhoneDay(startOfDay(d));
                else if (editable && pointer.current === "touch") onCreate(d);
                else onSelect(null);
              }}
              onDoubleClick={(e) => {
                if (editable && e.target === e.currentTarget) onCreate(d);
              }}
              className={`min-h-[3.75rem] min-w-0 overflow-hidden border-line p-1 sm:min-h-[8.25rem] sm:p-1.5 ${i % 7 !== 6 ? "border-r" : ""} ${i < 35 ? "border-b" : ""} ${target ? "bg-foreground/[0.1]" : inMonth ? "" : "bg-foreground/[0.025]"} ${editable ? "cursor-cell" : ""}`}
            >
              <div className="pointer-events-none flex justify-center pt-0.5 sm:justify-end sm:pr-0.5">
                <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-medium sm:text-sm ${isToday ? "bg-accent text-on-accent" : phoneDay && sameDay(phoneDay, d) ? "bg-foreground/[0.14] text-foreground" : inMonth ? "text-foreground" : "text-muted"}`}>{d.getDate() === 1 ? `${d.getDate()} ${new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(d)}` : d.getDate()}</span>
              </div>
              <div aria-hidden="true" className="mt-1 flex min-w-0 flex-wrap justify-center gap-0.5 px-0.5 sm:hidden">
                {list.slice(0, 4).map((e) => (
                  <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ background: eventColor(e) }} />
                ))}
              </div>
              <ul className="mt-1 hidden min-w-0 gap-0.5 sm:grid">
                {target && drag && diffDays(drag.grabbed, d) !== 0 && (
                  <li aria-hidden="true">
                    <div style={{ borderLeftColor: eventColor(drag.event) }} className="flex min-w-0 items-center gap-1.5 rounded-md border border-l-[3px] border-dashed border-foreground/60 bg-foreground/[0.14] px-1.5 py-1 text-[11px] font-medium leading-tight sm:text-xs">
                      <span className="min-w-0 flex-1 truncate">{drag.event.title}</span>
                      <span className="hidden shrink-0 text-muted sm:inline">{timeLabel(new Date(drag.event.starts_at))}</span>
                    </div>
                  </li>
                )}
                {list.slice(0, MAX_CHIPS).map((e) => (
                  <li key={e.id} className="min-w-0">
                    <button
                      type="button"
                      onContextMenu={(ev) => {
                        if (!editable) return;
                        ev.stopPropagation();
                        onContext(ev, { event: e });
                      }}
                      onPointerDown={(ev) => startDrag(ev, e, d)}
                      onClick={(ev) => {
                        if (moved.current) {
                          moved.current = false;
                          return;
                        }
                        // Clavier (Entrée) ou toucher : ouvre ; souris : sélectionne, le double-clic ouvre.
                        if (ev.detail === 0 || pointer.current === "touch") onOpen(e);
                        else onSelect(e.id);
                      }}
                      onDoubleClick={() => onOpen(e)}
                      style={{ borderLeftColor: eventColor(e), touchAction: editable ? "none" : undefined }}
                      className={`flex w-full min-w-0 items-center gap-1.5 rounded-md border-l-[3px] bg-foreground/[0.08] px-1.5 py-1 text-left text-[11px] leading-tight text-foreground transition-colors hover:bg-foreground/[0.14] sm:text-xs ${drag?.event.id === e.id ? "opacity-40" : ""} ${selectedId === e.id ? "ring-2 ring-foreground/70" : ""} ${editable ? "cursor-grab active:cursor-grabbing" : ""}`}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{e.title}</span>
                      <span className="hidden shrink-0 text-muted sm:inline">{timeLabel(new Date(e.starts_at))}</span>
                      <span className="hidden shrink-0 items-center gap-0.5 lg:flex">
                        {e.platforms.slice(0, 3).map((p) => (
                          <PlatformIcon key={p} id={p} size={11} />
                        ))}
                      </span>
                    </button>
                  </li>
                ))}
                {list.length > MAX_CHIPS && (
                  <li>
                    <button type="button" onClick={() => onPickDay(startOfDay(d))} className="w-full rounded-md px-1.5 py-0.5 text-left text-[11px] text-muted hover:text-foreground sm:text-xs">
                      +{list.length - MAX_CHIPS} autre{list.length - MAX_CHIPS > 1 ? "s" : ""}
                    </button>
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
      {drag && (
        <div aria-hidden="true" style={{ left: drag.x + 12, top: drag.y + 12 }} className="pointer-events-none fixed z-50 max-w-[14rem] truncate rounded-md border border-line-strong bg-surface-2 px-2.5 py-1.5 text-xs font-medium shadow-lg">
          {drag.event.title}
        </div>
      )}
    </div>
    <section aria-label="Lives du jour" className="mt-4 sm:hidden">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">{dayLabel(listDay)}</h3>
        {editable && (
          <button type="button" onClick={() => onCreate(listDay)} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong px-4 text-sm font-medium">
            <Plus size={16} weight="bold" aria-hidden="true" />
            Nouveau live
          </button>
        )}
      </div>
      {listEvents.length === 0 ? (
        <p className="text-sm text-muted">Aucun live ce jour-là.</p>
      ) : (
        <ul className="grid gap-2">
          {listEvents.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => onOpen(e)} style={{ borderLeftColor: eventColor(e) }} className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-l-4 border-line bg-surface-2 px-3 py-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{e.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {timeLabel(new Date(e.starts_at))} – {timeLabel(new Date(e.ends_at))}
                    {e.location ? ` · ${e.location}` : ""}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {e.platforms.slice(0, 4).map((p) => (
                    <PlatformIcon key={p} id={p} size={14} />
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
    </>
  );
}
