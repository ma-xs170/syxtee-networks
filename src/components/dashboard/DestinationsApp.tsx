"use client";

import Link from "next/link";
import { useState } from "react";
import { readSelection, writeSelection } from "../remote/destinationSelection";
import { Card, DkButton, ListRow, StatusBadge, Toggle } from "./kit";
import { useLinkDevices } from "./useLinkDevices";
import { OutputDialog, PlatformLogo, type MsOutput } from "../remote/MultistreamPanel";
import type { Rights } from "../remote/types";
import { useObs } from "../remote/useObs";

// Destinations : une ligne par plateforme, un interrupteur chacune = sélection pour le prochain direct (rien ne démarre ici). Seules les sorties ajoutées s'affichent ; « Ajouter une sortie » ouvre le choix de plateforme.
// La clé reste dans le plugin, sur le PC d'OBS : elle n'est jamais renvoyée au site.

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
  const [picked, setPicked] = useState<string[]>(() => readSelection(deviceId));
  const outputs = o.ms?.outputs ?? [];

  function toggle(out: MsOutput) {
    const next = picked.includes(out.id) ? picked.filter((x) => x !== out.id) : [...picked, out.id];
    setPicked(next);
    writeSelection(deviceId, next);
  }

  const row = (out: MsOutput) => (
    <ListRow
      key={out.id}
      lead={<PlatformLogo id={out.service} size={32} />}
      title={out.name}
      sub={out.error ? out.error : out.starting ? "Connexion…" : out.active ? "En direct" : !out.hasKey ? "Clé manquante" : picked.includes(out.id) ? "Sélectionnée pour le direct" : "Prête"}
      trailing={
        <span className="flex items-center gap-3">
          {out.active && <StatusBadge tone="ok">En direct</StatusBadge>}
          {!out.active && !out.starting && !o.guest && (
            <DkButton onClick={() => setDialog({ step: "form", editing: out, service: out.service })} className="!h-8">Modifier</DkButton>
          )}
          <Toggle label={`${out.name} : ${picked.includes(out.id) ? "retirer du direct" : "sélectionner pour le direct"}`} checked={picked.includes(out.id)} disabled={out.active || out.starting || !out.hasKey} onChange={() => toggle(out)} />
        </span>
      }
    />
  );

  return (
    <>
      {outputs.length > 0 && <Card>{outputs.map(row)}</Card>}
      {!o.guest && (
        <div>
          <DkButton onClick={() => setDialog({ step: "pick", service: "" })}>Ajouter une sortie</DkButton>
        </div>
      )}
      <p className="text-[13px] text-muted">Cocher une destination la sélectionne : rien ne démarre ici. Le direct part sur les destinations cochées quand tu lances le stream depuis Contrôle à distance.</p>
      {dialog && <OutputDialog dialog={dialog} setDialog={setDialog} call={o.call} onChange={o.setMs} />}
    </>
  );
}
