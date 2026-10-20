"use client";

import { useEffect, useMemo, useState } from "react";
import { CaretLeft, CaretRight, Plus, ShareNetwork } from "@phosphor-icons/react";
import { createLiveAction, deleteLiveAction, shareCalendarAction, unshareCalendarAction, updateLiveAction } from "@/app/(dashboard)/dashboard/calendrier/actions";
import type { LiveEvent } from "@/lib/calendar";
import { addDays, HOUR, monthTitle, startOfDay, startOfMonth, startOfWeek, dayLabel, weekTitle } from "./date";
import ContextMenu, { type MenuItem } from "./ContextMenu";
import EventDialog, { type Draft, type DraftInput } from "./EventDialog";
import MonthView from "./MonthView";
import ShareDialog from "./ShareDialog";
import TimeGrid from "./TimeGrid";

// Calendrier des lives : Mois, Semaine, Jour. Les modifications s'affichent tout de suite et sont enregistrées en arrière-plan ;
// si le serveur refuse, le live revient à sa place et le message s'affiche. `editable` faux = calendrier partagé (lecture seule).

type View = "month" | "week" | "day";
const VIEWS: { id: View; label: string }[] = [
  { id: "day", label: "Jour" },
  { id: "week", label: "Semaine" },
  { id: "month", label: "Mois" },
];

const sortEvents = (list: LiveEvent[]) => [...list].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
const pick = (e: LiveEvent): LiveEvent => ({ id: e.id, title: e.title, location: e.location, description: e.description, platforms: e.platforms, starts_at: e.starts_at, ends_at: e.ends_at });

