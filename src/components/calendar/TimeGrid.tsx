"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveEvent } from "@/lib/calendar";
import { addDays, dayKey, HOUR, sameDay, startOfDay, STEP, timeLabel, weekdayShort } from "./date";
import { eventColor, PlatformIcon, trackPointer } from "./parts";

// Vues « Semaine » et « Jour » : grille des 24 heures par tranches de 15 min.
//  - presser dans une colonne vide puis glisser sélectionne un créneau (relâcher ouvre la fiche, un simple clic propose 1 h) ;
//  - glisser un live le déplace (jour et heure), glisser le bas d'un live change sa fin ;
//  - Échap annule le geste en cours. Sur écran tactile : toucher ouvre ou crée, le glisser reste réservé au défilement (sauf sur un live).

const HOUR_PX = 52;
const GUTTER = 56;
const DRAG_PX = 5;
const SCROLL_EDGE = 40;

type Seg = { event: LiveEvent; start: number; end: number; first: boolean; last: boolean; lane: number; lanes: number };
type Preview = { id: string | null; start: number; end: number; kind: "move" | "resize" | "create" };

const floorStep = (ms: number) => Math.floor(ms / STEP) * STEP;
const roundStep = (ms: number) => Math.round(ms / STEP) * STEP;

/** Tranches d'un ensemble de lives pour une journée, avec leur colonne en cas de chevauchement. */
function segmentsFor(day: Date, list: { event: LiveEvent; start: number; end: number }[]): Seg[] {
  const d0 = startOfDay(day).getTime();
  const d1 = addDays(day, 1).getTime();
  const segs = list
    .filter((s) => s.start < d1 && s.end > d0)
    .map((s) => ({ event: s.event, start: Math.max(s.start, d0), end: Math.min(s.end, d1), first: s.start >= d0, last: s.end <= d1, lane: 0, lanes: 1 }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  // Regroupe les lives qui se chevauchent, puis les répartit en colonnes côte à côte.
  let cluster: Seg[] = [];
  let clusterEnd = 0;
  const flush = () => {
    const laneEnds: number[] = [];
    for (const s of cluster) {
      let l = laneEnds.findIndex((end) => end <= s.start);
      if (l < 0) l = laneEnds.length;
      laneEnds[l] = s.end;
      s.lane = l;
    }
    for (const s of cluster) s.lanes = laneEnds.length;
    cluster = [];
  };
  for (const s of segs) {
    if (cluster.length && s.start >= clusterEnd) flush();
    cluster.push(s);
    clusterEnd = Math.max(clusterEnd, s.end);
  }
  flush();
  return segs;
}

export default function TimeGrid({
  days,
  events,
  today,
  now,
  editable,
  onRange,
  onOpen,
  onMove,
  onResize,
}: {
  days: Date[];
  events: LiveEvent[];
  today: Date;
  now: number;
  editable: boolean;
  onRange: (start: Date, end: Date) => void;
  onOpen: (e: LiveEvent) => void;
  onMove: (e: LiveEvent, newStart: Date) => void;
  onResize: (e: LiveEvent, newEnd: Date) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const cols = useRef<(HTMLDivElement | null)[]>([]);
  const moved = useRef(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const template = `${GUTTER}px repeat(${days.length}, minmax(0, 1fr))`;

  // Ouverture : la grille démarre à 7 h, ou une heure avant « maintenant » si aujourd'hui est affiché.
  const firstDay = dayKey(days[0]);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const showsToday = days.some((d) => sameDay(d, today));
    const n = new Date();
    el.scrollTop = Math.max(0, ((showsToday ? n.getHours() + n.getMinutes() / 60 - 1 : 7) * HOUR_PX) | 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstDay, days.length]);

  /** Instant (ms) sous le pointeur : la colonne la plus proche en X, l'heure en Y (la colonne tient compte du défilement). */
  function timeAt(x: number, y: number): { ms: number; col: number } {
    let col = 0;
    let best = Infinity;
    cols.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      if (dx < best) {
        best = dx;
        col = i;
      }
    });
    const rect = cols.current[col]?.getBoundingClientRect();
    const frac = rect ? Math.min(24, Math.max(0, (y - rect.top) / HOUR_PX)) : 0;
    return { ms: startOfDay(days[col]).getTime() + frac * HOUR, col };
  }

  function autoscroll(y: number) {
    const el = scroller.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (y < r.top + SCROLL_EDGE) el.scrollTop -= 14;
    else if (y > r.bottom - SCROLL_EDGE) el.scrollTop += 14;
  }

  /** Presser dans le vide : sélection d'un créneau. */
  function startCreate(ev: React.PointerEvent, col: number) {
    if (!editable || ev.button !== 0 || ev.target !== ev.currentTarget) return;
    const touch = ev.pointerType === "touch";
    const x0 = ev.clientX;
    const y0 = ev.clientY;
    const t0 = floorStep(timeAt(x0, y0).ms);
    void col;
    let active = false;
    let range = { start: t0, end: t0 + HOUR };
    trackPointer({
      onMove: (m) => {
        if (touch || (!active && Math.hypot(m.clientX - x0, m.clientY - y0) < DRAG_PX)) return;
        active = true;
        autoscroll(m.clientY);
        const t = floorStep(timeAt(m.clientX, m.clientY).ms);
        range = t >= t0 ? { start: t0, end: t + STEP } : { start: t, end: t0 + STEP };
        setPreview({ id: null, ...range, kind: "create" });
      },
      onUp: (_u, cancelled) => {
        setPreview(null);
        if (!cancelled) onRange(new Date(range.start), new Date(range.end));
      },
    });
  }

  /** Presser un live : le déplacer (corps) ou changer sa fin (poignée du bas). */
  function startEdit(ev: React.PointerEvent, event: LiveEvent, kind: "move" | "resize") {
    if (!editable || ev.button !== 0) return;
    if (kind === "resize") ev.stopPropagation();
    const x0 = ev.clientX;
    const y0 = ev.clientY;
    const start = Date.parse(event.starts_at);
    const end = Date.parse(event.ends_at);
    const grab = timeAt(x0, y0).ms - start;
    let active = false;
    let result: { start: number; end: number } | null = null;
    moved.current = false;
    trackPointer({
      onMove: (m) => {
        if (!active && Math.hypot(m.clientX - x0, m.clientY - y0) < DRAG_PX) return;
        active = true;
        moved.current = true;
        autoscroll(m.clientY);
        const t = timeAt(m.clientX, m.clientY).ms;
        if (kind === "move") {
          const s = roundStep(t - grab);
          result = { start: s, end: s + (end - start) };
        } else result = { start, end: Math.max(start + STEP, roundStep(t)) };
        setPreview({ id: event.id, ...result, kind });
      },
      onUp: (_u, cancelled) => {
        setPreview(null);
        if (!active || cancelled || !result) return;
        if (kind === "move" && result.start !== start) onMove(event, new Date(result.start));
        if (kind === "resize" && result.end !== end) onResize(event, new Date(result.end));
      },
    });
  }

  const items = events.map((e) => ({ event: e, start: Date.parse(e.starts_at), end: Date.parse(e.ends_at) }));

  return (
    <div className="select-none overflow-hidden rounded-2xl border border-line">
      <div className="grid border-b border-line bg-surface" style={{ gridTemplateColumns: template }}>
        <div />
        {days.map((d) => {
          const isToday = sameDay(d, today);
          return (
            <div key={dayKey(d)} className="border-l border-line py-2 text-center">
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{weekdayShort(d)}</div>
              <div className={`mx-auto mt-0.5 grid h-7 min-w-7 place-items-center rounded-full px-1 text-sm font-medium ${isToday ? "bg-accent text-on-accent" : "text-foreground"}`}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>
      <div ref={scroller} className="relative max-h-[68dvh] overflow-y-auto overscroll-contain">
        <div className="grid" style={{ gridTemplateColumns: template }}>
          <div className="relative" style={{ height: 24 * HOUR_PX }} aria-hidden="true">
            {Array.from({ length: 23 }, (_, i) => (
              <span key={i} className="absolute right-2 -translate-y-1/2 font-mono text-[10px] text-muted" style={{ top: (i + 1) * HOUR_PX }}>
                {String(i + 1).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {days.map((d, ci) => {
            const segs = segmentsFor(d, items);
            const ghost = preview ? segmentsFor(d, [{ event: events.find((e) => e.id === preview.id) ?? ({ id: "new", title: "Nouveau live", platforms: [] } as unknown as LiveEvent), start: preview.start, end: preview.end }]) : [];
            const d0 = startOfDay(d).getTime();
            const isToday = sameDay(d, today);
            return (
              <div
                key={dayKey(d)}
                ref={(el) => {
                  cols.current[ci] = el;
                }}
                role="group"
                aria-label={`${weekdayShort(d)} ${d.getDate()}`}
                onPointerDown={(e) => startCreate(e, ci)}
                className={`relative border-l border-line ${editable ? "cursor-cell" : ""}`}
                style={{ height: 24 * HOUR_PX, backgroundImage: "linear-gradient(to bottom, var(--line) 1px, transparent 1px)", backgroundSize: `100% ${HOUR_PX}px` }}
              >
                {segs.map((s) => {
                  const top = ((s.start - d0) / HOUR) * HOUR_PX;
                  const height = Math.max(22, ((s.end - s.start) / HOUR) * HOUR_PX - 2);
                  const e = s.event;
                  const dim = preview?.id === e.id;
                  return (
                    <div key={`${e.id}-${s.start}`} className="absolute px-0.5" style={{ top, height, left: `${(s.lane / s.lanes) * 100}%`, width: `${100 / s.lanes}%` }}>
                      <button
                        type="button"
                        onPointerDown={(ev) => startEdit(ev, e, "move")}
                        onClick={() => {
                          if (moved.current) {
                            moved.current = false;
                            return;
                          }
                          onOpen(e);
                        }}
                        style={{ borderLeftColor: eventColor(e), touchAction: editable ? "none" : undefined }}
                        className={`relative flex h-full w-full flex-col overflow-hidden rounded-md border-l-[3px] bg-surface-2 px-1.5 py-1 text-left text-[11px] leading-tight text-foreground ring-1 ring-inset ring-line transition-colors hover:bg-foreground/[0.14] sm:text-xs ${dim ? "opacity-40" : ""} ${editable ? "cursor-grab active:cursor-grabbing" : ""}`}
                      >
                        <span className="truncate font-medium">{e.title}</span>
                        {height > 36 && (
                          <span className="truncate text-muted">
                            {timeLabel(new Date(e.starts_at))} – {timeLabel(new Date(e.ends_at))}
                          </span>
                        )}
                        {height > 54 && e.platforms.length > 0 && (
                          <span className="mt-auto flex items-center gap-1 pt-1">
                            {e.platforms.map((p) => (
                              <PlatformIcon key={p} id={p} size={12} />
                            ))}
                          </span>
                        )}
                      </button>
                      {editable && s.last && (
                        <div
                          role="presentation"
                          onPointerDown={(ev) => startEdit(ev, e, "resize")}
                          className="absolute inset-x-1 bottom-0 z-10 h-2 cursor-ns-resize"
                          style={{ touchAction: "none" }}
                        />
                      )}
                    </div>
                  );
                })}
                {ghost.map((s) => (
                  <div
                    key={`g-${s.start}`}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0.5 z-20 overflow-hidden rounded-md border border-dashed border-foreground/70 bg-foreground/[0.14] px-1.5 py-1 text-[11px] leading-tight sm:text-xs"
                    style={{ top: ((s.start - d0) / HOUR) * HOUR_PX, height: Math.max(22, ((s.end - s.start) / HOUR) * HOUR_PX - 2) }}
                  >
                    <span className="font-medium">{s.event.title}</span>
                    <br />
                    <span className="text-muted">
                      {timeLabel(new Date(preview!.start))} – {timeLabel(new Date(preview!.end))}
                    </span>
                  </div>
                ))}
                {isToday && (
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-10 h-px bg-accent" style={{ top: ((now - d0) / HOUR) * HOUR_PX }}>
                    <span className="absolute -left-1 -top-[3px] h-[7px] w-[7px] rounded-full bg-accent" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
