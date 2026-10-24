"use client";

import { useEffect, useState } from "react";
import MaskedUrl from "@/components/dashboard/MaskedUrl";
import { useStreamMode } from "@/components/dashboard/streamMode";
import type { RelayView } from "@/lib/core";

// Se connecter : on choisit son appareil, puis QR (Moblin) ou URL complète en bas, et « Avancé » pour URL et identifiant séparés.

type Props = { relay: Pick<RelayView, "protocol" | "name" | "urls" | "obs_srt_url"> };
type Device = { id: string; name: string; tag: string; hint: string; url: string; label: string; moblin?: boolean };

// « srtla://hôte:port?streamid=xxx » : certaines applications veulent l'URL et l'identifiant dans deux champs.
function splitUrl(url: string) {
  const i = url.indexOf("?streamid=");
  return i < 0 ? { base: url, id: null } : { base: url.slice(0, i), id: url.slice(i + "?streamid=".length) };
}

function devices(relay: Props["relay"]): Device[] {
  const u = relay.urls;
  const list: Device[] = [];
  if (relay.protocol === "rtmp") {
    if (u.rtmp_url) list.push({ id: "rtmp", name: "DJI, GoPro, caméra", tag: "RTMP", hint: "DJI Mimo, GoPro Quik ou OBS : colle l'URL dans le champ RTMP. Si l'appareil a deux champs, ouvre « Avancé ».", url: u.rtmp_url, label: "URL RTMP complète" });
  } else {
    if (u.srtla_url) list.push({ id: "moblin", name: "Moblin et autres applications SRTLA", tag: "SRTLA", hint: "Moblin → Réglages → Streams → scanne ce QR code. Le stream SRTLA est créé avec la bonne URL.", url: u.srtla_url, label: "URL SRTLA (Moblin)", moblin: true });
  }
  list.push({ id: "obs", name: "OBS Studio", tag: "Récupérer le flux", hint: "Source Média → décocher « Fichier local » → champ Entrée.", url: relay.obs_srt_url, label: "URL OBS" });
  return list;
}

export function moblinLink(name: string, url: string) {
  return `moblin://?${encodeURIComponent(JSON.stringify({ streams: [{ name, url }] }))}`;
}

function Qr({ value, label }: { value: string; label: string }) {
  const streamMode = useStreamMode();
  const [svg, setSvg] = useState("");
  const [shown, setShown] = useState(false);
  const visible = shown && !streamMode;

  useEffect(() => {
    let alive = true;
    import("qrcode")
      .then((m) => m.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } }))
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(""));
    return () => {
      alive = false;
    };
  }, [value]);

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Connexion rapide · double-clique pour afficher</p>
      <div className="mt-3 flex flex-col items-center gap-3 rounded-xl border border-line bg-background p-5">
        <div
          onDoubleClick={() => setShown((v) => !v)}
          className="relative size-48 select-none overflow-hidden rounded-lg bg-white p-1"
          data-sensitive
        >
          {svg ? (
            <div aria-label={label} role="img" className={`size-full transition-[filter] duration-200 [&>svg]:size-full ${visible ? "" : "blur-md"}`} dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <div className="size-full animate-pulse bg-foreground/10" />
          )}
        </div>
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          disabled={streamMode}
          aria-pressed={visible}
          className="rounded-full border border-line px-4 py-1.5 text-sm text-muted transition-colors hover:bg-foreground/10 hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {streamMode ? "Masqué (mode stream)" : visible ? "Masquer le QR code" : "Afficher le QR code"}
        </button>
      </div>
    </div>
  );
}

export default function RelayUrls({ relay }: Props) {
  const list = devices(relay);
  const [current, setCurrent] = useState(list[0].id);
  const dev = list.find((d) => d.id === current) ?? list[0];
  const { base, id } = splitUrl(dev.url);
  const rtmpKey = relay.protocol === "rtmp" && dev.id === "rtmp";
  const u = relay.urls;

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Appareil ou logiciel" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={d.id === dev.id}
            onClick={() => setCurrent(d.id)}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-[15px] transition-colors ${d.id === dev.id ? "border-foreground/60 bg-surface-2" : "border-line hover:bg-foreground/5"}`}
          >
            <span className="font-medium">{d.name}</span>
            <span className="rounded-md bg-foreground/10 px-2 py-0.5 font-mono text-xs text-muted">{d.tag}</span>
          </button>
        ))}
      </div>

      <div className="space-y-5 rounded-2xl border border-line p-5" role="tabpanel">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{dev.name} <span className="font-normal text-muted">· {dev.tag}</span></h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{dev.hint}</p>
        </div>

        {dev.moblin && (
          <>
            <Qr value={moblinLink(relay.name, dev.url)} label={`QR code Moblin pour ${relay.name}`} />
            <a href={moblinLink(relay.name, dev.url)} className="inline-flex rounded-full border border-line px-4 py-2 text-sm transition-colors hover:bg-foreground/10">
              Ouvrir dans Moblin (depuis l&apos;iPhone)
            </a>
          </>
        )}

        <div>
          <p className="mb-2 text-sm font-medium">{dev.label}</p>
          <MaskedUrl url={dev.url} label={dev.label} />
        </div>

        <details className="group rounded-xl border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            Avancé : URL et identifiant
            <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="space-y-4 border-t border-line p-4">
            {rtmpKey ? (
              <>
                {u.rtmp_server && <div><p className="mb-2 text-sm font-medium">Serveur RTMP</p><MaskedUrl url={u.rtmp_server} label="Serveur RTMP" size="sm" /></div>}
                {u.rtmp_key && <div><p className="mb-2 text-sm font-medium">Clé de stream</p><MaskedUrl url={u.rtmp_key} label="Clé de stream" size="sm" /></div>}
              </>
            ) : id ? (
              <>
                <p className="text-xs leading-relaxed text-muted">Pour les applications qui séparent l&apos;adresse et l&apos;identifiant (Stream ID).</p>
                <div><p className="mb-2 text-sm font-medium">URL</p><MaskedUrl url={base} label="URL sans identifiant" size="sm" /></div>
                <div><p className="mb-2 text-sm font-medium">Identifiant (Stream ID)</p><MaskedUrl url={id} label="Identifiant" size="sm" mask="••••••••••••••••" /></div>
              </>
            ) : (
              <p className="text-sm text-muted">Cette adresse n&apos;a pas d&apos;identifiant séparé : utilise l&apos;URL complète.</p>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
