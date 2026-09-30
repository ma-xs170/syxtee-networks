import { Tile, TileLabel } from "@/components/dashboard/ui";
import type { SecurityAlert } from "@/lib/core";

// Mes relais : tentatives de connexion refusées sur tes clés (7 derniers jours). Ex-page « Sécurité & clés ».

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const place = (a: SecurityAlert) =>
  a.ip ? `${a.ip}${a.country ? ` / ${new Intl.DisplayNames(["fr"], { type: "region" }).of(a.country) ?? a.country}` : ""}` : "un appareil via SRTLA (IP masquée par le relais)";

export default function SecurityAlerts({ alerts, relays }: { alerts: SecurityAlert[]; relays: { id: string; name: string }[] }) {
  const name = (id: string | null) => relays.find((r) => r.id === id)?.name ?? "un relais supprimé";
  return (
    <Tile className="mt-10" aria-labelledby="tentatives">
      <TileLabel id="tentatives">Tentatives de connexion</TileLabel>
      {alerts.length === 0 ? (
        <p className="mt-4 max-w-[65ch] text-sm leading-relaxed text-muted">
          Aucune sur les 7 derniers jours. Un seul appareil peut diffuser sur une clé : si un autre essaie pendant ton direct, il est refusé et tu le vois ici.
        </p>
      ) : (
        <>
          <ul className="mt-4 grid gap-3">
            {alerts.map((a, i) => (
              <li key={`${a.at}-${i}`} className="rounded-2xl border border-line px-4 py-3">
                <p className="text-sm">
                  Tentative sur ton relais <span className="font-medium">{name(a.relay_id)}</span> depuis <span className="font-mono">{place(a)}</span>
                </p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {when(a.at)}
                  {a.protocol ? ` · ${a.protocol.toUpperCase()}` : ""}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">Ce n&apos;était pas toi ? Régénère la clé de ce relais : l&apos;ancienne est coupée immédiatement.</p>
        </>
      )}
    </Tile>
  );
}
