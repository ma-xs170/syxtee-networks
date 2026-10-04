import type { Metadata } from "next";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { formatVersion, type Version } from "@/lib/releases";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import ReleaseItem from "./ReleaseItem";
import ReleaseForm from "./ReleaseForm";

export const metadata: Metadata = { title: "Admin · Versions", robots: { index: false } };
export const dynamic = "force-dynamic";

// Admin : notes de version. Le numéro est calculé tout seul (correctif, nouveauté, majeure) ; la note part dans le salon Discord.

type Row = Version & { id: string; title: string; notes: string; created_by: string; discord_sent_at: string | null; discord_message_id: string | null; updated_at: string | null; created_at: string };

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Guadeloupe" });

export default async function AdminVersionsPage() {
  await requireAdmin();
  const { data, error } = hasAdmin
    ? await createAdminClient()
        .from("releases")
        .select("id, major, minor, patch, title, notes, created_by, discord_sent_at, discord_message_id, updated_at, created_at")
        .order("major", { ascending: false })
        .order("minor", { ascending: false })
        .order("patch", { ascending: false })
        .limit(30)
    : { data: [], error: null };
  const rows = (data ?? []) as Row[];
  const latest = rows[0] ?? null;

  return (
    <DashPage>
      <DashHeader lead="Admin" hl="Versions" sub="Notes de version : le numéro change tout seul, la note est publiée dans le salon Discord des nouveautés." />
      {error ? (
        <p className="text-sm text-muted">Lecture impossible : applique d&apos;abord la migration 0037_releases.sql dans Supabase.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <Tile>
            <TileLabel right={<span className="font-mono text-xs text-muted">ACTUELLE {latest ? `v${formatVersion(latest)}` : "—"}</span>}>Nouvelle version</TileLabel>
            <div className="mt-4">
              <ReleaseForm latest={latest ? { major: latest.major, minor: latest.minor, patch: latest.patch } : null} />
            </div>
          </Tile>
          <Tile>
            <TileLabel>Historique</TileLabel>
            {rows.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Aucune version publiée.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {rows.map((r) => (
                  <ReleaseItem
                    key={r.id}
                    id={r.id}
                    version={formatVersion(r)}
                    title={r.title}
                    notes={r.notes}
                    sent={!!r.discord_message_id}
                    meta={`${when(r.created_at)} · ${r.discord_message_id ? "sur Discord" : r.discord_sent_at ? "sur Discord (non modifiable)" : "pas envoyée"}${r.updated_at ? " · modifiée" : ""}`}
                  />
                ))}
              </ul>
            )}
          </Tile>
        </div>
      )}
    </DashPage>
  );
}
