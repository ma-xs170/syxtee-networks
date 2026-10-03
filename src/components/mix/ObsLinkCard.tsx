"use client";

import { useState } from "react";
import MaskedUrl from "../dashboard/MaskedUrl";
import { ctl } from "./parts";

// Lien personnel du compte : UN lien RTMP collé dans OBS fait apparaître la sortie MULTIVIEW/PROGRAM ;
// les sous-chemins /cam1, /cam2… donnent chaque caméra séparément. Maquette : le jeton affiché est fictif.

export default function ObsLinkCard({ token, host, locked, onRegenerate, cams }: { token: string; host: string; locked: boolean; onRegenerate: () => void; cams: number[] }) {
  const [guide, setGuide] = useState(false);
  const [ask, setAsk] = useState(false);
  const base = `rtmp://${host}/live/${token}`;
  return (
    <section aria-label="Lien OBS" className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Ton lien OBS</h2>
          <p className="mt-1 text-xs text-muted">Un seul lien pour toutes tes caméras. Colle-le dans OBS (Source média ou Flux personnalisé).</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setGuide((v) => !v)} aria-expanded={guide} className={ctl}>
            Voir le guide OBS
          </button>
          <button type="button" disabled={locked} onClick={() => setAsk(true)} className={ctl}>
            Régénérer le token
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs text-muted">RTMP · sortie PROGRAM</p>
          <MaskedUrl url={base} label="MIX RTMP" size="sm" />
        </div>
        <div>
          <p className="mb-1.5 text-xs text-muted">SRT · équivalent</p>
          <MaskedUrl url={`srt://${host}:8890?streamid=read:live/${token}`} label="MIX SRT" size="sm" />
        </div>
      </div>

      {cams.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs text-muted">Une caméra seule dans OBS : ajoute le sous-chemin au lien RTMP</p>
          <ul className="flex flex-wrap gap-1.5 font-mono text-xs">
            {cams.map((n) => (
              <li key={n} className="rounded-md border border-line px-2 py-1 text-muted">
                /cam{n}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ask && (
        <div role="alertdialog" aria-label="Confirmation" className="mt-4 rounded-lg border border-line-strong bg-background p-3 text-sm">
          <p>Régénérer le token ? Le lien actuel cesse de fonctionner : il faudra le recoller dans OBS.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onRegenerate();
                setAsk(false);
              }}
              className="h-9 rounded-lg bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover"
            >
              Régénérer
            </button>
            <button type="button" onClick={() => setAsk(false)} className={`${ctl} h-9 min-h-9`}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {guide && (
        <ol className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          {[
            ["Copie le lien", "Clique sur Copier à côté du lien RTMP. Garde-le privé : il donne accès à ta régie."],
            ["Ajoute une source dans OBS", "Sources, bouton +, Source média. Décoche « Fichier local » et colle le lien dans « Entrée »."],
            ["Choisis ce que tu reçois", "Le lien seul envoie le PROGRAM. Ajoute /cam1, /cam2… pour prendre une caméra à part."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-xl border border-line bg-background p-3">
              <p className="font-mono text-xs text-muted">{i + 1}</p>
              <p className="mt-1 font-medium">{t}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
