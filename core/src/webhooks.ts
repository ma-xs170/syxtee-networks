import { createHmac } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionEvent } from "./sessions.ts";

// Webhooks du compte : à chaque début et fin de direct, un POST JSON signé part vers les adresses déclarées dans le dashboard
// (Compte, Développeurs). Signature : en-tête X-Syxtee-Signature = "t=<secondes>,v1=<HMAC-SHA256 hex de "<t>.<corps>" avec le secret du webhook>".
// Garde-fous : https seulement, adresses internes refusées (résolution DNS vérifiée à chaque envoi), pas de redirection, 5 s max, 1 essai de plus après 2 s.

const TIMEOUT_MS = 5000;

/** Adresse IPv4/IPv6 interne (boucle locale, réseau privé, lien local, métadonnées cloud) : jamais jointe. */
export function isInternalIp(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(v) === 4) {
    const [a, b] = v.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (v.startsWith("::ffff:")) return isInternalIp(v.slice(7));
  return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
}

export function sign(secret: string, body: string, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
}

type Hook = { id: string; url: string; secret: string; events: string[] };

export function createWebhooks(opts: { db: SupabaseClient; log?: (m: string) => void; fetchImpl?: typeof fetch; resolve?: (host: string) => Promise<string[]> }) {
  const log = opts.log ?? (() => {});
  const doFetch = opts.fetchImpl ?? fetch;
  const resolve = opts.resolve ?? (async (h: string) => (await lookup(h, { all: true })).map((a) => a.address));

  async function safe(url: string): Promise<boolean> {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return false;
    }
    if (u.protocol !== "https:" || u.username || u.password) return false;
    const host = u.hostname.replace(/^\[|\]$/g, "");
    const addrs = isIP(host) ? [host] : await resolve(host).catch(() => []);
    return addrs.length > 0 && !addrs.some(isInternalIp);
  }

  async function post(h: Hook, type: string, data: Record<string, unknown>) {
    if (!(await safe(h.url))) return 0;
    const body = JSON.stringify({ type, created_at: new Date().toISOString(), data });
    let status = 0;
    for (let attempt = 0; attempt < 2 && !(status >= 200 && status < 300); attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await doFetch(h.url, {
          method: "POST",
          redirect: "manual",
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { "content-type": "application/json", "user-agent": "SYXTEE-Webhooks/1", "x-syxtee-event": type, "x-syxtee-signature": sign(h.secret, body) },
          body,
        });
        status = res.status;
      } catch {
        status = 0;
      }
    }
    return status;
  }

  return {
    /** Envoie l'évènement à tous les webhooks actifs du compte qui l'écoutent. Ne lève jamais d'erreur. */
    async emit(e: SessionEvent) {
      try {
        const { data, error } = await opts.db.from("webhooks").select("id, url, secret, events").eq("user_id", e.userId).eq("active", true);
        if (error) throw new Error(error.message);
        const payload = { session_id: e.sessionId, relay_id: e.relayId, started_at: e.startedAt, ...(e.type === "live.ended" ? { ended_at: e.endedAt, duration_s: e.durationS, avg_kbps: e.avgKbps, peak_kbps: e.peakKbps, reconnects: e.reconnects } : {}) };
        for (const h of ((data ?? []) as Hook[]).filter((x) => x.events.includes(e.type))) {
          const status = await post(h, e.type, payload);
          await opts.db.from("webhooks").update({ last_at: new Date().toISOString(), last_status: status }).eq("id", h.id);
        }
      } catch (err) {
        log(`webhooks ${e.type} : ${(err as Error).message}`);
      }
    },
  };
}
