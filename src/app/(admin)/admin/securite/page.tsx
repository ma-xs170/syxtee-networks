import type { Metadata } from "next";
import Link from "next/link";
import BanForm from "@/components/admin/BanForm";
import { ArrowLink, DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { getSecurity, hasCore, type SecurityEvent } from "@/lib/core";
import { unbanAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Sécurité", robots: { index: false } };

// Admin : tentatives refusées sur les relais (clé inconnue, 2e appareil, compte refusé), IP bannies.
// Réservée à ADMIN_EMAILS (404 sinon). Données lues au Core (journal security_events, table ip_bans).

const KIND: Record<string, string> = {
  refused: "Clé refusée",
  duplicate: "2e appareil",
  denied: "Compte refusé",
  banned: "IP bannie",
  unbanned: "IP débannie",
  kicked: "Session coupée",
};
const REASON: Record<string, string> = {
  unknown_key: "clé inconnue",
  protocol: "mauvais protocole",
  plan: "formule sans relais",
  quota: "quota de relais",
  streams: "flux simultanés",
  suspended: "compte suspendu",
  account: "compte introuvable",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Guadeloupe" });

function detail(e: SecurityEvent) {
  const d = e.detail ?? {};
  const parts = [
    typeof d.key === "string" ? d.key : null,
    typeof d.reason === "string" ? (REASON[d.reason] ?? d.reason) : null,
    d.role === "publisher" ? "entrée publication" : d.role === "player" ? "entrée lecture" : null,
    typeof d.sessions === "number" ? `${d.sessions} session(s)` : null,
    d.alert ? "propriétaire alerté" : null,
  ];
  return parts.filter(Boolean).join(", ");
}

/** Tentatives refusées (clé inconnue, 2e appareil) sur les dernières 24 h. */
function recentRefusals(events: SecurityEvent[]) {
  const since = Date.now() - 86_400_000;
  return events.filter((e) => (e.kind === "refused" || e.kind === "duplicate") && Date.parse(e.at) >= since).length;
}

export default async function AdminSecuritePage({ searchParams }: { searchParams: Promise<{ ip?: string | string[] }> }) {
  await requireAdmin();
  const { ip } = await searchParams;
  let data: Awaited<ReturnType<typeof getSecurity>> = null;
  let down = !hasCore;
  if (hasCore) {
    try {
      data = await getSecurity();
    } catch {
      down = true;
    }
  }
  const events = data?.events ?? [];
  const bans = data?.bans ?? [];
  const refused24h = recentRefusals(events);

  return (
    <DashPage>
      <DashHeader lead="Admin" hl="Sécurité" sub="Connexions refusées sur les relais SRT, SRTLA, RTMP et Cam. 10 refus en 1 minute bannissent une IP 15 minutes.">
        <ArrowLink href="/admin/comptes">Comptes</ArrowLink>
      </DashHeader>
      {down ? (
        <p className="text-sm text-muted">Le Core ne répond pas, ou n&apos;a pas encore la page Sécurité. Réessaie après sa mise à jour.</p>
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
            <Tile>
              <TileLabel>Dernières 24 h</TileLabel>
              <p className="mt-4 font-mono text-4xl tabular-nums">{refused24h}</p>
              <p className="mt-1 text-sm text-muted">tentatives refusées</p>
              <p className="mt-6 font-mono text-4xl tabular-nums">{bans.length}</p>
              <p className="mt-1 text-sm text-muted">IP bannie{bans.length > 1 ? "s" : ""} en ce moment</p>
            </Tile>
            <Tile>
              <TileLabel>Bannir une IP</TileLabel>
              <div className="mt-5">
                <BanForm ip={typeof ip === "string" ? ip : ""} />
              </div>
              {bans.length > 0 && (
                <ul className="mt-6 grid gap-3">
                  {bans.map((b) => (
                    <li key={b.ip} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm">{b.ip}</p>
                        <p className="text-xs text-muted">
                          jusqu&apos;au {when(b.until)} · {b.auto ? "automatique" : b.reason}
                        </p>
                      </div>
                      <form action={unbanAction}>
                        <input type="hidden" name="ip" value={b.ip} />
                        <button type="submit" className="h-9 whitespace-nowrap rounded-full border border-line px-4 text-sm transition-colors hover:bg-foreground/10">
                          Débannir
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </Tile>
          </div>

          <Tile>
            <TileLabel>Journal récent</TileLabel>
            {events.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Aucune tentative refusée pour l&apos;instant.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs text-muted">
                    <tr>
                      <th className="py-2 pr-4 font-normal">Date</th>
                      <th className="py-2 pr-4 font-normal">Événement</th>
                      <th className="py-2 pr-4 font-normal">Protocole</th>
                      <th className="py-2 pr-4 font-normal">IP / pays</th>
                      <th className="py-2 pr-4 font-normal">Relais visé</th>
                      <th className="py-2 pr-4 font-normal">Détail</th>
                      <th className="py-2 font-normal"><span className="sr-only">Action</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {events.map((e, i) => (
                      <tr key={`${e.at}-${i}`}>
                        <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs text-muted">{when(e.at)}</td>
                        <td className="whitespace-nowrap py-2 pr-4">{KIND[e.kind] ?? e.kind}</td>
                        <td className="py-2 pr-4 font-mono text-xs uppercase">{e.protocol ?? ""}</td>
                        <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs">
                          {e.ip ?? (e.protocol === "srtla" ? "masquée (SRTLA)" : "")}
                          {e.country ? ` · ${e.country}` : ""}
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs text-muted">{e.relay_id ? e.relay_id.slice(0, 8) : ""}</td>
                        <td className="py-2 pr-4 text-xs text-muted">{detail(e)}</td>
                        <td className="py-2 text-right">
                          {e.ip && e.kind !== "banned" && e.kind !== "unbanned" && (
                            <Link href={`/admin/securite?ip=${encodeURIComponent(e.ip)}`} className="whitespace-nowrap text-xs text-muted underline-offset-4 hover:text-foreground hover:underline">
                              Bannir
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Tile>
        </div>
      )}
    </DashPage>
  );
}
