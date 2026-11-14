"use client";

import { useEffect, useRef, useState } from "react";
import type { Rights } from "./types";
import { useObs } from "./useObs";

// Multiview comme dans OBS Studio (page à part, plein écran, pour un second écran) : Aperçu et Programme en grand, puis les scènes en vignettes.
// Cadre rouge = programme, vert = aperçu. Les vignettes sont des captures d'écran demandées une à une à OBS. Un clic sur une scène l'envoie à l'antenne.

type Shot = { src: string };
const GAP = "#9a9a9a"; // gris du Multiview d'OBS : le fond de la grille, vu entre les vignettes

function Tile({
  label,
  shot,
  tone,
  onPick,
  className = "",
}: {
  label: string;
  shot?: Shot;
  tone?: "program" | "preview";
  onPick?: () => void;
  className?: string;
}) {
  const frame =
    tone === "program"
      ? "#d12a1f"
      : tone === "preview"
        ? "#2fbf4a"
        : "transparent";
  const body = (
    <>
      {shot && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shot.src}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full object-contain"
        />
      )}
      {label && (
        <span className="absolute inset-x-2 bottom-3 flex justify-center">
          {/* Pastille « liquid glass » : verre dépoli, reflet en haut, fin liseré clair ; posée à distance du bord. */}
          <span
            className="max-w-full truncate rounded-full border border-white/25 bg-white/[0.12] px-4 py-1.5 font-sans text-[16px] font-semibold uppercase leading-none tracking-wide text-white backdrop-blur-xl backdrop-saturate-150"
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(255,255,255,0.08), 0 4px 14px rgba(0,0,0,0.35)" }}
          >
            {label}
          </span>
        </span>
      )}
      {tone && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: `inset 0 0 0 4px ${frame}` }}
        />
      )}
    </>
  );
  const cls = `relative min-h-0 min-w-0 overflow-hidden bg-black ${className}`;
  return onPick ? (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Scène ${label}`}
      className={`${cls} cursor-pointer`}
    >
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export default function MultiviewScreen({
  coreUrl,
  deviceId,
  rights,
}: {
  coreUrl: string;
  deviceId: string;
  rights: Rights;
}) {
  const o = useObs({ coreUrl, deviceId, rights });
  const [shots, setShots] = useState<Record<string, Shot>>({});
  const { call } = o;
  // Ce que la boucle de captures lit à chaque tour : programme, aperçu, autres scènes.
  const want = useRef({ program: "", preview: "", rest: [] as string[] });
  const preview = o.studioMode && o.preview ? o.preview : o.program;
  useEffect(() => {
    want.current = {
      program: o.program,
      preview,
      rest: o.scenes.filter((s) => s !== o.program && s !== preview),
    };
  }, [o.program, preview, o.scenes]);

  useEffect(() => {
    document.title = `Multiview · ${o.agent.name ?? "OBS"}`;
  }, [o.agent.name]);

  useEffect(() => {
    let live = true;
    let i = 0;
    const loop = async () => {
      while (live) {
        const w = want.current;
        if (!o.ready || !w.program || document.hidden) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        // Programme et aperçu (grands) reviennent une fois sur deux ; les autres vignettes tournent.
        const name =
          i % 2 === 0
            ? i % 4 === 0 || w.preview === w.program
              ? w.program
              : w.preview
            : (w.rest[Math.floor(i / 2) % Math.max(1, w.rest.length)] ??
              w.program);
        const large = name === w.program || name === w.preview;
        i++;
        try {
          const r = await call<{ imageData: string }>("GetSourceScreenshot", {
            sourceName: name,
            imageFormat: "jpg",
            imageWidth: large ? 960 : 320,
            imageHeight: large ? 540 : 180,
            imageCompressionQuality: 55,
          });
          if (live && r?.imageData)
            setShots((s) => ({
              ...s,
              [name]: {
                src: r.imageData.replace(/^data:image\/jpg/, "data:image/jpeg"),
              },
            }));
        } catch {
          /* scène sans image (vide, supprimée) : on passe à la suivante */
        }
        await new Promise((r) => setTimeout(r, 200));
      }
    };
    void loop();
    return () => {
      live = false;
    };
  }, [call, o.ready]);

  // 8 vignettes comme dans OBS (2 rangées de 4) ; au-delà, des rangées de plus.
  const cells = Math.max(8, Math.ceil(o.scenes.length / 4) * 4);
  const rows = cells / 4;
  const [win, setWin] = useState({ w: 1920, h: 1080 });
  useEffect(() => {
    const fit = () => setWin({ w: window.innerWidth, h: window.innerHeight });
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const editable = o.ready && o.canScenes;
  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      {/* Toile fixe de 1920 × 1080 (plus haute si plus de 8 scènes) comme le Multiview d'OBS, mise à l'échelle de la fenêtre : même rendu en 4K. */}
      <div
        className="absolute left-1/2 top-1/2 grid gap-[6px] p-[6px]"
        style={{
          background: GAP,
          width: 1920,
          height: (540 * (rows + 2)) / 2,
          transform: `translate(-50%, -50%) scale(${Math.min(win.w / 1920, win.h / (270 * (rows + 2))) || 1})`,
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gridTemplateRows: `${rows}fr repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        <Tile
          label="Aperçu"
          shot={shots[preview]}
          tone={o.studioMode ? "preview" : undefined}
          className="col-span-2"
        />
        <Tile
          label="Programme"
          shot={shots[o.program]}
          tone="program"
          className="col-span-2"
        />
        {Array.from({ length: cells }, (_, n) => {
          const sc = o.scenes[n];
          return sc ? (
            <Tile
              key={sc}
              label={sc}
              shot={shots[sc]}
              tone={
                sc === o.program
                  ? "program"
                  : o.studioMode && sc === preview
                    ? "preview"
                    : undefined
              }
              onPick={editable ? () => o.pick(sc) : undefined}
            />
          ) : (
            <Tile key={`vide-${n}`} label="" />
          );
        })}
      </div>
      {!o.ready && (
        <p className="absolute inset-0 grid place-items-center bg-black/70 text-sm text-white">
          En attente d&apos;OBS…
        </p>
      )}
    </main>
  );
}
