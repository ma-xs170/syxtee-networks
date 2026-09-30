// Moteur de scan réseau, partagé par le Scanner réseau (/dashboard/scanner) et l'Analyseur réseau (dashboard et /analyseur).
// Un point = 3 micro-tests : 5 pings, envoi pendant 2 s (mesuré par le Core), réception pendant 2 s (mesurée ici),
// puis POST /v1/cam/scan avec les médianes. Le Core déduit l'opérateur (ASN) et le type de lien (Wi-Fi ou 4G/5G).
// Authentification : clé caméra (Cam), jeton de session Supabase (dashboard) ou aucune (analyseur public, rien gardé).

export type LinkType = "cellular" | "wifi" | "starlink" | "fixed" | "unknown";
/** Opérateur mobile déclaré (profil du compte, ou localement pour l'analyseur sans compte). */
export type Declared = "orange" | "sfr" | "digicel" | "free" | "other";
export const DECLARED_LABELS: Record<Declared, string> = { orange: "Orange", sfr: "SFR", digicel: "Digicel", free: "Free", other: "Autre" };
export type ScanResult = {
  accepted: boolean;
  counted: boolean;
  reason: string | null;
  operator: string | null;
  link_type: LinkType;
  link_conf?: number;
  /** 'private_relay', 'declared', 'declared_mismatch', 'pending'… */
  tags?: string[];
  private_relay?: boolean;
  up_kbps: number | null;
  down_kbps: number | null;
  rtt_ms: number | null;
};
export type NetInfo = {
  consent: boolean | null;
  operator: string | null;
  link_type: LinkType;
  link_conf?: number;
  tags?: string[];
  private_relay?: boolean;
  declared?: Declared | null;
  net: string;
};
/** Point mesuré : réponse du Core + ce que seul le navigateur voit (gigue, pings perdus). */
export type Point = ScanResult & { jitter_ms: number | null; loss_pct: number | null };

export type ScanClient = {
  coreUrl: string;
  /** En-têtes d'authentification (vide pour l'analyseur public). */
  auth: () => Promise<Record<string, string>>;
};

export const REASONS: Record<string, string> = {
  no_consent: "Partage désactivé : rien n'est gardé.",
  accuracy: "Précision GPS insuffisante (plus de 20 m) : point sauté.",
  private_zone: "Zone privée : rien n'est gardé ici.",
  speed: "Déplacement incohérent, point ignoré.",
  wifi: "Tu es en Wi-Fi : mesure non comptée.",
  starlink: "Starlink : compté dans la couche Starlink, pas dans la carte 4G/5G.",
  unknown_link: "Réseau non identifié : mesure non comptée sur la carte 4G/5G.",
  private_relay: "Relais privé iCloud actif : opérateur masqué, mesure non comptée.",
  pending: "Opérateur en cours d'identification : la mesure sera reclassée sous peu.",
  anonymous: "Test sans compte : résultat affiché, rien n'est gardé.",
};

export const MICRO_TESTS = 3;
const WINDOW_MS = 2000;
const PINGS = 5;

export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
};
/** Gigue : écart moyen entre deux pings successifs (même définition que RTP, sans lissage). */
export const jitter = (rtts: number[]) =>
  rtts.length < 2 ? null : rtts.slice(1).reduce((a, r, i) => a + Math.abs(r - rtts[i]), 0) / (rtts.length - 1);

export const connType = () => (typeof navigator === "undefined" ? null : ((navigator as Navigator & { connection?: { type?: string } }).connection?.type ?? null));
export const isWifi = (t: LinkType | null | undefined) => t === "wifi" || t === "fixed";

/** Réseau vu par le Core (opérateur, type de lien, jeton réseau pour l'iPhone) et consentement du compte. */
export async function readNet(c: ScanClient, params: Record<string, string> = {}) {
  const r = await fetch(`${c.coreUrl}/v1/cam/coverage?${new URLSearchParams(params)}`, { headers: await c.auth(), cache: "no-store" });
  if (!r.ok) throw Object.assign(new Error(String(r.status)), { status: r.status });
  return (await r.json()) as NetInfo;
}

