"use client";

import Link from "next/link";
import { platformOf, type LiveEvent } from "@/lib/calendar";
import { PlatformIcon } from "@/components/calendar/parts";
import { Card, ListRow, StatusBadge } from "./kit";
import { useTimezone } from "./Timezone";

// Widget du tableau de bord : les prochains lives du calendrier. Aucun live planifié : le dit et propose d'en ajouter un.
// Dates et heures dans le fuseau du compte (comme les graphiques).

const MAX = 3;

export default function UpcomingLives({ lives, canEdit, now }: { lives: LiveEvent[]; canEdit: boolean; now: number }) {
  const tz = useTimezone();
  const day = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: tz });
  const hour = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  const upcoming = lives.filter((l) => Date.parse(l.ends_at) > now).slice(0, MAX);

  const when = (l: LiveEvent) => {
    const a = new Date(l.starts_at);
    const b = new Date(l.ends_at);
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const today = key.format(new Date(now));
    const label = key.format(a) === today ? "Aujourd'hui" : cap(day.format(a).replace(".", ""));
    return `${label} · ${hour.format(a)} – ${hour.format(b)}`;
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[16px] text-foreground">Lives à venir</h2>
        <Link href="/dashboard/calendrier" className="text-[13px] text-muted hover:text-foreground">
          {canEdit ? "Calendrier" : "Voir"}
        </Link>
      </div>
      <ul className="mt-2">
        {upcoming.length === 0 ? (
          <li className="dk-row text-muted">
            Aucun live planifié.
            {canEdit && (
              <>
                {" "}
                <Link href="/dashboard/calendrier" className="text-foreground underline underline-offset-4">
                  Planifier un live
                </Link>
              </>
            )}
          </li>
        ) : (
          upcoming.map((l) => {
            const started = Date.parse(l.starts_at) <= now;
            return (
              <li key={l.id}>
                <ListRow
                  href="/dashboard/calendrier"
                  title={l.title}
                  sub={`${when(l)}${l.location ? ` · ${l.location}` : ""}`}
                  trailing={
                    <span className="flex items-center gap-2">
                      {started && <StatusBadge tone="ok">En cours</StatusBadge>}
                      <span className="flex items-center gap-1" aria-label={l.platforms.map((p) => platformOf(p)?.label ?? p).join(", ")}>
                        {l.platforms.slice(0, 4).map((p) => (
                          <PlatformIcon key={p} id={p} size={14} />
                        ))}
                      </span>
                    </span>
                  }
                />
              </li>
            );
          })
        )}
      </ul>
    </Card>
  );
}
