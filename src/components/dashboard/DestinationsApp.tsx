"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, DkButton, ListRow, StatusBadge, Toggle } from "./kit";
import { useLinkDevices } from "./useLinkDevices";
import { OutputDialog, PlatformLogo, PRESETS, type MsOutput } from "../remote/MultistreamPanel";
import type { Rights } from "../remote/types";
import { useObs } from "../remote/useObs";

// Destinations : une ligne par plateforme, un interrupteur chacune. Sans sortie réglée, « Configurer » ouvre le formulaire (adresse + clé).
// La clé reste dans le plugin, sur le PC d'OBS : elle n'est jamais renvoyée au site.

const MAIN = ["twitch", "kick", "youtube", "instagram", "tiktok", "x"] as const;

export default function DestinationsApp({ coreUrl, rights }: { coreUrl: string; rights: Rights }) {
  const { devices } = useLinkDevices(coreUrl);
  const [picked, setPicked] = useState<string | null>(null);
  if (!devices) return <Card><p className="text-[14px] text-muted">Chargement…</p></Card>;
  const online = devices.filter((d) => d.online);
  const device = online.find((d) => d.id === picked) ?? online[0];
  if (!device)
    return (
      <Card>
        <p className="text-[16px] text-foreground">Aucun appareil en ligne</p>
        <p className="mt-1 text-[14px] text-muted">Ouvre OBS sur ton ordinateur : les destinations apparaissent dès que le plugin est connecté.</p>
        <Link href="/dashboard/appareils" className="dk-btn dk-btn-secondary mt-5">Voir mes appareils</Link>
      </Card>
    );
  return (
    <div className="grid gap-6">
      {online.length > 1 && (
        <label className="flex items-center gap-3 text-[14px] text-muted">
          Appareil
          <select value={device.id} onChange={(e) => setPicked(e.target.value)} className="h-10 rounded-[10px] border border-line bg-transparent px-3 text-foreground">
            {online.map((d) => <option key={d.id} value={d.id} className="bg-background">{d.name}</option>)}
          </select>
        </label>
      )}
      <Outputs key={device.id} coreUrl={coreUrl} deviceId={device.id} rights={rights} />
    </div>
  );
}

function Outputs({ coreUrl, deviceId, rights }: { coreUrl: string; deviceId: string; rights: Rights }) {
  const o = useObs({ coreUrl, deviceId, rights });
  const [dialog, setDialog] = useState<null | { step: "pick" | "form"; editing?: MsOutput; service: string }>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const outputs = o.ms?.outputs ?? [];
  const extras = outputs.filter((x) => !(MAIN as readonly string[]).includes(x.service));

  async function toggle(out: MsOutput) {
    setBusy(out.id);
    setError("");
    try {
      const r = await o.call<NonNullable<typeof o.ms>>(out.active || out.starting ? "link.multistreamStop" : "link.multistreamStart", { id: out.id });
      if (r) o.setMs(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const row = (out: MsOutput | undefined, id: string, label: string) => (
    <ListRow
      key={out?.id ?? id}
      lead={<PlatformLogo id={id} size={32} />}
      title={out?.name ?? label}
      sub={!out ? "Non configurée" : out.error ? out.error : out.starting ? "Connexion…" : out.active ? "En direct" : "Prête"}
      trailing={
        out ? (
          <span className="flex items-center gap-3">
            {out.active && <StatusBadge tone="ok">En direct</StatusBadge>}
            {!out.active && !out.starting && !o.guest && (
              <DkButton onClick={() => setDialog({ step: "form", editing: out, service: out.service })} className="!h-8">Modifier</DkButton>
            )}
            <Toggle label={`${out.name} : ${out.active ? "arrêter" : "lancer"}`} checked={out.active || out.starting} disabled={!o.ready || !o.canLive || busy === out.id || (!out.active && !out.starting && !out.hasKey)} onChange={() => void toggle(out)} />
          </span>
        ) : (
          !o.guest && <DkButton onClick={() => setDialog({ step: "form", service: id })}>Configurer</DkButton>
        )
      }
    />
  );

  return (
    <>
      <Card>
        {MAIN.map((id) => row(outputs.find((x) => x.service === id), id, PRESETS.find((p) => p.id === id)?.label ?? id))}
        {extras.map((x) => row(x, x.service, x.name))}
      </Card>
      {!o.guest && (
        <div>
          <DkButton onClick={() => setDialog({ step: "pick", service: "" })}>Ajouter une autre destination</DkButton>
        </div>
      )}
      <p className="text-[13px] text-muted">Lancer une destination démarre aussi le direct d&apos;OBS ; il s&apos;arrête avec la dernière.</p>
      {error && <p role="alert" className="text-[14px] text-[var(--dk-amber)]">{error}</p>}
      {dialog && <OutputDialog dialog={dialog} setDialog={setDialog} call={o.call} onChange={o.setMs} />}
    </>
  );
}
