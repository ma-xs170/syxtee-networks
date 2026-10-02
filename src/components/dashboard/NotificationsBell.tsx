"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { fmtAgo } from "@/lib/dashboard-data";

// Cloche du bas de la barre latérale : notifications envoyées par un admin (à tous ou à ce compte).
// Pastille tant qu'il en reste de non lues ; les ouvrir les marque lues.

type Note = { id: string; title: string; body: string; created_at: string };

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [read, setRead] = useState<Set<string>>(new Set());
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const [n, r] = await Promise.all([
        supabase.from("notifications").select("id, title, body, created_at").order("created_at", { ascending: false }).limit(20),
        supabase.from("notification_reads").select("notification_id"),
      ]);
      setNotes((n.data ?? []) as Note[]);
      setRead(new Set((r.data ?? []).map((x) => x.notification_id as string)));
    } catch {
      // Table absente ou hors ligne : la cloche reste vide.
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 120_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const unread = notes.filter((n) => !read.has(n.id));

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || !unread.length) return;
    const { data } = await createClient().auth.getUser();
    if (!data.user) return;
    const ids = unread.map((n) => n.id);
    await createClient().from("notification_reads").upsert(ids.map((id) => ({ user_id: data.user!.id, notification_id: id })), { ignoreDuplicates: true });
    // La pastille reste jusqu'à la fermeture : on garde « non lu » visible dans la liste ouverte.
    setTimeout(() => setRead((s) => new Set([...s, ...ids])), 0);
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={unread.length ? `Notifications, ${unread.length} non lue${unread.length > 1 ? "s" : ""}` : "Notifications"}
        className="relative grid h-10 w-10 place-items-center rounded-lg border border-transparent text-muted transition-colors hover:bg-accent/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <Bell size={20} aria-hidden="true" />
        {unread.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute bottom-0 left-full z-50 ml-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-background shadow-[0_18px_40px_rgba(0,0,0,0.6)] max-lg:bottom-full max-lg:left-auto max-lg:right-0 max-lg:mb-2 max-lg:ml-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-lg p-1 text-muted hover:text-foreground">
              <X size={16} />
            </button>
          </div>
          {notes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-sm text-muted">
              <Bell size={20} aria-hidden="true" />
              Aucune notification
            </div>
          ) : (
            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {notes.map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="mt-1 whitespace-pre-line text-sm text-muted">{n.body}</p>}
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{fmtAgo(n.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
