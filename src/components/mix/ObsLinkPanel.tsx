"use client";

import { useState } from "react";
import { maskUrl } from "@/lib/dashboard-data";

// Contenu du tiroir « Lien OBS » : RTMP et SRT (masqués, Voir, Copier), sous-chemins /cam1…, token à régénérer, guide en 3 étapes.
// UN lien collé dans OBS fait apparaître la sortie PROGRAMME ; /cam1, /cam2… donnent chaque caméra. Maquette : jeton fictif.

function Url({ label, url }: { label: string; url: string }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }
  const b = "border-l border-line px-3 text-xs text-muted transition-colors hover:bg-foreground/10 hover:text-foreground";
  return (
    <div>
      <p className="mb-1.5 text-xs text-muted">{label}</p>
      <div className="flex items-stretch overflow-hidden rounded-md border border-line bg-background">
        <code data-sensitive className="min-w-0 flex-1 break-all p-2.5 font-mono text-xs">{shown ? url : maskUrl(url)}</code>
        <button type="button" onClick={() => setShown((v) => !v)} aria-pressed={shown} className={b}>{shown ? "Masquer" : "Voir"}</button>
        <button type="button" onClick={copy} className={b}><span aria-live="polite">{copied ? "Copié" : "Copier"}</span></button>
      </div>
    </div>
  );
}

export default function ObsLinkPanel({ token, host, locked, onRegenerate, cams }: { token: string; host: string; locked: boolean; onRegenerate: () => void; cams: number[] }) {
  const [ask, setAsk] = useState(false);
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Un seul lien pour toutes tes caméras. Colle-le dans OBS (Source média ou Flux personnalisé).</p>
      <Url label="RTMP · sortie PROGRAMME" url={`rtmp://${host}/live/${token}`} />
      <Url label="SRT · équivalent" url={`srt://${host}:8890?streamid=read:live/${token}`} />
      {cams.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-muted">Une caméra seule : ajoute le sous-chemin au lien RTMP</p>
          <ul className="flex flex-wrap gap-1.5 font-mono text-xs">
            {cams.map((n) => <li key={n} className="rounded border border-line px-2 py-1 text-muted">/cam{n}</li>)}
          </ul>
        </div>
      )}
      <div>
        <button type="button" disabled={locked} onClick={() => setAsk(true)} className="h-10 rounded-md border border-line px-4 text-sm font-medium hover:bg-foreground/10 disabled:cursor-not-allowed disabled:opacity-40">Régénérer le token</button>
        {ask && (
          <div role="alertdialog" aria-label="Confirmation" className="mt-2 rounded-md border border-line-strong bg-background p-3 text-sm">
            <p>Régénérer le token ? Le lien actuel cesse de fonctionner : il faudra le recoller dans OBS.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => { onRegenerate(); setAsk(false); }} className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover">Régénérer</button>
              <button type="button" onClick={() => setAsk(false)} className="h-10 rounded-md border border-line px-4 text-sm hover:bg-foreground/10">Annuler</button>
            </div>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold">Guide OBS</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
          <li>Copie le lien RTMP. Garde-le privé : il donne accès à ta régie.</li>
          <li>Dans OBS : Sources, +, Source média. Décoche « Fichier local » et colle le lien dans « Entrée ».</li>
          <li>Le lien seul envoie le PROGRAMME. Ajoute /cam1, /cam2… pour prendre une caméra à part.</li>
        </ol>
      </div>
    </div>
  );
}
