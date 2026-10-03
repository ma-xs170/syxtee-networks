"use client";

import { useEffect, useState } from "react";
import Highlight from "@/components/ui/Highlight";
import { dayPart, localHour } from "@/lib/regions";

// Bonjour / Bon après-midi / Bonne soirée selon l'heure du fuseau du compte, avec la date et l'heure locales.
// `now` vient du serveur : le premier rendu est identique des deux côtés, puis l'horloge avance chaque minute.

export default function Greeting({ now, timezone, name, flag, region }: { now: number; timezone: string; name?: string; flag?: string; region?: string }) {
  const [ms, setMs] = useState(now);
  useEffect(() => {
    const t = setInterval(() => setMs(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const date = new Date(ms);
  const part = dayPart(localHour(ms, timezone));
  const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: timezone }).format(date);
  const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(date);

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        <span aria-hidden="true">{part.emoji}</span> {part.hello}
        {name ? (
          <>
            {" "}
            <Highlight>{name}.</Highlight>
          </>
        ) : (
          "."
        )}
      </h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted">
        <span>{day.charAt(0).toUpperCase() + day.slice(1)}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={date.toISOString()} className="font-mono tabular-nums">
          {time}
        </time>
        {region && (
          <>
            <span aria-hidden="true">·</span>
            <span>
              <span aria-hidden="true">{flag} </span>
              {region}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
