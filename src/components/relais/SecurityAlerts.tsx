import type { SecurityAlert } from "@/lib/core";

// Mes relais : tentatives de connexion refusées sur tes clés (7 derniers jours). Ex-page « Sécurité & clés ».

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const place = (a: SecurityAlert) =>
  a.ip ? `${a.ip}${a.country ? ` / ${new Intl.DisplayNames(["fr"], { type: "region" }).of(a.country) ?? a.country}` : ""}` : "un appareil via SRTLA (IP masquée par le relais)";

export default function SecurityAlerts({ alerts, relays }: { alerts: SecurityAlert[]; relays: { id: string; name: string }[] }) {
  const name = (id: string | null) => relays.find((r) => r.id === id)?.name ?? "un serveur supprimé";
  return (
    <section aria-labelledby="tentatives" className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
      <h2 id="tentatives" className="border-b border-line px-5 py-3 text-sm font-medium">
        Tentatives de connexion <span className="ml-2 font-normal tabular-nums text-muted">{alerts.length}</span>
      </h2>
      {alerts.length === 0 ? (
        <p className="px-5 py-4 text-sm leading-relaxed text-muted">Aucune sur les 7 derniers jours. Si un autre appareil essaie de diffuser sur ta clé pendant ton direct, il est refusé et tu le vois ici.</p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {alerts.map((a, i) => (
              <li key={`${a.at}-${i}`} className="px-5 py-3.5">
                <p className="text-sm">
                  Tentative sur <span className="font-medium">{name(a.relay_id)}</span> depuis <span className="font-mono">{place(a)}</span>
                </p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {when(a.at)}
                  {a.protocol ? ` · ${a.protocol.toUpperCase()}` : ""}
                </p>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-3.5 text-sm text-muted">Ce n&apos;était pas toi ? Régénère la clé de ce serveur : l&apos;ancienne est coupée immédiatement.</p>
        </>
      )}
    </section>
  );
}
