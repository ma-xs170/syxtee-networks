import { notFound } from "next/navigation";
import Overview from "@/components/dashboard/Overview";
import DemoLive from "../DemoLive";
import StreamHealth, { type Sample } from "@/components/dashboard/StreamHealth";
import { DailyBars } from "@/components/dashboard/charts";
import { SessionList } from "@/components/dashboard/sessions";
import { DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import StreamerWall from "@/components/home/StreamerWall";
import CloudBackdrop from "@/components/home/CloudBackdrop";
import AdminShell from "@/app/(admin)/admin/AdminShell";
import StudioDemo from "@/components/studio/StudioDemo";
import PluginDownload from "@/components/dashboard/PluginDownload";
import RemoteList from "@/components/dashboard/RemoteList";
import BackupsList from "@/components/dashboard/BackupsList";
import RemoteObs from "@/components/remote/RemoteObs";
import InvitesManager from "@/components/dashboard/InvitesManager";
import TeamUI, { type MemberView } from "@/app/(admin)/admin/equipe/TeamUI";
import type { DevicesDemo } from "@/components/dashboard/useLinkDevices";
import RelayList from "@/components/relais/RelayList";
import TicketChat from "@/components/support/TicketChat";
import NewTicketForm from "@/components/support/NewTicketForm";
import AccountSheet from "@/app/(admin)/admin/comptes/AccountSheet";
import type { Overview as OverviewData, LiveSession } from "@/lib/dashboard-data";
import type { RelayRow } from "@/lib/relay-groups";

// Pages de démo pour les captures d'écran du site (scripts/capture-outils.mjs). Les vrais composants du dashboard,
// avec des données d'exemple : aucun compte, aucune clé réelle. Désactivées en production.

const NOW = Date.UTC(2026, 9, 2, 20, 0, 0);
const DEMO_TEAM: MemberView[] = [
  { userId: "1", email: "mathxs.170@gmail.com", displayName: "Mathis Custos", avatarUrl: null, country: "GP", regionName: "Guadeloupe", lastSeen: new Date().toISOString(), role: "owner", permissions: [], active: true, source: "env" },
  { userId: "2", email: "ines.marlot@exemple.com", displayName: "Inès Marlot", avatarUrl: null, country: "FR", regionName: "France", lastSeen: new Date(Date.now() - 12 * 60_000).toISOString(), role: "developer", permissions: ["support", "accounts", "versions", "relays", "security", "journal"], active: true, source: "db" },
  { userId: "3", email: "kairo.duval@exemple.com", displayName: "Kairo Duval", avatarUrl: null, country: "MQ", regionName: "Martinique", lastSeen: new Date(Date.now() - 3 * 3600_000).toISOString(), role: "support", permissions: ["support"], active: true, source: "db" },
  { userId: "4", email: "sam.roche@exemple.com", displayName: "Sam Roche", avatarUrl: null, country: "CA", regionName: "Canada", lastSeen: null, role: "security", permissions: ["security", "journal", "accounts"], active: false, source: "db" },
];
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const DAY = 86_400_000;
const url = "srtla://relais.exemple.net:5000?streamid=";

const relay = (i: number, name: string, protocol: "srtla" | "rtmp", live: boolean, lastLive: number | null, avg: number | null): RelayRow => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  name,
  protocol,
  server: "bhs1",
  host: "relais.exemple.net",
  archived: false,
  live,
  mode: "direct",
  regie_available: false,
    record: false,
    record_format: "mov",
    switch_trigger: "cut",
    record_available: false,
  urls: { srtla_url: `${url}demo${i}`, srt_url: `${url}demo${i}`, rtmp_server: "rtmp://relais.exemple.net/live", rtmp_key: `demo${i}`, rtmp_url: `rtmp://relais.exemple.net/live/demo${i}` },
  obs_srt_url: `${url}obs${i}`,
  created_at: iso(40 * DAY),
  rotated_at: null,
  last_live_at: lastLive === null ? null : iso(lastLive),
  avg_kbps: avg,
});

