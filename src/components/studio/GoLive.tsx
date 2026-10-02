"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { coreFetch } from "../dashboard/coreClient";
import type { StudioEngine } from "./engine";

// Diffusion depuis SYXTEE STUDIO : le navigateur envoie le programme au Core (WebRTC), le Core l'encode une fois et le retransmet
// en RTMP vers les plateformes choisies. Les clés de stream restent dans CE navigateur (localStorage) et ne sont envoyées au Core
// qu'au démarrage, en HTTPS, pour la durée du direct : le serveur ne les enregistre jamais.

type Preset = "twitch" | "youtube" | "kick" | "custom";
type Dest = { id: string; preset: Preset; on: boolean; server: string; key: string };

const PRESETS: Record<Preset, { name: string; server: string; hint: string }> = {
  twitch: { name: "Twitch", server: "rtmp://live.twitch.tv/app", hint: "Clé : Tableau de bord du créateur, Paramètres, Flux." },
  youtube: { name: "YouTube", server: "rtmp://a.rtmp.youtube.com/live2", hint: "Clé : YouTube Studio, Passer en direct, Clé de stream." },
  kick: { name: "Kick", server: "rtmps://fa723fc1b171.global-contribute.live-video.net:443/app", hint: "Adresse et clé : Tableau de bord Kick, Stream. Corrige l'adresse si la tienne est différente." },
  custom: { name: "Autre (TikTok, Facebook…)", server: "", hint: "Colle l'adresse RTMP donnée par la plateforme. Si elle contient déjà la clé, laisse la clé vide." },
};

const KEY = "syxtee.studio.dest.v1";
const BITRATES = [3000, 4500, 6000];

const ERRORS: Record<string, string> = {
  not_allowed: "SYXTEE STUDIO en direct est réservé aux comptes avec un relais (formule payante).",
  destinations: "Active au moins une destination (5 au plus).",
  protocol: "L'adresse doit commencer par rtmp:// ou rtmps://.",
  url_invalid: "Une adresse n'est pas valide.",
  host_private: "Cette adresse est refusée (réseau privé).",
  host_unresolved: "Cette adresse est introuvable.",
  invalid: "Données invalides.",
};

const fullUrl = (d: Dest) => (d.key.trim() ? `${d.server.trim().replace(/\/+$/, "")}/${d.key.trim()}` : d.server.trim());

function load(): Dest[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Dest[] | null;
    if (raw?.length) return raw;
  } catch {}
  return [{ id: crypto.randomUUID(), preset: "twitch", on: true, server: PRESETS.twitch.server, key: "" }];
}

