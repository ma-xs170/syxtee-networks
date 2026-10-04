import type { Metadata } from "next";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { type BotStatus, getBotStatus, hasBot } from "@/lib/discord-bot";
import { postServicesAction, toggleAlertsAction } from "./actions";
import { AnnounceForm, PresenceForm } from "./BotForms";

export const metadata: Metadata = { title: "Admin · Discord", robots: { index: false } };
export const dynamic = "force-dynamic";

// Admin : panel du bot Discord. État du bot et des services, annonce dans le salon, statut du bot, alertes de panne.
// Le bot tourne sur le VPS (dossier bot/) ; le site l'appelle avec le jeton du Core.

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Guadeloupe" });
const uptime = (s: number) => (s >= 86400 ? `${Math.floor(s / 86400)} j ${Math.floor((s % 86400) / 3600)} h` : s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min` : `${Math.floor(s / 60)} min`);
const DOT = { up: "bg-emerald-500", slow: "bg-amber-500", down: "bg-accent" } as const;
const LABEL = { up: "En ligne", slow: "Lent", down: "Hors ligne" } as const;

const btn = "h-10 whitespace-nowrap rounded-full border border-line px-4 text-sm text-foreground transition-colors hover:border-foreground/40";

export default async function AdminDiscordPage() {
  await requireAdmin();
  let status: BotStatus | null = null;
  let problem = hasBot ? "" : "CORE_URL ou CORE_API_TOKEN manque sur Vercel.";
  if (hasBot) {
    try {
      status = await getBotStatus();
    } catch (e) {
      problem = e instanceof Error ? e.message : "Le bot ne répond pas.";
    }
  }

  return (
    <DashPage>
      <DashHeader lead="Admin" hl="Discord" sub="Panel du bot : annonces, statut, alertes de panne et état des services du serveur Discord SYXTEE." />
      {!status ? (
        <p className="text-sm text-muted">Le bot ne répond pas{problem ? ` (${problem})` : ""}. Vérifie qu&apos;il tourne sur le VPS : <span className="font-mono">docker compose logs bot</span>.</p>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Tile>
              <TileLabel>Bot</TileLabel>
              <p className="mt-3 text-lg font-semibold">{status.tag ?? "Déconnecté"}</p>
              <p className="mt-1 font-mono text-xs text-muted">
                {status.connected ? "CONNECTÉ" : "HORS LIGNE"} · {status.pingMs} ms · {status.guilds} serveur{status.guilds > 1 ? "s" : ""} · actif {uptime(status.uptimeS)}
              </p>
            </Tile>
            <Tile>
              <TileLabel>Salon des nouveautés</TileLabel>
              <p className="mt-3 text-lg font-semibold">{status.channel.name ? `#${status.channel.name}` : "Introuvable"}</p>
              <p className="mt-1 font-mono text-xs text-muted">{status.channel.ok ? "ACCÈS OK" : "LE BOT N'Y A PAS ACCÈS"}</p>
            </Tile>
            <Tile>
              <TileLabel>Statut affiché</TileLabel>
              <p className="mt-3 text-lg font-semibold">{status.presence.current ?? "—"}</p>
              <p className="mt-1 font-mono text-xs text-muted">{status.presence.mode === "auto" ? "AUTOMATIQUE" : "TEXTE FIXE"}</p>
            </Tile>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Tile>
              <TileLabel>Publier une annonce</TileLabel>
              <div className="mt-4">
                <AnnounceForm />
              </div>
            </Tile>
            <Tile>
              <TileLabel>Statut du bot</TileLabel>
              <div className="mt-4">
                <PresenceForm mode={status.presence.mode} type={status.presence.type} text={status.presence.text} />
              </div>
            </Tile>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Tile>
              <TileLabel
                right={
                  <form action={postServicesAction}>
                    <button type="submit" className={btn}>Publier dans le salon</button>
                  </form>
                }
              >
                État des services
              </TileLabel>
              <ul className="mt-3 divide-y divide-line">
                {status.services.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="flex items-center gap-3">
                      <span aria-hidden className={`size-2 rounded-full ${DOT[c.status]}`} />
                      {c.name}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {LABEL[c.status]}
                      {c.ms !== null ? ` · ${c.ms} ms` : ""}
                      {c.detail ? ` · ${c.detail}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <form action={toggleAlertsAction} className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                <p className="text-sm text-muted">Alertes de panne et de retour dans le salon : {status.alertsEnabled ? "activées" : "coupées"}.</p>
                <input type="hidden" name="enabled" value={status.alertsEnabled ? "0" : "1"} />
                <button type="submit" className={btn}>{status.alertsEnabled ? "Couper" : "Activer"}</button>
              </form>
            </Tile>
            <Tile>
              <TileLabel>Derniers messages publiés</TileLabel>
              {status.log.length === 0 ? (
                <p className="mt-4 text-sm text-muted">Rien depuis le dernier démarrage du bot.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {status.log.map((l) => (
                    <li key={l.at + l.title} className="py-3">
                      <p className="text-sm font-medium">{l.title}</p>
                      <p className="mt-1 font-mono text-xs uppercase text-muted">
                        {l.kind} · {l.by} · {when(l.at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Tile>
          </div>
        </div>
      )}
    </DashPage>
  );
}