const RELAYS: RelayRow[] = [
  relay(1, "iPhone 16 Pro", "srtla", true, 0, 6240),
  relay(2, "Osmo Pocket 3", "rtmp", false, 2 * DAY, 5890),
  relay(3, "Galaxy S24", "srtla", false, 9 * DAY, 4730),
  relay(4, "iPhone 15", "srtla", false, 14 * DAY, 4210),
  relay(5, "OBS salon", "rtmp", false, 20 * DAY, 5600),
  relay(6, "Insta360 X4", "rtmp", false, 33 * DAY, null),
];

const SAMPLE_COUNT = 90;
const history: Sample[] = Array.from({ length: SAMPLE_COUNT }, (_, i) => ({
  t: NOW - (SAMPLE_COUNT - i) * 10_000,
  bitrate: 6000 + Math.sin(i / 5) * 380 + Math.sin(i * 1.7) * 140,
  rtt: 42 + Math.sin(i / 7) * 6,
  dropped: i % 29 === 0 ? 3 : 0,
  congestion: 0.04,
  links: 4,
}));
const lastSample = { ...history[history.length - 1], bitrate: 6120, rtt: 41, congestion: 0.03, dropped: 0 };

const SESSIONS: LiveSession[] = [
  { id: "s1", relay_id: RELAYS[0].id, device_name: null, started_at: iso(3 * 3_600_000), ended_at: null, duration_s: 5400, avg_kbps: 6180, peak_kbps: 7010, reconnects: 0, relay: "bhs1", bitrate_series: history.slice(-40).map((h) => h.bitrate), relay_info: { name: "iPhone 16 Pro" } },
  { id: "s2", relay_id: RELAYS[1].id, device_name: null, started_at: iso(2 * DAY), ended_at: iso(2 * DAY - 4_000_000), duration_s: 4000, avg_kbps: 5890, peak_kbps: 6420, reconnects: 1, relay: "bhs1", bitrate_series: history.slice(10, 50).map((h) => h.bitrate - 150), relay_info: { name: "Osmo Pocket 3" } },
  { id: "s3", relay_id: RELAYS[2].id, device_name: null, started_at: iso(4 * DAY), ended_at: iso(4 * DAY - 7_200_000), duration_s: 7200, avg_kbps: 4730, peak_kbps: 5560, reconnects: 3, relay: "bhs1", bitrate_series: history.slice(20, 60).map((h) => h.bitrate - 1200), relay_info: { name: "Galaxy S24" } },
];

const kpis = (k: number) => ({ seconds: 18_400 * k, count: 7 * k, avgSeconds: 2630, avgKbps: 5720, peakKbps: 7010 });
const OVERVIEW: OverviewData = {
  timezone: "Europe/Paris",
  range: "7d",
  generatedAt: iso(0),
  kpis: kpis(1),
  previous: kpis(0.7),
  daily: Array.from({ length: 30 }, (_, i) => ({ day: new Date(NOW - (29 - i) * DAY).toISOString().slice(0, 10), minutes: [0, 0, 95, 140, 0, 60, 220, 0, 0, 180, 75, 0, 130, 260, 0][i % 15] })),
  last: SESSIONS[0],
  recent: SESSIONS,
  hasEverStreamed: true,
  lastEndedAt: iso(2 * DAY),
  alerts: [],
  keys: { relay: "iPhone 16 Pro", moblin: `${url}demo1`, srt: `${url}demo1`, obs: `${url}obs1` },
  relays: { active: 6, max: 10 },
  sources: [],
  coreStatus: "ok",
  plan: { name: "Partenaire", streams: 3 },
};

const LIVE_STATE = {
  live: true,
  reconnecting: false,
  started_at: NOW - 5_400_000,
  kbps: 6120,
  reconnects: 0,
  relay_id: RELAYS[0].id,
  relays: [{ id: RELAYS[0].id, name: RELAYS[0].name, live: true, reconnecting: false, started_at: NOW - 5_400_000, kbps: 6120, reconnects: 0 }],
};

