"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { coreFetch, coreToken } from "../dashboard/coreClient";

// Télécommande d'OBS : SYXTEE Link tourne sur le PC d'OBS, se connecte au Core (sortant) et relaie les ordres de ce navigateur.
// OBS diffuse lui-même depuis le PC : la vidéo ne passe jamais par le serveur, seuls des messages de contrôle circulent.

type Agent = { online: boolean; name?: string; platform?: string; version?: string };
type Link = "connecting" | "on" | "off";
type Backup = { enabled: boolean; source: string; scene: string; freezeSeconds: number; recoverSeconds: number; state?: string };
type Mixer = { name: string; muted: boolean; db: number };
type Device = { id: string; name: string; platform: string; last_seen: string | null; online: boolean };
type Ev = (name: string, data: Record<string, unknown>) => void;

const ERR: Record<string, string> = {
  agent_offline: "SYXTEE Link n'est pas connecté sur ton PC.",
  timeout: "OBS met trop de temps à répondre.",
  rate_limited: "Trop de commandes d'un coup.",
  method_not_allowed: "Commande refusée.",
};
const errText = (m: string) => ERR[m] ?? m;
const OS: Record<string, string> = { darwin: "macOS", win32: "Windows", linux: "Linux" };

/** Connexion WebSocket au Core, avec reprise automatique. `call` envoie un ordre et attend la réponse. */
function useRemote(coreUrl: string, onEvent: Ev) {
  const [link, setLink] = useState<Link>("connecting");
  const [agent, setAgent] = useState<Agent>({ online: false });
  const ws = useRef<WebSocket | null>(null);
  const waiting = useRef(new Map<string, { ok: (v: any) => void; ko: (e: Error) => void }>()); // eslint-disable-line @typescript-eslint/no-explicit-any
  const seq = useRef(0);
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let closed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function open() {
      if (closed) return;
      setLink("connecting");
      let access: string;
      try {
        access = await coreToken();
      } catch {
        setLink("off");
        return;
      }
      const s = new WebSocket(`${coreUrl.replace(/^http/, "ws")}/v1/link/remote`);
      ws.current = s;
      s.onopen = () => s.send(JSON.stringify({ type: "hello", access }));
      s.onmessage = (ev) => {
        const m = JSON.parse(String(ev.data));
        if (m.type === "ready") {
          setLink("on");
          setAgent(m.agent ?? { online: false });
        } else if (m.type === "agent") setAgent({ online: !!m.online, name: m.name, platform: m.platform, version: m.version });
        else if (m.type === "event") handler.current(m.name, m.data ?? {});
        else if (m.type === "res") {
          const w = waiting.current.get(m.id);
          if (!w) return;
          waiting.current.delete(m.id);
          if (m.ok) w.ok(m.result);
          else w.ko(new Error(errText(String(m.error ?? "erreur"))));
        }
      };
      s.onclose = (e) => {
        setLink("off");
        setAgent({ online: false });
        for (const w of waiting.current.values()) w.ko(new Error("Connexion perdue."));
        waiting.current.clear();
        // 4003 : compte sans accès. Les autres cas (réseau, session expirée) : on réessaie.
        if (!closed && e.code !== 4003) timer = setTimeout(open, 3000);
      };
    }
    void open();
    return () => {
      closed = true;
      clearTimeout(timer);
      ws.current?.close();
    };
  }, [coreUrl]);

  const call = useCallback(<T,>(method: string, params?: Record<string, unknown>) => {
    return new Promise<T>((ok, ko) => {
      const s = ws.current;
      if (!s || s.readyState !== WebSocket.OPEN) return ko(new Error("Pas connecté au serveur."));
      const id = `q${++seq.current}`;
      waiting.current.set(id, { ok, ko });
      s.send(JSON.stringify({ type: "req", id, method, params }));
    });
  }, []);

  return { link, agent, call };
}

const btn = "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors disabled:opacity-40";

