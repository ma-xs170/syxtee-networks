import type { Metadata } from "next";
import Link from "next/link";
import { DashHeader, DashPage, Tile } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { liveNow } from "@/lib/admin-data";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import { CutButton } from "../comptes/AdminForms";

export const metadata: Metadata = { title: "Admin · Relais", robots: { index: false } };

// Tous les relais de tous les comptes, flux en direct d'abord. « Couper le flux » = nouvelle clé (abus).

type Row = { id: string; user_id: string; name: string; protocol: string; server: string; mode: string; archived: boolean; last_live_at: string | null };
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }) : "jamais");

export default async function AdminRelaisPage({ searchParams }: { searchParams: Promise<{ archives?: string }> }) {
  await requireAdmin();
  const { archives } = await searchParams;
  if (!hasAdmin) return <DashPage>Clé secrète Supabase absente.</DashPage>;
  const db = createAdminClient();
  let q = db.from("relays").select("id, user_id, name, protocol, server, mode, archived, last_live_at").order("last_live_at", { ascending: false, nullsFirst: false }).limit(1000);
  if (archives !== "1") q = q.eq("archived", false);
  const [{ data }, live] = await Promise.all([q, liveNow()]);
  const rows = (data ?? []) as Row[];
  const { data: people } = rows.length ? await db.from("profiles").select("id, first_name, last_name, support_id").in("id", [...new Set(rows.map((r) => r.user_id))]) : { data: [] };
  const who = new Map((people ?? []).map((p) => [p.id as string, p]));
  const liveMap = new Map(live.map((l) => [l.relay_id, l]));
  rows.sort((a, b) => Number(liveMap.has(b.id)) - Number(liveMap.has(a.id)));

  return (
    <DashPage>
      <DashHeader lead="Tous les" hl="relais" sub={`${rows.length} relais · ${live.length} en direct`}>
        <Link href={archives === "1" ? "/admin/relais" : "/admin/relais?archives=1"} className="text-sm underline-offset-4 hover:underline">
          {archives === "1" ? "Masquer les archivés" : "Afficher les archivés"}
        </Link>
      </DashHeader>
      <Tile>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Aucun relais.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const p = who.get(r.user_id);
              const l = liveMap.get(r.id);
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    {l ? <span className="h-2 w-2 rounded-full bg-live" aria-label="En direct" /> : <span className="h-2 w-2" aria-hidden="true" />}
                    <span className="font-medium">{r.name}</span>
                    <Link href={`/admin/comptes/${r.user_id}`} className="text-muted underline-offset-4 hover:underline">
                      {[p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.support_id || "compte"}
                    </Link>
                    <span className="font-mono text-xs uppercase text-muted">
                      {r.protocol} · {r.server} · {r.mode}
                      {r.archived ? " · archivé" : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-4">
                    <span className="font-mono text-xs text-muted">{l ? (l.bitrate !== null ? `${(l.bitrate / 1000).toFixed(1)} Mb/s` : "en direct") : day(r.last_live_at)}</span>
                    {!r.archived && <CutButton userId={r.user_id} relayId={r.id} />}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Tile>
    </DashPage>
  );
}