/** Attend jusqu'à `waitMs` un point GPS récent et précis (≤ `maxAcc` m). */
export async function precisePosition(get: () => GeolocationPosition | null, stopped: () => boolean, maxAcc = 20, waitMs = 10_000) {
  const until = Date.now() + waitMs;
  while (!stopped() && Date.now() < until) {
    const p = get();
    if (p && p.coords.accuracy <= maxAcc && Date.now() - p.timestamp < 5000) return p;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

async function ping(c: ScanClient, onSample?: MeasureOptions["onSample"]) {
  const rtts: number[] = [];
  let lost = 0;
  for (let i = 0; i < PINGS; i++) {
    const t0 = performance.now();
    const r = await fetch(`${c.coreUrl}/v1/cam/ping`, { cache: "no-store" }).catch(() => null);
    if (r?.ok) {
      const rtt = performance.now() - t0;
      rtts.push(rtt);
      onSample?.("ping", rtt);
    } else lost++;
  }
  return { rtts, lost };
}

/** Envoi pendant 2 s : morceaux enchaînés, taille ajustée au débit (le Core mesure chaque morceau). */
async function upload(c: ScanClient, test: string, i: number, cap: number, stopped: () => boolean, onSample?: MeasureOptions["onSample"]) {
  const t0 = performance.now();
  let sent = 0;
  let size = 128 * 1024;
  const headers = { ...(await c.auth()), "Content-Type": "application/octet-stream" };
  while (!stopped() && performance.now() - t0 < WINDOW_MS && sent < cap) {
    const body = new Uint8Array(Math.min(size, cap - sent + 16 * 1024));
    const r = await fetch(`${c.coreUrl}/v1/cam/scan/up?test=${test}&i=${i}`, { method: "POST", headers, body });
    sent += body.length + 500;
    if (!r.ok) throw Object.assign(new Error(String(r.status)), { status: r.status });
    const { kbps } = (await r.json()) as { kbps: number | null };
    if (kbps) onSample?.("up", kbps);
    if (kbps) size = Math.min(2 * 1024 * 1024, Math.max(64 * 1024, Math.round((kbps * 1000 * 0.5) / 8)));
  }
  return sent;
}

/** Réception pendant 2 s : débit calculé ici, du premier au dernier octet. */
async function download(c: ScanClient, cap: number, onSample?: MeasureOptions["onSample"]) {
  const r = await fetch(`${c.coreUrl}/v1/cam/scan/down?ms=${WINDOW_MS}&max=${cap}`, { headers: await c.auth(), cache: "no-store" });
  if (!r.ok || !r.body) throw Object.assign(new Error(String(r.status)), { status: r.status });
  const reader = r.body.getReader();
  let bytes = 0;
  let t0 = 0;
  let shown = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const now = performance.now();
    if (!t0) t0 = now;
    else bytes += value.length; // le premier morceau démarre le chrono
    // Jauge en direct : au plus 5 valeurs par seconde.
    if (onSample && t0 && now - t0 > 150 && now - shown > 200) {
      shown = now;
      onSample("down", (bytes * 8) / (now - t0));
    }
  }
  const ms = performance.now() - t0;
  return { bytes, kbps: t0 && ms > 50 && bytes > 0 ? (bytes * 8) / ms : null };
}

export type MeasureOptions = {
  /** Position précise, ou null (analyseur public sans GPS : rien n'est gardé de toute façon). */
  position: GeolocationPosition | null;
  /** iPhone : jetons réseau lus à l'ouverture et après « Coupe le Wi-Fi ». */
  from?: string | null;
  cell?: string | null;
  /** Économie de data : tests plus courts. */
  eco?: boolean;
  /** Analyseur sans compte : opérateur déclaré sur cet appareil (un compte utilise son profil). */
  declared?: Declared | null;
  /** Valeurs en direct, pour les jauges : débit descendant / montant (kbit/s), ping (ms). */
  onSample?: (kind: "down" | "up" | "ping", value: number) => void;
  stopped: () => boolean;
  onPhase?: (phase: string) => void;
  /** Octets consommés (envoi + réception + pings), au fil des micro-tests. */
  onBytes?: (bytes: number) => void;
};

/** Mesure un point complet. null si arrêté en cours de route. */
export async function measurePoint(c: ScanClient, o: MeasureOptions): Promise<Point | null> {
  const capUp = o.eco ? 1_000_000 : 3_000_000;
  const capDown = o.eco ? 2_000_000 : 6_000_000;
  const test = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const downs: number[] = [];
  const rtts: number[] = [];
  const allRtts: number[] = [];
  let lost = 0;
  for (let i = 0; i < MICRO_TESTS && !o.stopped(); i++) {
    o.onPhase?.(`Micro-test ${i + 1}/${MICRO_TESTS}`);
    const p = await ping(c, o.onSample);
    allRtts.push(...p.rtts);
    lost += p.lost;
    const m = median(p.rtts);
    if (m !== null) rtts.push(m);
    const sent = await upload(c, test, i, capUp, o.stopped, o.onSample);
    const d = await download(c, capDown, o.onSample);
    o.onBytes?.(sent + d.bytes + PINGS * 400);
    if (d.kbps) downs.push(d.kbps);
  }
  if (o.stopped()) return null;
  const t = connType();
  const p = o.position;
  const res = await fetch(`${c.coreUrl}/v1/cam/scan`, {
    method: "POST",
    headers: { ...(await c.auth()), "Content-Type": "application/json" },
    body: JSON.stringify({
      test,
      lat: p?.coords.latitude ?? null,
      lng: p?.coords.longitude ?? null,
      acc: p ? Math.round(p.coords.accuracy) : null,
      speed: p?.coords.speed ?? null,
      t: p ? Math.round(p.timestamp) : undefined,
      ct: t,
      from: t ? null : (o.from ?? null),
      cell: t ? null : (o.cell ?? null),
      down_kbps: downs.map(Math.round),
      rtt_ms: rtts.map(Math.round),
      op: o.declared ?? null,
    }),
  });
  if (!res.ok) throw Object.assign(new Error(String(res.status)), { status: res.status });
  const j = (await res.json()) as ScanResult;
  const total = allRtts.length + lost;
  const jit = jitter(allRtts);
  return { ...j, jitter_ms: jit === null ? null : Math.round(jit), loss_pct: total ? Math.round((lost / total) * 1000) / 10 : null };
}
