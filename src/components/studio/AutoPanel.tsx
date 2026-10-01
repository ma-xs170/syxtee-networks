"use client";

import { X } from "@phosphor-icons/react";
import type { StudioEngine } from "./engine";
import { MAX_DELAY_MS, hasAudio } from "./model";

// Automatisation du studio : secours (bascule si l'image se fige) et mode podcast (synchro des flux, scène qui suit la voix).

const field = "h-9 w-full rounded-md border border-line bg-background px-2 text-sm";
const check = "flex items-start gap-3 text-sm";

function Meter({ db }: { db: number }) {
  const pct = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent/10" aria-hidden="true">
      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AutoPanel({ e, levels, onClose }: { e: StudioEngine; levels: Record<string, number>; onClose: () => void }) {
  const st = e.settings;
  const { failover: f, podcast: p } = st;
  const scenes = e.project.scenes;
  const relays = e.project.sources.filter((s) => s.kind === "relay");
  const voices = e.project.sources.filter((s) => hasAudio(s.kind));

  const setF = (patch: Partial<typeof f>) => e.setSettings((s) => ({ ...s, failover: { ...s.failover, ...patch } }));
  const setP = (patch: Partial<Omit<typeof p, "speakers">>) => e.setSettings((s) => ({ ...s, podcast: { ...s.podcast, ...patch } }));
  const setSpeaker = (id: string, patch: { scene?: string; delayMs?: number }) =>
    e.setSettings((s) => ({ ...s, podcast: { ...s.podcast, speakers: { ...s.podcast.speakers, [id]: { ...s.podcast.speakers[id], delayMs: s.podcast.speakers[id]?.delayMs ?? 0, ...patch } } } }));

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-[min(420px,100vw)] flex-col border-l border-line-strong bg-surface shadow-[-24px_0_60px_-30px_var(--shadow-pop)]" aria-label="Automatisation">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 className="text-sm font-semibold">Automatisation</h2>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-md p-1.5 text-muted hover:bg-accent/10 hover:text-foreground">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto p-4">
        {/* Secours */}
        <section aria-labelledby="sec-title" className="space-y-3">
          <h3 id="sec-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Secours en cas de bas débit
          </h3>
          <label className={check}>
            <input type="checkbox" checked={f.on} onChange={(ev) => setF({ on: ev.target.checked })} className="mt-1 accent-accent" />
            <span>
              Basculer automatiquement sur la scène de secours si l&apos;image se fige
              <span className="mt-1 block text-xs text-muted">Débit bas mais image fluide : le direct continue, sans changer de scène.</span>
            </span>
          </label>
          {f.on && (
            <div className="space-y-3 pl-7">
              <label className="block text-sm">
                Scène de secours
                <select value={f.scene ?? ""} onChange={(ev) => setF({ scene: ev.target.value || undefined })} className={`${field} mt-1`}>
                  <option value="">Créer « Secours » automatiquement</option>
                  {scenes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Image figée pendant : {f.freezeSec} s
                <input type="range" min={2} max={10} step={1} value={f.freezeSec} onChange={(ev) => setF({ freezeSec: Number(ev.target.value) })} className="mt-1 w-full accent-accent" />
              </label>
              <label className={check}>
                <input type="checkbox" checked={f.autoReturn} onChange={(ev) => setF({ autoReturn: ev.target.checked })} className="mt-1 accent-accent" />
                <span>Revenir à la scène d&apos;origine quand l&apos;image repart</span>
              </label>
            </div>
          )}
          {relays.length > 0 && (
            <ul className="space-y-1.5 text-sm">
              {relays.map((s) => {
                const h = e.health(s.id);
                const low = h.kbps !== undefined && h.kbps < 1000;
                const state = !h.running ? "Inactif" : !h.started ? "Connexion…" : h.frozen ? "Image figée" : low ? "Débit bas, image fluide" : "Fluide";
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                    <span className="truncate">{s.name}</span>
                    <span className={`shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] ${h.frozen ? "text-live" : "text-muted"}`}>
                      {state}
                      {h.kbps !== undefined && h.started ? ` · ${h.kbps} kb/s` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Podcast */}
        <section aria-labelledby="pod-title" className="space-y-3">
          <h3 id="pod-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Mode podcast
          </h3>
          <label className={check}>
            <input type="checkbox" checked={p.on} onChange={(ev) => e.setPodcast(ev.target.checked)} className="mt-1 accent-accent" />
            <span>
              Activer le mode podcast
              <span className="mt-1 block text-xs text-muted">Latence haute assumée : les flux sont mis en mémoire pour rester réguliers, puis alignés entre eux (image et son).</span>
            </span>
          </label>

          {p.on && (
            <>
              <label className={check}>
                <input type="checkbox" checked={p.auto} onChange={(ev) => setP({ auto: ev.target.checked })} className="mt-1 accent-accent" />
                <span>Changer de scène quand quelqu&apos;un prend la parole</span>
              </label>
              <label className="block text-sm">
                Plan large (plusieurs voix en même temps)
                <select value={p.wide ?? ""} onChange={(ev) => setP({ wide: ev.target.value || undefined })} className={`${field} mt-1`}>
                  <option value="">Aucun</option>
                  {scenes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Seuil de voix : {p.thresholdDb} dB
                <input type="range" min={-60} max={-20} step={1} value={p.thresholdDb} onChange={(ev) => setP({ thresholdDb: Number(ev.target.value) })} className="mt-1 w-full accent-accent" />
              </label>
              <label className="block text-sm">
                Pas de changement avant : {p.holdSec.toFixed(1)} s
                <input type="range" min={1} max={8} step={0.5} value={p.holdSec} onChange={(ev) => setP({ holdSec: Number(ev.target.value) })} className="mt-1 w-full accent-accent" />
              </label>

              <h4 className="pt-2 text-sm font-medium">Intervenants</h4>
              {voices.length === 0 ? (
                <p className="text-sm text-muted">Ajoute des flux, webcams ou micros dans les sources.</p>
              ) : (
                <ul className="space-y-3">
                  {voices.map((s) => {
                    const sp = p.speakers[s.id];
                    const delay = sp?.delayMs ?? 0;
                    return (
                      <li key={s.id} className="space-y-2 rounded-xl border border-line p-3">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium">{s.name}</span>
                          <span className="font-mono text-xs tabular-nums text-muted">{delay} ms</span>
                        </div>
                        <Meter db={levels[s.id] ?? -100} />
                        <label className="block text-xs text-muted">
                          Scène quand cette personne parle
                          <select value={sp?.scene ?? ""} onChange={(ev) => setSpeaker(s.id, { scene: ev.target.value || undefined })} className={`${field} mt-1 text-foreground`}>
                            <option value="">Ne pilote aucune scène</option>
                            {scenes.map((sc) => (
                              <option key={sc.id} value={sc.id}>
                                {sc.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-xs text-muted">
                          Retard de synchro (image et son)
                          <input type="range" min={0} max={MAX_DELAY_MS} step={50} value={delay} onChange={(ev) => setSpeaker(s.id, { delayMs: Number(ev.target.value) })} className="mt-1 w-full accent-accent" />
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              <button
                type="button"
                disabled={e.calibrating || voices.length < 2}
                onClick={() => e.calibrate()}
                className="btn btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {e.calibrating ? "Écoute en cours… fais un clap" : "Calibrer au clap (8 s)"}
              </button>
              <p className="text-xs leading-relaxed text-muted">
                Calibration : tape dans tes mains près de tous les micros pendant l&apos;écoute. Chaque flux est retardé pour tomber au même instant que le plus lent. Tu peux aussi régler les retards à la main. L&apos;image retardée est gardée en 640 x 360.
              </p>
            </>
          )}
        </section>

        {/* Journal */}
        <section aria-labelledby="log-title" className="space-y-2">
          <h3 id="log-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Journal
          </h3>
          {e.log.length === 0 ? (
            <p className="text-sm text-muted">Rien pour le moment.</p>
          ) : (
            <ul className="space-y-1 font-mono text-xs leading-relaxed text-muted">
              {e.log.map((l, i) => (
                <li key={`${l}-${i}`}>{l}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