export default function CalendarApp({ initial, editable, shareToken, shared = false }: { initial: LiveEvent[]; editable: boolean; shareToken: string | null; shared?: boolean }) {
  const [events, setEvents] = useState<LiveEvent[]>(() => sortEvents(initial.map(pick)));
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<Date | null>(null); // null tant que le navigateur n'a pas donné son heure locale
  const [now, setNow] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sharing, setSharing] = useState(false);
  const [token, setToken] = useState<string | null>(shareToken);
  const [notice, setNotice] = useState("");
  const [menu, setMenu] = useState<{ x: number; y: number; target: { at: Date } | { event: LiveEvent } } | null>(null);
  const [clip, setClip] = useState<LiveEvent | null>(null);

  // Le rendu dépend du fuseau du navigateur : rien n'est dessiné avant le montage (pas de décalage avec le rendu serveur).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setCursor(startOfDay(new Date()));
    setNow(Date.now());
    /* eslint-enable react-hooks/set-state-in-effect */
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const today = useMemo(() => startOfDay(new Date(now)), [now]);
  const upsert = (e: LiveEvent) => setEvents((list) => sortEvents([...list.filter((x) => x.id !== e.id), e]));

  if (!cursor)
    return (
      <div aria-hidden="true" className="h-[40rem] animate-pulse rounded-2xl border border-line bg-foreground/[0.04] motion-reduce:animate-none" />
    );

  const step = (dir: -1 | 1) => setCursor(view === "month" ? new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1) : addDays(cursor, dir * (view === "week" ? 7 : 1)));
  const title = view === "month" ? monthTitle(cursor) : view === "week" ? weekTitle(startOfWeek(cursor)) : dayLabel(cursor);
  const days = view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i)) : [cursor];

  const blank = (start: Date, end: Date): Draft => ({ title: "", location: "", description: "", platforms: [], start, end });
  const openNew = (start?: Date, end?: Date) => {
    const s = start ?? (() => {
      const d = new Date(today);
      d.setHours(20, 0, 0, 0);
      return d;
    })();
    setDraft(blank(s, end ?? new Date(s.getTime() + HOUR)));
  };
  const openDay = (day: Date) => {
    const s = new Date(day);
    s.setHours(20, 0, 0, 0);
    openNew(s);
  };
  const openEvent = (e: LiveEvent) => setDraft({ id: e.id, title: e.title, location: e.location, description: e.description, platforms: e.platforms, start: new Date(e.starts_at), end: new Date(e.ends_at) });

  /** Glisser-déposer : le live bouge tout de suite, le serveur confirme (ou le live revient). */
  async function change(e: LiveEvent, patch: Partial<Pick<LiveEvent, "starts_at" | "ends_at">>) {
    const before = e;
    upsert({ ...e, ...patch });
    const r = await updateLiveAction(e.id, patch);
    if (r.ok) upsert(r.value);
    else {
      upsert(before);
      setNotice(r.error);
    }
  }
  const move = (e: LiveEvent, newStart: Date) => {
    const dur = Date.parse(e.ends_at) - Date.parse(e.starts_at);
    return change(e, { starts_at: newStart.toISOString(), ends_at: new Date(newStart.getTime() + dur).toISOString() });
  };
  const resize = (e: LiveEvent, newEnd: Date) => change(e, { ends_at: newEnd.toISOString() });

  const onContext = (ev: React.MouseEvent, target: { at: Date } | { event: LiveEvent }) => {
    ev.preventDefault();
    setMenu({ x: ev.clientX, y: ev.clientY, target });
  };
  /** Colle le live copié à l'endroit cliqué (même durée). */
  async function paste(at: Date) {
    if (!clip) return;
    const dur = Date.parse(clip.ends_at) - Date.parse(clip.starts_at);
    const r = await createLiveAction({ title: clip.title, location: clip.location, description: clip.description, platforms: clip.platforms, starts_at: at.toISOString(), ends_at: new Date(at.getTime() + dur).toISOString() });
    if (r.ok) upsert(r.value);
    else setNotice(r.error);
  }
  async function removeNow(e: LiveEvent) {
    const r = await deleteLiveAction(e.id);
    if (r.ok) setEvents((list) => list.filter((x) => x.id !== e.id));
    else setNotice(r.error);
  }
  const menuItems = (t: { at: Date } | { event: LiveEvent }): MenuItem[] =>
    "at" in t
      ? [
          { label: "Nouveau live", onSelect: () => openNew(t.at) },
          { label: "Coller le live", onSelect: () => void paste(t.at), disabled: !clip },
        ]
      : [
          { label: "Modifier", onSelect: () => openEvent(t.event) },
          { label: "Copier", onSelect: () => setClip(t.event) },
          { label: "Dupliquer", onSelect: () => setDraft({ title: t.event.title, location: t.event.location, description: t.event.description, platforms: t.event.platforms, start: new Date(t.event.starts_at), end: new Date(t.event.ends_at) }) },
          { label: "Supprimer", onSelect: () => void removeNow(t.event), danger: true },
        ];

  async function save(input: DraftInput, id?: string): Promise<string | null> {
    const r = id ? await updateLiveAction(id, input) : await createLiveAction(input);
    if (!r.ok) return r.error;
    upsert(r.value);
    setDraft(null);
    return null;
  }
  async function remove(id: string): Promise<string | null> {
    const r = await deleteLiveAction(id);
    if (!r.ok) return r.error;
    setEvents((list) => list.filter((x) => x.id !== id));
    setDraft(null);
    return null;
  }
  async function share(renew: boolean): Promise<string | null> {
    const r = await shareCalendarAction(renew);
    if (!r.ok) return r.error;
    setToken(r.value);
    return null;
  }
  async function unshare(): Promise<string | null> {
    const r = await unshareCalendarAction();
    if (!r.ok) return r.error;
    setToken(null);
    return null;
  }

  const seg = "h-full rounded-full px-4 text-sm transition-colors";
  const nav = "grid h-full w-9 place-items-center rounded-full text-muted transition-colors hover:bg-foreground/[0.08] hover:text-foreground";
  const cta = "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-sm font-medium transition-[opacity,border-color,transform] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
  const webcal = shared && token && typeof window !== "undefined" ? `${window.location.origin}/calendrier/${token}/live.ics`.replace(/^https?:/, "webcal:") : "";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto min-w-0 text-xl font-semibold tracking-tight sm:text-2xl" aria-live="polite">
          {title}
        </h2>
        <div role="group" aria-label="Vue du calendrier" className="flex h-11 items-center gap-1 rounded-full border border-line p-1">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)} className={`${seg} ${view === v.id ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}>
              {v.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Navigation" className="flex h-11 items-center rounded-full border border-line p-1">
          <button type="button" onClick={() => step(-1)} aria-label="Période précédente" className={nav}>
            <CaretLeft size={20} weight="bold" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setCursor(view === "month" ? startOfMonth(today) : today)} className="h-full rounded-full px-4 text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.08]">
            Aujourd&apos;hui
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Période suivante" className={nav}>
            <CaretRight size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>
        {editable && (
          <>
            <button type="button" onClick={() => openNew()} className={`${cta} bg-accent text-on-accent hover:opacity-90`}>
              <Plus size={18} weight="bold" aria-hidden="true" />
              Nouveau live
            </button>
            <button type="button" onClick={() => setSharing(true)} className={`${cta} border border-line-strong text-foreground hover:border-foreground/40`}>
              <ShareNetwork size={18} aria-hidden="true" />
              Partager
            </button>
          </>
        )}
        {shared && webcal && (
          <a href={webcal} className={`${cta} bg-accent text-on-accent hover:opacity-90`}>
            S&apos;abonner dans mon agenda
          </a>
        )}
      </div>

      {notice && (
        <p role="alert" className="mb-3 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
          {notice}
        </p>
      )}

      {view === "month" ? (
        <MonthView
          anchor={cursor}
          events={events}
          today={today}
          editable={editable}
          onCreate={openDay}
          onOpen={openEvent}
          onMove={move}
          onContext={onContext}
          onPickDay={(d) => {
            setCursor(d);
            setView("day");
          }}
        />
      ) : (
        <TimeGrid days={days} events={events} today={today} now={now} editable={editable} onRange={(s, e) => openNew(s, e)} onOpen={openEvent} onMove={move} onResize={resize} onContext={onContext} />
      )}

      {events.length === 0 && (
        <p className="mt-4 text-sm text-muted">{editable ? "Aucun live planifié. Clique sur un jour (ou sélectionne un créneau en vue Semaine) pour ajouter ton prochain direct." : "Aucun live planifié pour le moment."}</p>
      )}

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu.target)} onClose={() => setMenu(null)} />}
      <EventDialog draft={draft} editable={editable} onClose={() => setDraft(null)} onSave={save} onDelete={remove} />
      {editable && <ShareDialog open={sharing} token={token} onClose={() => setSharing(false)} onShare={share} onUnshare={unshare} />}
    </div>
  );
}
