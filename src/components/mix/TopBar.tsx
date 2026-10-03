"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LinkSimple, Lock, LockOpen } from "@phosphor-icons/react";
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
      <p className="text-sm tabular-nums text-foreground sm:text-base" suppressHydrationWarning>
        {t ? t.toLocaleTimeString("fr-FR", { hour12: false }) : "--:--:--"}
      </p>
      <p className="text-[10px] text-muted" suppressHydrationWarning>
        {t ? dateFmt.format(t) : ""}
      </p>
    </div>
  );
}

export default function TopBar({ protection, onProtection, online, total, ping, account, demo, onObs, canReal, onToggleReal }: { protection: boolean; onProtection: () => void; online: number; total: number; ping: number; account: string; demo: boolean; onObs: () => void; canReal: boolean; onToggleReal: () => void }) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-x-3 rounded-lg border border-line bg-surface px-2 pt-[env(safe-area-inset-top)] sm:px-3">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" aria-label="Retour au dashboard" title="Retour au dashboard" className="grid h-8 w-8 place-items-center rounded-md border border-line text-muted transition-colors hover:bg-foreground/10 hover:text-foreground">
          <ArrowLeft size={16} aria-hidden="true" />
        </Link>
        <span className="hidden min-[420px]:inline"><Wordmark name="COMMUTATEUR" /></span>
        {canReal ? (
          <button type="button" onClick={onToggleReal} title={demo ? "Passer à mes vrais relais" : "Revenir à la démonstration"} className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted transition-colors hover:bg-foreground/10 hover:text-foreground">
            {demo ? "DÉMO" : "MES RELAIS"}
          </button>
        ) : (
          demo && <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted">DÉMO</span>
        )}
      </div>

      <button
        type="button"
        onClick={onProtection}
        aria-pressed={protection}
        className={`inline-flex h-8 items-center gap-2 rounded-full border px-4 font-mono text-[11px] font-semibold tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 ${
          protection ? "border-live bg-live/15 text-foreground" : "border-line-strong text-muted hover:text-foreground"
        }`}
      >
        {protection ? <Lock size={14} weight="fill" aria-hidden="true" /> : <LockOpen size={14} aria-hidden="true" />}
        <span className="hidden sm:inline">PROTECTION </span>{protection ? "ON" : "OFF"}
      </button>

      <div className="flex items-center gap-4">
        <dl className="hidden gap-4 whitespace-nowrap font-mono text-[11px] lg:flex">
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
        <button type="button" onClick={onObs} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-line px-2.5 text-xs font-medium transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50">
          <LinkSimple size={14} aria-hidden="true" />
          <span className="hidden sm:inline">Lien OBS</span>
        </button>
        <Clock />
      </div>
    </header>
  );
}
