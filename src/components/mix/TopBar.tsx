"use client";

import { useEffect, useState } from "react";
import { Lock, LockOpen } from "@phosphor-icons/react";
import Wordmark from "../Wordmark";

// Barre du haut : nom, PROTECTION (verrou général), heure en direct, état global, ping, compte.

const dateFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });

function Clock() {
  const [t, setT] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setT(new Date());
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="text-right font-mono leading-tight">
      <p className="text-lg tabular-nums text-foreground sm:text-xl" suppressHydrationWarning>
        {t ? t.toLocaleTimeString("fr-FR", { hour12: false }) : "--:--:--"}
      </p>
      <p className="text-[11px] text-muted" suppressHydrationWarning>
        {t ? dateFmt.format(t) : ""}
      </p>
    </div>
  );
}

export default function TopBar({ protection, onProtection, online, total, ping, account, demo }: { protection: boolean; onProtection: () => void; online: number; total: number; ping: number; account: string; demo: boolean }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <Wordmark name="MIX" />
        {demo && <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted">DÉMO</span>}
      </div>

      <button
        type="button"
        onClick={onProtection}
        aria-pressed={protection}
        className={`inline-flex h-11 items-center gap-2.5 rounded-full border px-5 font-mono text-xs font-semibold tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 ${
          protection ? "border-live bg-live/15 text-foreground" : "border-line-strong text-muted hover:text-foreground"
        }`}
      >
        {protection ? <Lock size={18} weight="fill" aria-hidden="true" /> : <LockOpen size={18} aria-hidden="true" />}
        PROTECTION {protection ? "ON" : "OFF"}
      </button>

      <div className="flex items-center gap-6">
        <dl className="hidden gap-6 font-mono text-xs sm:flex">
          <div>
            <dt className="text-muted">Relais</dt>
            <dd className="tabular-nums text-foreground">
              {online} / {total} en ligne
            </dd>
          </div>
          <div>
            <dt className="text-muted">Ping</dt>
            <dd className="tabular-nums text-foreground">{ping} ms</dd>
          </div>
          <div>
            <dt className="text-muted">Compte</dt>
            <dd className="max-w-[10rem] truncate text-foreground" data-sensitive>
              {account}
            </dd>
          </div>
        </dl>
        <Clock />
      </div>
    </header>
  );
}
