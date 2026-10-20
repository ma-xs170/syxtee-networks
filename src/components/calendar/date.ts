// Dates du calendrier : tout se calcule à l'heure locale du navigateur (les lives sont stockés en UTC), semaine commençant le lundi.

export const MIN = 60_000;
export const HOUR = 3_600_000;
export const STEP = 15 * MIN;

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** Ajoute des jours en gardant l'heure affichée (changement d'heure compris). */
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseDayKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const snap = (ms: number, step = STEP) => Math.round(ms / step) * step;
/** Nombre de jours calendaires entre deux dates (a → b). */
export const diffDays = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);

/** Valeur d'un champ `datetime-local` (heure locale, sans fuseau). */
export const toInput = (d: Date) => `${dayKey(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
export function fromInput(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return Number.isNaN(d.getTime()) ? null : d;
}

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", o);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const monthTitle = (d: Date) => cap(fmt({ month: "long", year: "numeric" }).format(d));
export const weekdayShort = (d: Date) => fmt({ weekday: "short" }).format(d).replace(".", "");
export const timeLabel = (d: Date) => fmt({ hour: "2-digit", minute: "2-digit" }).format(d);
export const dayLabel = (d: Date) => cap(fmt({ weekday: "long", day: "numeric", month: "long" }).format(d));
export const rangeLabel = (a: Date, b: Date) => {
  const day = (d: Date) => fmt({ weekday: "short", day: "numeric", month: "short" }).format(d);
  return sameDay(a, b) ? `${cap(day(a))}, ${timeLabel(a)} – ${timeLabel(b)}` : `${cap(day(a))} ${timeLabel(a)} → ${day(b)} ${timeLabel(b)}`;
};
export const weekTitle = (start: Date) => {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const a = fmt({ day: "numeric", ...(sameMonth ? {} : { month: "short" }) }).format(start);
  const b = fmt({ day: "numeric", month: "long", year: "numeric" }).format(end);
  return `${a} – ${b}`;
};
