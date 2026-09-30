import type { Metadata } from "next";
import Link from "next/link";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { overview } from "@/lib/admin-data";
import { hasAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const nf = new Intl.NumberFormat("fr-FR");
const duration = (since: number | null) => {
  if (!since) return "";
  const m = Math.max(0, Math.round((Date.now() - since) / 60_000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
};

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Tile>
      <TileLabel>{label}</TileLabel>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </Tile>
  );
}

function Meter({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-xs tabular-nums">{detail}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/10" aria-hidden="true">
        <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, Math.max(2, value))}%` }} />
      </div>
    </div>
  );
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  if (!hasAdmin) return <DashPage>Clé secrète Supabase absente.</DashPage>;
  const d = await overview();
  const mem = d.stats ? Math.round((d.stats.memory.usedMb / d.stats.memory.totalMb) * 100) : 0;

  return (
    <DashPage>
      <DashHeader lead="Vue" hl="d'ensemble" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Comptes" value={nf.format(d.total)} hint={`+${d.new7} sur 7 j · +${d.new30} sur 30 j`} />
        <Kpi label="Abonnés actifs" value={nf.format(d.subscribers)} hint="Payant et Partenaire" />
        <Kpi label="Relais actifs" value={nf.format(d.relays)} hint={`+${d.relays30} créés sur 30 j`} />
        <Kpi label="Heures de live" value={nf.format(d.hours)} hint="30 derniers jours" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Tile>
          <TileLabel>En direct maintenant · {d.live.length}</TileLabel>
          {d.live.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Aucun flux en ce moment.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {d.live.map((l) => (
                <li key={l.relay_id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-live" aria-hidden="true" />
                    <span className="truncate">
                      {l.support_id ? (
                        <Link href={`/admin/comptes/${l.user_id}`} className="hover:underline">
                          {l.name}
                        </Link>
                      ) : (
                        l.name
                      )}
                      <span className="text-muted"> · {l.relay_name ?? "relais"}</span>
                    </span>
                  </span>
                  <span className="font-mono text-xs tabular-nums text-muted">
                    {l.bitrate !== null ? `${(l.bitrate / 1000).toFixed(1)} Mb/s · ` : ""}
                    {duration(l.since)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Tile>
        <Tile>
          <TileLabel>Serveur relais</TileLabel>
          {!d.stats ? (
            <p className="mt-4 text-sm text-muted">Statistiques indisponibles : Core injoignable ou pas encore à jour.</p>
          ) : (
            <div className="mt-5 space-y-5">
              <Meter label="CPU" value={d.stats.cpu.percent} detail={`${d.stats.cpu.percent} % · ${d.stats.cpu.cores} cœur${d.stats.cpu.cores > 1 ? "s" : ""}`} />
              <Meter label="RAM" value={mem} detail={`${nf.format(d.stats.memory.usedMb)} / ${nf.format(d.stats.memory.totalMb)} Mo`} />
              <p className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-muted">Bande passante</span>
                <span className="font-mono text-xs tabular-nums">
                  {d.stats.network.available ? `↓ ${d.stats.network.rxMbps} · ↑ ${d.stats.network.txMbps} Mb/s` : "indisponible"}
                </span>
              </p>
              <p className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-muted">Relais SRTLA</span>
                <span className="font-mono text-xs">{d.stats.sls ? "en ligne" : "hors ligne"}</span>
              </p>
            </div>
          )}
        </Tile>
      </div>
    </DashPage>
  );
}