const DEMO_DEVICES: DevicesDemo = {
  latest: { version: "0.4.0", released_at: iso(DAY), notes: ["OBS est piloté par le plugin lui-même : plus rien à activer dans OBS", "Renouvellement automatique de la connexion"], macos: { available: true, url: "/dl/SYXTEE-Link-mac.pkg", size: 43_867_489, sha256: null, beta: false }, windows: { available: false, url: null, size: null, sha256: null, beta: true }, linux: { available: false, url: null, size: null, sha256: null, beta: false } },
  devices: [
    { id: "d1", name: "OBS-DJ-SYXTEE.local", platform: "darwin", os: "macOS 27.0", host: "OBS-DJ-SYXTEE.local", plugin_version: "0.4.0", online: true, online_since: iso(39_000), last_seen: iso(1000), created_at: iso(9 * DAY) },
    { id: "d2", name: "OBS SYXTEE", platform: "win32", os: "Windows 11", host: "PC-REGIE", plugin_version: "0.3.0", online: false, online_since: null, last_seen: iso(45 * 60_000), created_at: iso(20 * DAY) },
  ],
};

export default async function VitrinePage({ params }: { params: Promise<{ tool: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { tool } = await params;
  return (
    <div id="capture" data-theme="dark" className={`mx-auto bg-background p-8 text-foreground ${tool === "accueil" ? "w-[1500px]" : tool === "controle-obs" || tool === "equipe" ? "w-full !p-0" : "w-[1100px]"}`}>
      {tool === "compte" && (
        <AccountSheet
          id="00000000-0000-4000-8000-000000000001"
          name="Sloane EUXIN"
          email="sl.euxin@comptes.syxtee-networks.fr"
          avatarUrl={null}
          supportId="K7QX2M"
          managed
          suspendedAt={null}
          planId="paid"
          planName="Signature"
          planUntil={new Date(Date.now() + 26 * 86_400_000).toISOString()}
          planNote="Ami"
          maxServers={10}
          createdAt={new Date(Date.now() - 40 * 86_400_000).toISOString()}
          lastSignIn={new Date(Date.now() - 3 * 3600_000).toISOString()}
          presence="Vu il y a 3 h"
          twitch="sloane_irl"
          country={{ name: "Guadeloupe", flag: "🇬🇵", timezone: "America/Guadeloupe" }}
          liveCount={1}
          servers={[{ id: "1", name: "iPhone 16 Pro", protocol: "srtla", live: true }, { id: "2", name: "Osmo Pocket 3", protocol: "rtmp", live: false }, { id: "3", name: "Drone", protocol: "rtmp", live: false }]}
          lastLiveAt={new Date(Date.now() - 20 * 60_000).toISOString()}
          tickets={{ open: 1, resolved: 4 }}
          billing={{ interval: "month", status: "active", periodEnd: new Date(Date.now() + 12 * 86_400_000).toISOString(), renews: true, manual: false, customerId: "cus_demo" }}
          note="Ami"
          activity={[{ id: 1, action: "account.view", admin: "mathxs.170@gmail.com", at: new Date(Date.now() - 600_000).toISOString() }, { id: 2, action: "plan.set", admin: "mathxs.170@gmail.com", at: new Date(Date.now() - 86_400_000).toISOString() }, { id: 3, action: "managed.create", admin: "mathxs.170@gmail.com", at: new Date(Date.now() - 2 * 86_400_000).toISOString() }]}
          tab="resume"
        />
      )}
      {tool === "demande" && <NewTicketForm person={{ name: "Mathis Custos", email: "mathis@exemple.fr", supportId: "SYX-K7QX-2MPA", plan: "Signature", country: "Guadeloupe" }} />}
      {tool === "ticket" && (
        <TicketChat
          viewer="user"
          messages={[
            { id: "s", from_staff: true, body: "Mathis, de l'Équipe SYXTEE, a pris en charge votre demande.", created_at: iso(3 * 3600_000), name: "Équipe SYXTEE", kind: "system" },
            { id: "1", from_staff: true, body: "Bonjour, ton serveur est prêt. Dis-nous si la connexion tient bien en 4G.", created_at: iso(2 * 3600_000), name: "Équipe SYXTEE", signature: "Mathis - Équipe SYXTEE" },
            { id: "2", from_staff: false, body: "Merci, ça marche !", created_at: iso(3600_000), name: "Toi" },
          ]}
          action={async () => {
            "use server";
            return {};
          }}
        />
      )}
      {tool === "relais" && <RelayList relays={RELAYS} active={6} max={10} coreUrl="" geo={null} />}
      {tool === "sante" && (
        <div className="space-y-4">
          <StreamHealth
            coreUrl=""
            relayId={RELAYS[0].id}
            demo={{
              live: { live: true, since: NOW - 5_400_000, sample: lastSample, peers: [{ connection_id: "a", bitrate: 2450 }, { connection_id: "b", bitrate: 1980 }, { connection_id: "c", bitrate: 1210 }, { connection_id: "d", bitrate: 480 }] },
              history,
            }}
          />
          <Tile>
            <TileLabel>Temps de direct par jour</TileLabel>
            <div className="mt-6">
              <DailyBars days={OVERVIEW.daily} />
            </div>
          </Tile>
          <Tile>
            <TileLabel>Derniers directs</TileLabel>
            <div className="mt-3">
              <SessionList sessions={SESSIONS} />
            </div>
          </Tile>
        </div>
      )}
      {tool === "studio" && <StudioDemo />}
      {tool === "controle-obs" && (
        <RemoteObs coreUrl="http://localhost:9" deviceId="d1" demoToken="demo" />
      )}
      {tool === "backups" && (
        <BackupsList
          coreUrl=""
          demo={{
            devices: DEMO_DEVICES,
            used: 39_000_000,
            quota: 5 * 1024 ** 3,
            rows: [
              { id: "b4", name: "SYXTEE", collection: "SYXTEE", version: 4, size: 1_310_000_000, media_count: 12, obs_version: "32.2.2", host: "OBS-DJ-SYXTEE.local", created_at: iso(3_600_000), format: 2, new_bytes: 12_000 },
              { id: "b3", name: "SYXTEE", collection: "SYXTEE", version: 3, size: 1_310_000_000, media_count: 12, obs_version: "32.2.2", host: "OBS-DJ-SYXTEE.local", created_at: iso(DAY), format: 2, new_bytes: 0 },
              { id: "b2", name: "SYXTEE", collection: "SYXTEE", version: 2, size: 1_290_000_000, media_count: 11, obs_version: "32.2.2", host: "OBS SYXTEE", created_at: iso(3 * DAY), format: 2, new_bytes: 28_000_000 },
              { id: "l1", name: "LAWCY_TV", collection: "LAWCY_TV", version: 1, size: 4200, media_count: 0, obs_version: "32.2.2", host: "OBS-DJ-SYXTEE.local", created_at: iso(9 * DAY), format: 2, new_bytes: 4200 },
            ],
          }}
        />
      )}
      {tool === "controle" && <RemoteList coreUrl="" demo={DEMO_DEVICES} />}
      {tool === "plugin" && <PluginDownload coreUrl="" latest={DEMO_DEVICES.latest} demo={DEMO_DEVICES} />}
      {tool === "membres" && (
        <DashPage>
          <InvitesManager
            coreUrl=""
            initial={[]}
            planName="Extra"
            max={5}
            owner={{ name: "Mathis Custos", email: "mathis@exemple.com", avatar: null, since: iso(90 * 86400_000) }}
            team={{
              name: "LAWCY TV",
              role: "owner",
              meId: "u1",
              members: [
                { user_id: "u1", role: "owner", created_at: iso(90 * 86400_000), name: "Mathis Custos", email: "mathis@exemple.com", avatar: null },
                { user_id: "u2", role: "admin", created_at: iso(40 * 86400_000), name: "Inès Marlot", email: "ines@exemple.com", avatar: null },
                { user_id: "u3", role: "member", created_at: iso(12 * 86400_000), name: "Kairo Duval", email: "kairo@exemple.com", avatar: null },
                { user_id: "u4", role: "member", created_at: iso(3 * 86400_000), name: "Sam Roche", email: "sam@exemple.com", avatar: null },
              ],
              pending: [{ id: "p1", email: "lea@exemple.com", role: "member", created_at: iso(86400_000), expires_at: iso(-6 * 86400_000) }],
            }}
          />
        </DashPage>
      )}
      {tool === "equipe" && (
        <div>
          <AdminShell support={{ all: 2, byCategory: { relais: 1, compte: 1, facturation: 0, bug: 0, suggestion: 0, autre: 0 } }} pendingAccess={1} name="mathxs.170@gmail.com" role="owner" permissions={[]} full>
            <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
              <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">Équipe SYXTEE</h1>
              <TeamUI
                canManage
                invites={[{ id: "i1", email: "lea.martin@exemple.com", role: "developer", daysLeft: 5 }]}
                members={DEMO_TEAM}
              />
            </div>
          </AdminShell>
        </div>
      )}
      {tool === "admin" && (
        <div className="-m-8">
          <AdminShell support={{ all: 3, byCategory: { relais: 2, compte: 1, facturation: 0, bug: 0, suggestion: 0, autre: 0 } }} pendingAccess={2} name="admin@syxtee.fr" role="owner" permissions={[]} full>
            <div className="mx-auto max-w-7xl px-6 pb-20 pt-12">
              <h1 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">Demandes d&apos;accès</h1>
              <ul className="space-y-4">
                {["Inès Marlot", "Kairo Duval"].map((n) => (
                  <li key={n} className="tile p-6">
                    <p className="text-lg font-semibold">{n}</p>
                    <p className="mt-1 text-sm text-muted">demo@exemple.net · il y a 12 min</p>
                  </li>
                ))}
              </ul>
            </div>
          </AdminShell>
        </div>
      )}
      {tool === "fond" && (
        <div className="dash-surface relative -m-8 min-h-[900px] p-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_30%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_30%,transparent_100%)]">
            <CloudBackdrop tone="theme" />
          </div>
          <div className="relative">
            <h1 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">Salut Mathis.</h1>
            <DemoLive state={LIVE_STATE}>
              <Overview initial={OVERVIEW} demo={DEMO_DEVICES} />
            </DemoLive>
          </div>
        </div>
      )}
      {tool === "accueil" && (
        <DemoLive state={LIVE_STATE}>
          <Overview initial={OVERVIEW} demo={DEMO_DEVICES} />
        </DemoLive>
      )}
      {tool === "mur" && (
        <StreamerWall
          streamers={Array.from({ length: 70 }, (_, i) => ({
            handle: ["lunaplay", "nokta_tv", "kairo", "mellow", "zeph", "orbitfr", "tiki", "vexa", "dolmen", "sorbet"][i % 10] + (i >= 10 ? i : ""),
            firstName: i === 1 ? "Inès" : null,
            partner: i === 2,
            channels: [{ platform: (["twitch", "kick", "youtube"] as const)[i % 3], handle: ["lunaplay", "nokta_tv", "kairo", "mellow", "zeph", "orbitfr", "tiki", "vexa", "dolmen", "sorbet"][i % 10] + (i >= 10 ? i : ""), url: "#" }],
            url: "https://twitch.tv",
            avatar: null,
            live: i === 0 ? { viewers: 1284 } : null,
          }))}
        />
      )}
      {!["relais", "sante", "accueil", "studio", "mur", "fond", "admin", "plugin", "controle", "membres", "equipe", "controle-obs", "backups", "compte", "ticket", "demande"].includes(tool) && notFound()}
    </div>
  );
}