export default function Remote({ coreUrl }: { coreUrl: string }) {
  const [scenes, setScenes] = useState<string[]>([]);
  const [program, setProgram] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mixer, setMixer] = useState<Mixer[]>([]);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [inputs, setInputs] = useState<string[]>([]);
  const [backup, setBackup] = useState<Backup | null>(null);
  const [obsDown, setObsDown] = useState(false);
  const [error, setError] = useState("");
  const [sync, setSync] = useState(0);
  const [confirm, setConfirm] = useState<"stream" | "record" | null>(null);

  const onEvent = useCallback<Ev>((name, d) => {
    if (name === "CurrentProgramSceneChanged") setProgram(String(d.sceneName));
    else if (name === "StreamStateChanged") setStreaming(!!d.outputActive);
    else if (name === "RecordStateChanged") setRecording(!!d.outputActive);
    else if (name === "InputMuteStateChanged") setMixer((m) => m.map((i) => (i.name === d.inputName ? { ...i, muted: !!d.inputMuted } : i)));
    else if (name === "InputVolumeChanged") setMixer((m) => m.map((i) => (i.name === d.inputName ? { ...i, db: Number(d.inputVolumeDb) } : i)));
    else if (name === "link.levels") setLevels(d as Record<string, number>);
    else if (name === "link.backupState") setBackup((b) => (b ? { ...b, state: String(d.state) } : b));
    else if (name === "link.obsClosed") setObsDown(true);
    else if (name === "link.obsOpened" || name === "SceneListChanged") setSync((n) => n + 1);
  }, []);
  const { link, agent, call } = useRemote(coreUrl, onEvent);

  const run = useCallback(
    async (method: string, params?: Record<string, unknown>) => {
      setError("");
      try {
        return await call<any>(method, params); // eslint-disable-line @typescript-eslint/no-explicit-any
      } catch (e) {
        setError((e as Error).message);
        return null;
      }
    },
    [call],
  );

  const refresh = useCallback(async () => {
    const sl = await run("GetSceneList");
    if (!sl) return;
    setObsDown(false);
    setScenes([...(sl.scenes as { sceneName: string }[])].reverse().map((s) => s.sceneName));
    setProgram(String(sl.currentProgramSceneName));
    const [st, rc, il, bk] = await Promise.all([run("GetStreamStatus"), run("GetRecordStatus"), run("GetInputList"), run("link.getBackup")]);
    setStreaming(!!st?.outputActive);
    setRecording(!!rc?.outputActive);
    const names = ((il?.inputs ?? []) as { inputName: string }[]).map((i) => i.inputName);
    setInputs(names);
    setBackup(bk);
    // Les entrées sans audio répondent par une erreur : on les écarte.
    const rows = await Promise.all(
      names.map(async (name) => {
        try {
          const [m, v] = await Promise.all([call<any>("GetInputMute", { inputName: name }), call<any>("GetInputVolume", { inputName: name })]); // eslint-disable-line @typescript-eslint/no-explicit-any
          return { name, muted: !!m.inputMuted, db: Number(v.inputVolumeDb) } as Mixer;
        } catch {
          return null;
        }
      }),
    );
    setMixer(rows.filter((r): r is Mixer => r !== null));
  }, [run, call]);

  useEffect(() => {
    if (link !== "on" || !agent.online) return;
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [link, agent.online, refresh, sync]);

  const ready = link === "on" && agent.online && !obsDown;

  function toggle(kind: "stream" | "record") {
    const active = kind === "stream" ? streaming : recording;
    if (active && confirm !== kind) {
      setConfirm(kind);
      setTimeout(() => setConfirm((c) => (c === kind ? null : c)), 3000);
      return;
    }
    setConfirm(null);
    void run(kind === "stream" ? (active ? "StopStream" : "StartStream") : active ? "StopRecord" : "StartRecord");
  }

  function saveBackup(patch: Partial<Backup>) {
    if (!backup) return;
    const next = { ...backup, ...patch };
    setBackup(next);
    void run("link.setBackup", next).then((r) => r && setBackup(r));
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto grid max-w-[1200px] gap-4">
        <Status link={link} agent={agent} obsDown={obsDown} />
        {error && (
          <p role="alert" className="rounded-xl border border-line px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {!agent.online && link !== "connecting" && <Pairing coreUrl={coreUrl} />}

        {ready && (
          <>
            <section aria-label="Diffusion" className="grid gap-3 rounded-2xl border border-line p-4 sm:grid-cols-2">
              <button type="button" onClick={() => toggle("stream")} className={`${btn} ${streaming ? "bg-live text-white" : "bg-accent text-on-accent hover:bg-accent-hover"}`}>
                {streaming ? (confirm === "stream" ? "Confirmer l'arrêt du live" : "En direct · arrêter") : "Lancer le live"}
              </button>
              <button type="button" onClick={() => toggle("record")} className={`${btn} border border-line-strong ${recording ? "border-live text-live" : "hover:bg-accent/10"}`}>
                {recording ? (confirm === "record" ? "Confirmer l'arrêt" : "Enregistrement · arrêter") : "Enregistrer"}
              </button>
            </section>

            <section aria-label="Scènes" className="rounded-2xl border border-line p-4">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Scènes</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {scenes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={s === program}
                    onClick={() => run("SetCurrentProgramScene", { sceneName: s })}
                    className={`min-h-14 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors ${s === program ? "border-foreground bg-accent text-on-accent" : "border-line hover:border-line-strong hover:bg-accent/10"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>

            <section aria-label="Audio" className="rounded-2xl border border-line p-4">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Audio</h2>
              {mixer.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Aucune source audio dans OBS.</p>
              ) : (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {mixer.map((i) => (
                    <li key={i.name} className="rounded-xl border border-line p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium">{i.name}</span>
                        <button type="button" aria-pressed={i.muted} onClick={() => run("SetInputMute", { inputName: i.name, inputMuted: !i.muted })} className="rounded-full border border-line px-3 py-1 text-xs hover:bg-accent/10">
                          {i.muted ? "Muet" : "Actif"}
                        </button>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent/10" aria-hidden="true">
                        <div className="h-full rounded-full bg-foreground transition-[width] duration-150" style={{ width: `${i.muted ? 0 : Math.max(0, Math.min(100, ((levels[i.name] ?? -100) + 60) * (100 / 60)))}%` }} />
                      </div>
                      <label className="mt-3 flex items-center gap-3 text-xs text-muted">
                        <span className="w-14 font-mono tabular-nums">{Number.isFinite(i.db) ? `${Math.round(i.db)} dB` : "-∞"}</span>
                        <input
                          type="range"
                          min={-60}
                          max={0}
                          step={1}
                          value={Number.isFinite(i.db) ? Math.max(-60, Math.min(0, i.db)) : -60}
                          aria-label={`Volume ${i.name}`}
                          onChange={(ev) => {
                            const db = Number(ev.target.value);
                            setMixer((m) => m.map((x) => (x.name === i.name ? { ...x, db } : x)));
                            void run("SetInputVolume", { inputName: i.name, inputVolumeDb: db });
                          }}
                          className="w-full accent-current"
                        />
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {backup && (
              <section aria-label="Backup de scène" className="rounded-2xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Backup de scène</h2>
                    <p className="mt-2 max-w-[60ch] text-sm text-muted">Si l&apos;image de la source se fige ou coupe, OBS passe seul sur ta scène de secours, puis revient quand l&apos;image repart. Tout se passe sur ton PC.</p>
                  </div>
                  <button type="button" aria-pressed={backup.enabled} disabled={!backup.source || !backup.scene} onClick={() => saveBackup({ enabled: !backup.enabled })} className={`${btn} ${backup.enabled ? "bg-accent text-on-accent" : "border border-line-strong hover:bg-accent/10"}`}>
                    {backup.enabled ? (backup.state === "backup" ? "Secours actif" : "Activé") : "Désactivé"}
                  </button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Select label="Source surveillée" value={backup.source} options={inputs} onChange={(v) => saveBackup({ source: v })} />
                  <Select label="Scène de secours" value={backup.scene} options={scenes} onChange={(v) => saveBackup({ scene: v })} />
                  <label className="grid gap-1 text-xs text-muted">
                    Bascule après
                    <select value={backup.freezeSeconds} onChange={(ev) => saveBackup({ freezeSeconds: Number(ev.target.value) })} className="h-10 rounded-xl border border-line bg-background px-3 text-sm text-foreground">
                      {[2, 3, 4, 6, 10].map((n) => (
                        <option key={n} value={n}>
                          {n} s d&apos;image figée
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
            )}
          </>
        )}

        {link === "on" && <Devices coreUrl={coreUrl} online={agent.online} />}
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-1 text-xs text-muted">
      {label}
      <select value={value} onChange={(ev) => onChange(ev.target.value)} className="h-10 rounded-xl border border-line bg-background px-3 text-sm text-foreground">
        <option value="">Choisir…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Status({ link, agent, obsDown }: { link: Link; agent: Agent; obsDown: boolean }) {
  const text =
    link === "connecting" ? "Connexion au serveur…" : link === "off" ? "Serveur injoignable ou accès refusé." : !agent.online ? "SYXTEE Link n'est pas lancé sur ton PC." : obsDown ? "SYXTEE Link est là, mais OBS est fermé." : `Connecté à OBS sur ${agent.name ?? "ton PC"}${agent.platform ? ` (${OS[agent.platform] ?? agent.platform})` : ""}`;
  const on = link === "on" && agent.online && !obsDown;
  return (
    <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-wider text-muted" role="status">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${on ? "bg-foreground" : "bg-accent/30"}`} />
      {text}
    </p>
  );
}

function Pairing({ coreUrl }: { coreUrl: string }) {
  const [code, setCode] = useState<{ code: string; expires_in: number } | null>(null);
  const [err, setErr] = useState("");
  async function make() {
    setErr("");
    const r = await coreFetch(coreUrl, "/v1/me/link/pair", { method: "POST" }).catch(() => null);
    if (!r?.ok) return setErr(r?.status === 403 ? "La télécommande est réservée aux comptes invités." : "Impossible de créer un code.");
    setCode(await r.json());
  }
  return (
    <section aria-label="Installer SYXTEE Link" className="rounded-2xl border border-line p-5">
      <h2 className="text-lg font-semibold tracking-tight">Relie ton OBS</h2>
      <ol className="mt-4 grid gap-3 text-sm text-muted">
        <li>
          <b className="text-foreground">1.</b> Dans OBS : Outils, Paramètres du serveur WebSocket, coche « Activer le serveur WebSocket » (port 4455).
        </li>
        <li>
          <b className="text-foreground">2.</b> Installe SYXTEE Link sur le PC où tourne OBS (macOS ou Windows).
        </li>
        <li>
          <b className="text-foreground">3.</b> Génère un code, puis dans un terminal : <code className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-foreground">syxtee-link pair {code?.code ?? "CODE"}</code>
        </li>
        <li>
          <b className="text-foreground">4.</b> Lance <code className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-foreground">syxtee-link run</code>. Si OBS a un mot de passe : <code className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-foreground">syxtee-link obs 127.0.0.1:4455 MOT_DE_PASSE</code>
        </li>
      </ol>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" onClick={make} className={`${btn} bg-accent text-on-accent hover:bg-accent-hover`}>
          {code ? "Nouveau code" : "Générer un code"}
        </button>
        {code && (
          <span className="font-mono text-2xl tracking-[0.25em]" aria-live="polite">
            {code.code}
            <span className="ml-3 text-xs tracking-normal text-muted">valable {Math.round(code.expires_in / 60)} min</span>
          </span>
        )}
      </div>
      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
    </section>
  );
}

function Devices({ coreUrl, online }: { coreUrl: string; online: boolean }) {
  const [list, setList] = useState<Device[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    coreFetch(coreUrl, "/v1/me/link/devices")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && j && setList(j.devices))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [coreUrl, online, tick]);
  if (list.length === 0) return null;
  return (
    <section aria-label="Appareils" className="rounded-2xl border border-line p-4">
      <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Appareils appairés</h2>
      <ul className="mt-3 divide-y divide-line">
        {list.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span>
              {d.name} <span className="text-muted">· {OS[d.platform] ?? d.platform}{d.online ? " · en ligne" : d.last_seen ? ` · vu le ${new Date(d.last_seen).toLocaleDateString("fr-FR")}` : ""}</span>
            </span>
            <button
              type="button"
              onClick={async () => {
                await coreFetch(coreUrl, `/v1/me/link/devices/${d.id}`, { method: "DELETE" }).catch(() => null);
                setTick((t) => t + 1);
              }}
              className="rounded-full border border-line px-3 py-1 text-xs hover:bg-accent/10"
            >
              Révoquer
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
