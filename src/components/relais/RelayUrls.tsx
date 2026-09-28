import MaskedUrl from "@/components/dashboard/MaskedUrl";
import type { RelayView } from "@/lib/core";

// URLs d'un relais selon son protocole, clés masquées par défaut (œil + copier).

function Url({ label, hint, url }: { label: string; hint: string; url: string }) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
      <div className="mt-2">
        <MaskedUrl url={url} label={label} />
      </div>
    </div>
  );
}

export default function RelayUrls({ relay }: { relay: Pick<RelayView, "protocol" | "urls" | "obs_srt_url"> }) {
  const u = relay.urls;
  return (
    <div className="space-y-6">
      {relay.protocol === "rtmp" ? (
        <>
          {u.rtmp_server && <Url label="Serveur RTMP" hint="DJI Mimo, GoPro Quik, OBS → Serveur (ou URL RTMP)." url={u.rtmp_server} />}
          {u.rtmp_key && <Url label="Clé de stream" hint="À coller dans le champ « Clé » de la caméra ou du logiciel." url={u.rtmp_key} />}
          {u.rtmp_url && <Url label="URL RTMP complète" hint="Pour les appareils qui n'ont qu'un seul champ." url={u.rtmp_url} />}
        </>
      ) : (
        <>
          {u.srtla_url && <Url label="Moblin (SRTLA)" hint="Moblin → Réglages → Streams → ton stream → URL." url={u.srtla_url} />}
          {u.srt_url && <Url label="IRL Pro, BELABOX ou encodeur SRT" hint="Envoi direct en SRT, sans agrégation de liens." url={u.srt_url} />}
        </>
      )}
      <Url label="OBS (source Média)" hint="OBS → Source média → décocher « Fichier local » → Entrée." url={relay.obs_srt_url} />
    </div>
  );
}
