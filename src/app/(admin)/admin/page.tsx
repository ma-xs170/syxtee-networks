import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar, Chip, DashHeader, DashPage, Figure, Tile, TileLabel } from "@/components/admin/kit";
import { requireStaff } from "@/lib/admin";
import { pendingCount } from "@/lib/access";
import { newQuotesCount } from "@/lib/quotes";
import { firstAllowedHref } from "@/lib/staff";
import { supportBadges } from "@/lib/support";
import { overview } from "@/lib/admin-data";
import { hasAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const nf = new Intl.NumberFormat("fr-FR");
const duration = (since: number | null) => {
  if (!since) return "";
  const m = Math.max(0, Math.round((Date.now() - since) / 60_000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
};
const today = () => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date());

function Meter({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-xs tabular-nums">{detail}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-foreground/10" aria-hidden="true">
        <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, Math.max(2, value))}%` }} />
      </div>
    </div>
  );
}

export default async function AdminOverviewPage() {
  // Vue d'ensemble : propriétaire et administrateurs. Les autres rôles arrivent directement sur leur première page.
  const { access } = await requireStaff("any");
  if (access.role !== "owner" && access.role !== "admin") redirect(firstAllowedHref(access.permissions));
  if (!hasAdmin) return <DashPage>Clé secrète Supabase absente.</DashPage>;
  const [d, support, access_, quotes] = await Promise.all([overview(), supportBadges().catch(() => null), pendingCount().catch(() => 0), newQuotesCount().catch(() => 0)]);
  const mem = d.stats ? Math.round((d.stats.memory.usedMb / d.stats.memory.totalMb) * 100) : 0;
  const queue = [
    { label: "Tickets de support ouverts", n: support?.all ?? 0, href: "/admin/support" },
    { label: "Demandes d'accès à traiter", n: access_, href: "/admin/acces" },
    { label: "Nouvelles demandes de devis", n: quotes, href: "/admin/devis" },
  ];
  const todo = queue.reduce((s, q) => s + q.n, 0);

  return (
    <DashPage>
      <DashHeader kicker={today()} lead="Vue" hl="d'ensemble" sub={todo > 0 ? `${todo} élément${todo > 1 ? "s" : ""} attend${todo > 1 ? "ent" : ""} une réponse.` : "Rien en attente. La plateforme tourne."} />

      <section aria-label="Chiffres clés" className="grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        <Figure label="Comptes" value={nf.format(d.total)} hint={`+${d.new7} sur 7 j · +${d.new30} sur 30 j`} href="/admin/comptes" />
        <Figure label="Abonnés actifs" value={nf.format(d.subscribers)} hint="Essentiel, Signature, Prestige et Partenaire" />
        <Figure label="Relais actifs" value={nf.format(d.relays)} hint={`+${d.relays30} créés sur 30 j`} href="/admin/relais" />
        <Figure label="Heures de live" value={nf.format(d.hours)} hint="30 derniers jours" />
      </section>

      <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Tile aria-labelledby="direct">
          <TileLabel id="direct" right={<Chip tone={d.live.length ? "live" : "none"}>{d.live.length ? `${d.live.length} en direct` : "Silence"}</Chip>}>
            En direct maintenant
          </TileLabel>
          {d.live.length === 0 ? (
            <p className="mt-8 text-[15px] text-muted">Aucun flux en ce moment.</p>
          ) : (
            <ul className="mt-6 divide-y divide-line">
              {d.live.map((l) => (
                <li key={l.relay_id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 text-sm">
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={l.name ?? "?"} size={34} />
                    <span className="min-w-0 truncate">
                      <Link href={`/admin/comptes/${l.user_id}`} className="font-medium hover:underline">
                        {l.name}
                      </Link>
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

        <div className="grid gap-6">
          <Tile aria-labelledby="afaire">
            <TileLabel id="afaire">À traiter</TileLabel>
            <ul className="mt-5 divide-y divide-line">
              {queue.map((q) => (
                <li key={q.href}>
                  <Link href={q.href} className="group flex min-h-14 items-center justify-between gap-4 text-sm">
                    <span className="text-muted transition-colors group-hover:text-foreground">{q.label}</span>
                    <span className={`adm-figure text-2xl ${q.n ? "" : "text-faint"}`}>{q.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Tile>

          <Tile aria-labelledby="serveur">
            <TileLabel id="serveur" right={d.stats ? <Chip tone={d.stats.sls ? "ok" : "bad"}>{d.stats.sls ? "SRTLA en ligne" : "SRTLA hors ligne"}</Chip> : undefined}>
              Serveur relais
            </TileLabel>
            {!d.stats ? (
              <p className="mt-5 text-sm text-muted">Statistiques indisponibles : Core injoignable ou pas encore à jour.</p>
            ) : (
              <div className="mt-6 space-y-6">
                <Meter label="CPU" value={d.stats.cpu.percent} detail={`${d.stats.cpu.percent} % · ${d.stats.cpu.cores} cœur${d.stats.cpu.cores > 1 ? "s" : ""}`} />
                <Meter label="RAM" value={mem} detail={`${nf.format(d.stats.memory.usedMb)} / ${nf.format(d.stats.memory.totalMb)} Mo`} />
                <p className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-muted">Bande passante</span>
                  <span className="font-mono text-xs tabular-nums">{d.stats.network.available ? `↓ ${d.stats.network.rxMbps} · ↑ ${d.stats.network.txMbps} Mb/s` : "indisponible"}</span>
                </p>
              </div>
            )}
          </Tile>
        </div>
      </div>
    </DashPage>
  );
}
