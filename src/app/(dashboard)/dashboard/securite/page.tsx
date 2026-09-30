import type { Metadata } from "next";
import StreamModeToggle from "@/components/dashboard/StreamModeToggle";
import { ArrowLink, DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { hasCore, listAlerts, type SecurityAlert } from "@/lib/core";
import { loadRelays } from "@/lib/relays";
import PlanGate from "@/components/plans/PlanGate";

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const place = (a: SecurityAlert) =>
  a.ip ? `${a.ip}${a.country ? ` / ${new Intl.DisplayNames(["fr"], { type: "region" }).of(a.country) ?? a.country}` : ""}` : "un appareil via SRTLA (IP masquée par le relais)";

export const metadata: Metadata = { title: "Sécurité & clés", robots: { index: false } };

export default async function SecuritePage() {
  const user = await requireUser("/dashboard/securite");
  const [alerts, { relays }] = hasCore ? await Promise.all([listAlerts(user.id).catch(() => []), loadRelays(user.id)]) : [[], { relays: [] }];
  const name = (id: string | null) => relays.find((r) => r.id === id)?.name ?? "un relais supprimé";

  return (
    <DashPage>
      <PlanGate feature="cles">
      <DashHeader lead="Sécurité &" hl="clés" sub="Tes clés de stream sont dans tes URLs : quiconque les connaît peut diffuser à ta place." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Tile>
          <TileLabel>Tes clés</TileLabel>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Chaque relais a sa propre clé. Régénère-la si tu l&apos;as montrée en live ou partagée : les anciennes URLs de ce relais cessent de marcher immédiatement.
          </p>
          <div className="mt-6">
            <ArrowLink href="/dashboard/relais">Mes relais</ArrowLink>
          </div>
        </Tile>
        <Tile className="lg:col-span-2">
          <TileLabel>Tentatives de connexion</TileLabel>
          {alerts.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Aucune sur les 7 derniers jours. Un seul appareil peut diffuser sur une clé : si un autre essaie pendant ton direct, il est refusé et tu le vois ici.
            </p>
          ) : (
            <>
              <ul className="mt-4 grid gap-3">
                {alerts.map((a, i) => (
                  <li key={`${a.at}-${i}`} className="rounded-2xl border border-line px-4 py-3">
                    <p className="text-sm">
                      Tentative de connexion sur ton relais <span className="font-medium">{name(a.relay_id)}</span> depuis <span className="font-mono">{place(a)}</span>
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
        <Tile>
          <TileLabel>Mode stream</TileLabel>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Tu montres ton dashboard en live ? Active le mode stream : clés, URLs et e-mail sont floutés partout, et le bouton œil est bloqué.
          </p>
          <div className="mt-6">
            <StreamModeToggle withLabel />
          </div>
        </Tile>
      </div>
    </PlanGate>
    </DashPage>
  );
}
