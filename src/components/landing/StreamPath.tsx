"use client";

import Image from "next/image";
import { DeviceIphone, DeviceMac } from "../devices/Devices";
import RelayServer from "../illustrations/RelayServer";

// Trajet du flux, de gauche à droite : ta caméra (iPhone, Moblin), nos serveurs (baie SYXTEE), ton OBS (Mac, interface OBS Studio).
// Les écrans des appareils restent sombres dans les deux thèmes, comme un vrai écran allumé.

const STEPS = [
  { n: "01", title: "Ta caméra envoie", text: "Ton téléphone, avec Moblin, envoie la vidéo sur toutes ses connexions à la fois : 4G, 5G et Wi-Fi." },
  { n: "02", title: "Nos serveurs reçoivent", text: "Le serveur le plus proche de toi rassemble les connexions, récupère les paquets perdus et stabilise le flux." },
  { n: "03", title: "Ton OBS récupère", text: "OBS reçoit un flux propre sur ton ordinateur. Tu ajoutes tes scènes et tu diffuses, comme à la maison." },
];

/* Écran de l'iPhone en paysage : app Moblin en direct, logo au centre. Le contenu (852 x 393) est tourné de 90° dans l'écran portrait (393 x 852), l'appareil de -90°. */
function MoblinScreen() {
  return (
    <div className="relative bg-[#0c0d10] font-sans text-white" style={{ width: 393, height: 852 }}>
      <div className="absolute left-1/2 top-1/2 overflow-hidden" style={{ width: 852, height: 393, transform: "translate(-50%, -50%) rotate(90deg)" }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,#2a2d34,#0c0d10_72%)]" />
        <div className="absolute left-14 top-5 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[14px] font-semibold">
          <span className="size-2 rounded-full bg-[#ff3b30]" /> LIVE <span className="font-mono font-normal text-white/70">00:14:10</span>
        </div>
        <div className="absolute right-8 top-5 rounded-md bg-black/60 px-2 py-1 font-mono text-[13px] text-white/80">7,9 Mb/s</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/moblin/icon.png" alt="" width={80} height={80} className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-[1.2rem]" />
        <div className="absolute inset-x-14 bottom-5 grid grid-cols-3 gap-2">
          {[["4G", "62%"], ["5G", "88%"], ["Wi-Fi", "45%"]].map(([l, w]) => (
            <div key={l} className="rounded-lg bg-black/55 px-2.5 py-2">
              <div className="text-[12px] text-white/70">{l}</div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#3dd68c]" style={{ width: w }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* iPhone posé en paysage : l'appareil portrait est tourné de -90° dans une boîte 19,5:9. */
function LandscapePhone({ image }: { image?: string | null }) {
  return (
    <div className="relative aspect-[19.5/9] w-full">
      <div className="absolute left-1/2 top-1/2 w-[46.15%]" style={{ transform: "translate(-50%, -50%) rotate(-90deg)" }}>
        <DeviceIphone image={image}><MoblinScreen /></DeviceIphone>
      </div>
    </div>
  );
}

/* Écran du Mac : fenêtre d'OBS Studio, thème sombre (1512 x 945). */
function ObsScreen() {
  const panel = "rounded-md border border-white/10 bg-[#232427]";
  const head = "border-b border-white/10 px-3 py-1.5 text-[13px] text-white/70";
  return (
    <div className="relative bg-[#161618] text-[14px] text-white/85" style={{ width: 1512, height: 945 }}>
      {/* barre de menus macOS */}
      <div className="flex h-7 items-center gap-5 bg-[#2a2a2d] px-6 text-[13px] text-white/80">
        <span className="font-semibold">OBS</span><span>Fichier</span><span>Édition</span><span>Affichage</span><span>Profil</span><span>Collection de scènes</span><span>Outils</span><span>Aide</span>
      </div>
      {/* barre de titre de la fenêtre */}
      <div className="relative flex h-9 items-center justify-center border-b border-black bg-[#2c2c30] text-[13px] text-white/70">
        <span className="absolute left-5 flex gap-2"><i className="size-3 rounded-full bg-[#ff5f57]" /><i className="size-3 rounded-full bg-[#febc2e]" /><i className="size-3 rounded-full bg-[#28c840]" /></span>
        OBS Studio · Profil : Direct IRL · Scènes : Stream
      </div>
      {/* aperçu */}
      <div className="flex h-[500px] items-center justify-center bg-[#0d0d0f]">
        <div className="relative h-[450px] w-[800px] overflow-hidden border border-white/15 bg-[radial-gradient(ellipse_at_50%_40%,#2a2d34,#101114_75%)]">
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded bg-black/60 px-2.5 py-1 text-[12px]"><span className="size-2.5 rounded-full bg-[#ff3b30]" />Flux iPhone 16</div>
          <Image src="/logo-400.png" alt="" width={64} height={88} className="absolute left-1/2 top-1/2 h-auto w-14 -translate-x-1/2 -translate-y-1/2 opacity-25 invert" />
        </div>
      </div>
      {/* docks */}
      <div className="grid h-[328px] grid-cols-[1.1fr_1.2fr_1.5fr_1fr_1fr] gap-2 p-2">
        <div className={panel}><div className={head}>Scènes</div>
          {["Début du stream", "En direct", "Connexion perdue", "Fin du stream", "Pause"].map((s, i) => <div key={s} className={`px-3 py-1.5 ${i === 1 ? "bg-[#3b4a6b] text-white" : "text-white/70"}`}>{s}</div>)}
        </div>
        <div className={panel}><div className={head}>Sources</div>
          {["Flux SYXTEE (SRT)", "Overlay alertes", "Chat en direct", "Webcam"].map((s) => <div key={s} className="flex items-center justify-between px-3 py-1.5 text-white/70">{s}<span className="size-2 rounded-full bg-white/40" /></div>)}
        </div>
        <div className={panel}><div className={head}>Mixeur audio</div>
          {[["Flux iPhone", "72%"], ["Micro", "55%"], ["Musique", "34%"]].map(([l, w]) => (
            <div key={l} className="px-3 py-2"><div className="text-white/70">{l}</div>
              <div className="mt-2 h-3 overflow-hidden rounded-sm bg-white/10"><div className="h-full bg-gradient-to-r from-[#3dd68c] via-[#3dd68c] to-[#f5a524]" style={{ width: w }} /></div></div>
          ))}
        </div>
        <div className={panel}><div className={head}>Transitions</div>
          <div className="px-3 py-2 text-white/70">Fondu</div><div className="px-3 text-white/50">Durée 300 ms</div>
        </div>
        <div className={panel}><div className={head}>Contrôles</div>
          <div className="space-y-2 p-3 text-center">
            <div className="rounded bg-[#2d6a4f] py-1.5 text-white">Arrêter le direct</div>
            <div className="rounded bg-white/10 py-1.5">Enregistrer</div>
            <div className="rounded bg-white/10 py-1.5">Mode Studio</div>
            <div className="rounded bg-white/10 py-1.5">Paramètres</div>
          </div>
        </div>
      </div>
      {/* barre d'état */}
      <div className="absolute inset-x-0 bottom-0 flex h-7 items-center justify-end gap-6 border-t border-black bg-[#2c2c30] px-6 font-mono text-[12px] text-white/70">
        <span className="flex items-center gap-2 text-[#ff6b61]"><span className="size-2.5 rounded-full bg-[#ff3b30]" />LIVE 00:14:10</span><span>CPU 4,1 %</span><span>60,00 fps</span><span>7 900 kb/s</span>
      </div>
    </div>
  );
}

function Row({ i, tags, visual, flip = false }: { i: number; tags: string; visual: React.ReactNode; flip?: boolean }) {
  const s = STEPS[i];
  return (
    <div className="grid items-center gap-10 border-t border-line py-14 first:border-t-0 first:pt-0 lg:grid-cols-2 lg:gap-20 lg:py-20">
      <div className={flip ? "lg:order-2" : ""}>
        <p className="font-mono text-7xl font-bold leading-none tracking-tighter text-foreground/15 sm:text-8xl">{s.n}</p>
        <h3 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">{s.title}</h3>
        <p className="mt-4 max-w-[44ch] text-base leading-relaxed text-muted">{s.text}</p>
        <p className="mt-6 font-mono text-xs uppercase tracking-wider text-muted">{tags}</p>
      </div>
      <div className={`flex justify-center ${flip ? "lg:order-1" : ""}`}>{visual}</div>
    </div>
  );
}

export type StreamImages = { laptop?: string | null; phone?: string | null };

export default function StreamPath({ images }: { images?: StreamImages }) {
  return (
    <div role="group" aria-label="Ta caméra envoie à nos serveurs, qui livrent à ton OBS">
      <Row i={0} tags="Moblin · 4G · 5G · Wi-Fi" visual={<div className="w-full max-w-[400px]"><LandscapePhone image={images?.phone} /></div>} />
      <Row i={1} flip tags="SRTLA · Flux stabilisé · Au plus près de toi" visual={<div className="w-full max-w-[250px]"><RelayServer /></div>} />
      <Row i={2} tags="Sur ton Mac ou PC · Tes scènes, comme d'habitude" visual={<div className="w-full max-w-[560px]"><DeviceMac image={images?.laptop}><ObsScreen /></DeviceMac></div>} />
    </div>
  );
}
