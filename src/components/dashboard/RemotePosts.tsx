"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ago, pluginState, since } from "@/lib/plugin";
import { useLiveStatus } from "./LiveStatus";
import { useLinkDevices, type DevicesDemo, type LinkDevice } from "./useLinkDevices";
import { Card, Fact, Pill, RowMenu } from "./panel";
import { DownloadButton } from "./MesObs";

// Onglet « Mes OBS » du Contrôle à distance : une ligne par poste (état, plugin, Piloter OBS, menu ⋮ renommer / délier)
// et une synthèse « En bref » à droite. Renommer et délier passent par une fenêtre de confirmation.

const pilot = "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-accent px-4 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover";
const pilotOff = "inline-flex h-9 cursor-not-allowed items-center justify-center whitespace-nowrap rounded-full border border-line px-4 text-sm text-muted";
const ghost = "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full border border-line-strong px-5 text-sm font-medium transition-colors hover:bg-foreground/[0.08] disabled:opacity-40";

type Ask = { kind: "rename" | "revoke"; d: LinkDevice } | null;

export default function RemotePosts({ coreUrl, demo }: { coreUrl: string; demo?: DevicesDemo }) {
  const { devices, latest, error, rename, revoke } = useLinkDevices(coreUrl, 4000, demo);
  const live = useLiveStatus();
  const pushing = (live.state?.relays ?? []).filter((r) => r.live).map((r) => r.name).filter(Boolean);
  const [now, setNow] = useState(() => Date.now());
  const [ask, setAsk] = useState<Ask>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState("");
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const el = dlg.current;
    if (!el) return;
    if (ask && !el.open) el.showModal();
    if (!ask && el.open) el.close();
  }, [ask]);

  const open = (kind: "rename" | "revoke", d: LinkDevice) => {
    setFail("");
    setName(d.name);
    setAsk({ kind, d });
  };
  async function confirm() {
    if (!ask) return;
    setBusy(true);
    const ok = ask.kind === "rename" ? await rename(ask.d.id, name.trim()) : await revoke(ask.d.id);
    setBusy(false);
    if (ok) setAsk(null);
    else setFail(ask.kind === "rename" ? "Renommage impossible." : "Impossible de délier ce poste.");
  }

  if (error && !devices) return <p className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted">{error}</p>;
  if (!devices) return <div className="h-72 animate-pulse rounded-2xl border border-line bg-surface motion-reduce:animate-none" aria-busy="true" aria-label="Chargement des postes" />;

  const online = devices.filter((d) => d.online);
  const sorted = [...online, ...devices.filter((d) => !d.online)];
  const outdated = devices.filter((d) => pluginState(d.plugin_version, latest) === "outdated").length;

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        {devices.length === 0 ? (
          <Card title="Relie ton premier OBS">
            <div className="py-5">
              <ol className="grid gap-4">
                {[
                  ["Télécharger le plugin", "Onglet « Plugin OBS » : le fichier de ton ordinateur est prêt."],
                  ["Installer et ouvrir OBS", "Menu SYXTEE, puis Connecter."],
                  ["Autoriser l'ordinateur", "Confirme dans la page qui s'ouvre : le poste apparaît ici."],
                ].map(([t, dsc], i) => (
                  <li key={t} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line font-mono text-xs text-muted">{i + 1}</span>
                    <span className="text-[15px]">
                      <span className="block font-semibold">{t}</span>
                      <span className="block text-sm text-muted">{dsc}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-6">
                <DownloadButton coreUrl={coreUrl} latest={latest} />
              </div>
            </div>
          </Card>
        ) : (
          <Card title="Mes OBS">
            {sorted.map((d) => {
              const st = pluginState(d.plugin_version, latest);
              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-5">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="flex flex-wrap items-center gap-3">
                      <span className="truncate text-[15px] font-semibold">{d.name}</span>
                      <Pill tone={d.online ? "ok" : "idle"}>{d.online ? "En ligne" : "Hors ligne"}</Pill>
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted">
                      Plugin {d.plugin_version || "?"}
                      {st === "outdated" && latest ? <span className="text-foreground"> · mise à jour {latest.version}</span> : st === "ok" ? " · à jour" : ""}
                      {d.online && pushing.length > 0 && ` · pousse ${pushing.join(", ")}`}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{d.online ? (d.online_since ? `Connecté depuis ${since(d.online_since, now)}` : "") : `Vu ${ago(d.last_seen, now)}`}</p>
                  </div>
                  {d.online ? (
                    <Link href={`/controle-a-distance/${d.id}`} className={pilot}>
                      Piloter OBS
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={pilotOff}>
                      Piloter OBS
                    </span>
                  )}
                  <RowMenu label={`Actions de ${d.name}`} items={[{ label: "Renommer", onSelect: () => open("rename", d) }, { label: "Délier ce poste", danger: true, onSelect: () => open("revoke", d) }]} />
                </div>
              );
            })}
          </Card>
        )}
      </div>

      <aside className="space-y-6 lg:sticky lg:top-6">
        <Card title="En bref">
          <dl className="divide-y divide-line">
            <Fact label="Postes reliés">{devices.length}</Fact>
            <Fact label="En ligne">
              <Pill tone={online.length ? "ok" : "idle"}>{online.length}</Pill>
            </Fact>
            <Fact label="Plugin à jour">{outdated ? <Pill tone="warn">{outdated} à mettre à jour</Pill> : <Pill tone="ok">Oui</Pill>}</Fact>
            <Fact label="Dernière version">{latest?.version ?? "-"}</Fact>
            <Fact label="Direct en cours">{pushing.length ? <Pill tone="live">{pushing.join(", ")}</Pill> : "Aucun"}</Fact>
          </dl>
        </Card>
      </aside>

      <dialog ref={dlg} onClose={() => setAsk(null)} className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-line-strong bg-surface p-6 text-foreground backdrop:bg-black/60">
        {ask && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void confirm();
            }}
          >
            <h2 className="text-lg font-semibold tracking-tight">{ask.kind === "rename" ? "Renommer ce poste" : "Délier ce poste"}</h2>
            {ask.kind === "rename" ? (
              <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} aria-label="Nom du poste" autoFocus className="mt-4 h-11 w-full rounded-xl border border-line bg-background px-4 text-sm" />
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted">« {ask.d.name} » ne sera plus relié à ton compte. Pour le piloter de nouveau, reconnecte-le depuis OBS (menu SYXTEE, puis Connecter).</p>
            )}
            {fail && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {fail}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setAsk(null)} className={ghost}>
                Annuler
              </button>
              <button type="submit" disabled={busy || (ask.kind === "rename" && !name.trim())} className={`${ghost} ${ask.kind === "revoke" ? "border-red-400/40 text-red-300" : "bg-accent text-on-accent hover:bg-accent-hover"}`}>
                {busy ? "…" : ask.kind === "rename" ? "Enregistrer" : "Délier"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