export default function GoLive({ e, coreUrl, onClose }: { e: StudioEngine; coreUrl: string; onClose: () => void }) {
  const [dests, setDests] = useState<Dest[]>([]);
  const [kbps, setKbps] = useState(4500);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [core, setCore] = useState<{ state: string; destinations: string[] } | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    setDests(load());
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(dests));
    } catch {}
  }, [dests]);

  // Statut côté serveur pendant le direct (le Core confirme qu'il envoie bien aux plateformes).
  useEffect(() => {
    if (e.live !== "live" && e.live !== "connecting") return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await coreFetch(coreUrl, "/v1/me/studio/status");
        if (r.ok && !stop) setCore((await r.json()) as { state: string; destinations: string[] });
      } catch {}
    };
    void tick();
    const t = setInterval(tick, 3000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [e.live, coreUrl]);

  const set = (id: string, patch: Partial<Dest>) => setDests((l) => l.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const active = dests.filter((d) => d.on && fullUrl(d));
  const running = e.live === "live" || e.live === "connecting";

  const start = async () => {
    setError(null);
    if (active.length === 0) return setError(ERRORS.destinations);
    setBusy(true);
    try {
      const res = await coreFetch(coreUrl, "/v1/me/studio/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinations: active.map((d) => ({ name: PRESETS[d.preset].name, url: fullUrl(d) })), bitrate_kbps: kbps }),
      });
      if (!res.ok) {
        const code = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "";
        setError(res.status === 404 ? "Le serveur n'a pas encore SYXTEE STUDIO en direct. Mets à jour le Core." : (ERRORS[code] ?? `Erreur ${res.status}.`));
        return;
      }
      const { whip_url } = (await res.json()) as { whip_url: string };
      await e.goLive(whip_url, kbps);
    } catch {
      setError("Le serveur ne répond pas.");
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    e.stopLive();
    setCore(null);
    await coreFetch(coreUrl, "/v1/me/studio/session", { method: "DELETE" }).catch(() => {});
  };

  const field = "h-9 w-full rounded-md border border-line bg-background px-2 text-sm";

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-[min(440px,100vw)] flex-col border-l border-line-strong bg-surface shadow-[-24px_0_60px_-30px_var(--shadow-pop)]" aria-label="Diffuser">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 className="text-sm font-semibold">Diffuser</h2>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-md p-1.5 text-muted hover:bg-accent/10 hover:text-foreground">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {running && (
          <div role="status" className="rounded-xl border border-live/40 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <span className="live-dot" aria-hidden="true" />
              {e.live === "connecting" ? "Connexion au serveur…" : core?.state === "live" ? "En direct" : "Connecté, le serveur prépare l'envoi…"}
            </p>
            {core?.state === "live" && core.destinations.length > 0 && <p className="mt-1 text-muted">Vers : {core.destinations.join(", ")}</p>}
            <p className="mt-2 text-xs text-muted">Garde cet onglet ouvert. Ton programme actuel est celui qui part.</p>
          </div>
        )}
        {e.live === "error" && (
          <p role="alert" className="rounded-xl border border-live/40 p-4 text-sm text-live">
            {e.liveError}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-live/40 p-4 text-sm text-live">
            {error}
          </p>
        )}

        <section aria-label="Destinations" className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Destinations</h3>
          {dests.map((d) => (
            <div key={d.id} className="space-y-2 rounded-xl border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={d.on} disabled={running} onChange={(ev) => set(d.id, { on: ev.target.checked })} className="accent-accent" />
                  {PRESETS[d.preset].name}
                </label>
                <button type="button" disabled={running} onClick={() => setDests((l) => l.filter((x) => x.id !== d.id))} className="text-xs text-muted hover:text-foreground disabled:opacity-40">
                  Retirer
                </button>
              </div>
              <label className="block text-xs text-muted">
                Adresse
                <input value={d.server} disabled={running} onChange={(ev) => set(d.id, { server: ev.target.value })} spellCheck={false} className={`${field} mt-1 font-mono text-foreground`} />
              </label>
              <label className="block text-xs text-muted">
                Clé de stream
                <input type="password" value={d.key} disabled={running} onChange={(ev) => set(d.id, { key: ev.target.value })} autoComplete="off" spellCheck={false} className={`${field} mt-1 font-mono text-foreground`} />
              </label>
              <p className="text-xs leading-relaxed text-muted">{PRESETS[d.preset].hint}</p>
            </div>
          ))}
          {dests.length < 5 && !running && (
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PRESETS) as Preset[]).map((p) => (
                <button key={p} type="button" onClick={() => setDests((l) => [...l, { id: crypto.randomUUID(), preset: p, on: true, server: PRESETS[p].server, key: "" }])} className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:text-foreground">
                  + {PRESETS[p].name}
                </button>
              ))}
            </div>
          )}
        </section>

        <section aria-label="Qualité" className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Qualité (720p, 30 images par seconde)</h3>
          <div role="radiogroup" aria-label="Débit" className="flex gap-2">
            {BITRATES.map((b) => (
              <button key={b} type="button" role="radio" aria-checked={kbps === b} disabled={running} onClick={() => setKbps(b)} className={`h-9 flex-1 rounded-full border text-sm transition-colors disabled:opacity-60 ${kbps === b ? "border-accent bg-accent text-on-accent" : "border-line text-muted hover:text-foreground"}`}>
                {b / 1000} Mb/s
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">4,5 Mb/s convient à Twitch, Kick et YouTube. Ta connexion doit pouvoir envoyer ce débit en continu.</p>
        </section>

        <p className="text-xs leading-relaxed text-muted">Tes clés de stream restent dans ce navigateur. Elles sont envoyées au serveur quand tu démarres, en HTTPS, et ne sont jamais enregistrées.</p>
      </div>

      <div className="shrink-0 border-t border-line p-4">
        {running ? (
          <button type="button" onClick={stop} className="btn w-full bg-live text-white">
            Arrêter le direct
          </button>
        ) : (
          <button type="button" onClick={start} disabled={busy} className="btn btn-primary w-full disabled:opacity-60">
            {busy ? "Démarrage…" : "Démarrer le direct"}
          </button>
        )}
      </div>
    </aside>
  );
}
