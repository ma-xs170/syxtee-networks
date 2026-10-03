import { notFound } from "next/navigation";
import Overview from "@/components/dashboard/Overview";
import DemoLive from "../DemoLive";
import StreamHealth, { type Sample } from "@/components/dashboard/StreamHealth";
import { DailyBars } from "@/components/dashboard/charts";
import { SessionList } from "@/components/dashboard/sessions";
import { Tile, TileLabel } from "@/components/dashboard/ui";
import StreamerWall from "@/components/home/StreamerWall";
import CloudBackdrop from "@/components/home/CloudBackdrop";
import AdminShell from "@/app/(admin)/admin/AdminShell";
import StudioDemo from "@/components/studio/StudioDemo";
import MixApp from "@/components/mix/MixApp";
import { LiveStatusProvider } from "@/components/dashboard/LiveStatus";
import RelayList from "@/components/relais/RelayList";
import type { Overview as OverviewData, LiveSession } from "@/lib/dashboard-data";
import type { RelayRow } from "@/lib/relay-groups";

// Pages de démo pour les captures d'écran du site (scripts/capture-outils.mjs). Les vrais composants du dashboard,
// avec des données d'exemple : aucun compte, aucune clé réelle. Désactivées en production.

const NOW = Date.UTC(2026, 9, 2, 20, 0, 0);
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

export default async function VitrinePage({ params }: { params: Promise<{ tool: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { tool } = await params;
  return (
    <div id="capture" data-theme="dark" className={`mx-auto bg-background p-8 text-foreground ${tool === "accueil" ? "w-[1500px]" : tool.startsWith("commutateur") ? "w-full !p-0" : "w-[1100px]"}`}>
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
      {(tool === "commutateur" || tool === "commutateur-reel") && (
        <LiveStatusProvider coreUrl="">
          <MixApp account="demo@syxtee.fr" real={tool === "commutateur-reel" ? [{ id: "a1", name: "iPhone 16", protocol: "srtla", live: true }, { id: "a2", name: "Osmo", protocol: "rtmp", live: true }, { id: "a3", name: "BELABOX", protocol: "srtla", live: true }, { id: "a4", name: "GoPro", protocol: "rtmp", live: false }] : []} coreUrl={tool === "commutateur-reel" ? "http://localhost:9" : ""} />
        </LiveStatusProvider>
      )}
      {tool === "admin" && (
        <div className="-m-8">
          <AdminShell openTickets={3} pendingAccess={2} name="admin@syxtee.fr">
            <div className="mx-auto max-w-7xl px-6 pb-20 pt-12">
              <h1 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">Demandes d&apos;accès</h1>
              <ul className="space-y-4">
                {["Inès Marlot", "Kairo Duval"].map((n) => (
                  <li key={n} className="rounded-2xl border border-line bg-surface p-6">
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
              <Overview initial={OVERVIEW} />
            </DemoLive>
          </div>
        </div>
      )}
      {tool === "accueil" && (
        <DemoLive state={LIVE_STATE}>
          <Overview initial={OVERVIEW} />
        </DemoLive>
      )}
      {tool === "mur" && (
        <StreamerWall
          streamers={Array.from({ length: 70 }, (_, i) => ({
            handle: ["lunaplay", "nokta_tv", "kairo", "mellow", "zeph", "orbitfr", "tiki", "vexa", "dolmen", "sorbet"][i % 10] + (i >= 10 ? i : ""),
            firstName: i === 1 ? "Inès" : null,
            partner: i === 2,
            url: "https://twitch.tv",
            avatar: null,
            live: i === 0 ? { viewers: 1284 } : null,
          }))}
        />
      )}
      {!["relais", "sante", "accueil", "studio", "mur", "fond", "admin", "commutateur", "commutateur-reel"].includes(tool) && notFound()}
    </div>
  );
}
