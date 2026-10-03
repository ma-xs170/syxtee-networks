import Link from "next/link";
import { deviceLabel, fmtDate, fmtDuration, fmtInt, type LiveSession } from "@/lib/dashboard-data";
import { Sparkline } from "./charts";

// Liste des directs (vue d'ensemble, historique) : date, appareil, durée, débit moyen / crête.

export function SessionList({ sessions, spark = false, timezone }: { sessions: LiveSession[]; spark?: boolean; timezone?: string }) {
  return (
    <ul className="divide-y divide-foreground/10">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link
            href={`/dashboard/lives/${s.id}`}
            className={`group grid items-center gap-x-4 gap-y-1 py-3 transition-colors hover:bg-foreground/[0.08] sm:px-2 ${
              spark ? "grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px_auto]" : "grid-cols-[minmax(0,1fr)_auto]"
            }`}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-foreground">{fmtDate(s.started_at, timezone)}</span>
              <span className="block truncate font-mono text-xs text-muted">
                {deviceLabel(s)}
                {s.reconnects > 0 && ` · ${s.reconnects} coupure${s.reconnects > 1 ? "s" : ""}`}
              </span>
            </span>
            {spark && (
              <span className="hidden font-mono text-xs tabular-nums text-muted md:block">
                {fmtInt(s.avg_kbps)} / {fmtInt(s.peak_kbps)} kbit/s
              </span>
            )}
            {spark && (
              <span className="hidden md:block">
                <Sparkline points={s.bitrate_series} className="h-7 w-full" />
              </span>
            )}
            <span className="text-right">
              <span className="block font-mono text-sm tabular-nums text-foreground">{s.ended_at ? fmtDuration(s.duration_s) : "En cours"}</span>
              {!spark && <span className="block font-mono text-xs tabular-nums text-muted">{fmtInt(s.avg_kbps)} / {fmtInt(s.peak_kbps)} kbit/s</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
