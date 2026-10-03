"use client";

import { useState } from "react";
import { DotsThree } from "@phosphor-icons/react";
import { maskUrl } from "@/lib/dashboard-data";

// Lien OBS sur une seule ligne : RTMP (masqué, œil, Copier), SRT, et un menu « … » (sous-chemins /cam1…, guide OBS,
// régénérer le token). UN lien collé dans OBS fait apparaître la sortie PROGRAMME ; /cam1, /cam2… donnent chaque caméra.
// Maquette : le jeton affiché est fictif.

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
  const b = "h-full border-l border-line px-2 text-[11px] text-muted transition-colors hover:bg-foreground/10 hover:text-foreground";
  return (
    <div className="flex h-8 min-w-0 flex-1 items-stretch overflow-hidden rounded-md border border-line bg-background">
      <span className="flex shrink-0 items-center border-r border-line px-2 font-mono text-[10px] font-semibold tracking-wider text-muted">{label}</span>
      <code data-sensitive className="min-w-0 flex-1 self-center truncate px-2 font-mono text-[11px]">
        {shown ? url : maskUrl(url)}
      </code>
      <button type="button" onClick={() => setShown((v) => !v)} aria-pressed={shown} aria-label={shown ? `Masquer le lien ${label}` : `Afficher le lien ${label}`} className={b}>
        {shown ? "Masquer" : "Voir"}
      </button>
      <button type="button" onClick={copy} aria-label={`Copier le lien ${label}`} className={b}>
        <span aria-live="polite">{copied ? "Copié" : "Copier"}</span>
      </button>
    </div>
  );
}

export default function ObsLinkCard({ token, host, locked, onRegenerate, cams }: { token: string; host: string; locked: boolean; onRegenerate: () => void; cams: number[] }) {
  const [menu, setMenu] = useState(false);
  const [ask, setAsk] = useState(false);
  const [guide, setGuide] = useState(false);
  const item = "block w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-foreground/10 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <section aria-label="Lien OBS" className="relative flex items-center gap-2 rounded-xl border border-line bg-surface p-1.5">
      <span className="hidden shrink-0 px-1.5 text-[11px] font-semibold sm:block">Ton lien OBS</span>
      <Url label="RTMP" url={`rtmp://${host}/live/${token}`} />
      <Url label="SRT" url={`srt://${host}:8890?streamid=read:live/${token}`} />
      <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-label="Plus d'options pour le lien OBS" className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-muted transition-colors hover:bg-foreground/10 hover:text-foreground">
        <DotsThree size={18} weight="bold" aria-hidden="true" />
      </button>

      {menu && (
        <div role="dialog" aria-label="Options du lien OBS" className="absolute bottom-full right-0 z-30 mb-2 w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border border-line-strong bg-background p-2 shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
          {cams.length > 0 && (
            <div className="px-2.5 pb-2 pt-1">
              <p className="text-[11px] text-muted">Une caméra seule dans OBS : ajoute le sous-chemin au lien RTMP</p>
              <ul className="mt-1.5 flex flex-wrap gap-1 font-mono text-[11px]">
                {cams.map((n) => (
                  <li key={n} className="rounded border border-line px-1.5 py-0.5 text-muted">
                    /cam{n}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" className={item} onClick={() => setGuide((v) => !v)} aria-expanded={guide}>
            Voir le guide OBS
          </button>
          {guide && (
            <ol className="mx-2.5 mb-2 list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-muted">
              <li>Copie le lien RTMP. Garde-le privé : il donne accès à ta régie.</li>
              <li>Dans OBS : Sources, +, Source média. Décoche « Fichier local » et colle le lien dans « Entrée ».</li>
              <li>Le lien seul envoie le PROGRAMME. Ajoute /cam1, /cam2… pour prendre une caméra à part.</li>
            </ol>
          )}
          <button type="button" className={item} disabled={locked} onClick={() => setAsk(true)}>
            Régénérer le token
          </button>
          {ask && (
            <div role="alertdialog" aria-label="Confirmation" className="m-1.5 rounded-md border border-line-strong p-2 text-xs">
              <p>Régénérer le token ? Le lien actuel cesse de fonctionner : il faudra le recoller dans OBS.</p>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onRegenerate();
                    setAsk(false);
                    setMenu(false);
                  }}
                  className="h-7 rounded-md bg-accent px-3 text-xs font-medium text-on-accent hover:bg-accent-hover"
                >
                  Régénérer
                </button>
                <button type="button" onClick={() => setAsk(false)} className="h-7 rounded-md border border-line px-3 text-xs hover:bg-foreground/10">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
