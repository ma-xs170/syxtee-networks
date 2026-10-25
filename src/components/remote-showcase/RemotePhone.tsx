"use client";

import { useState } from "react";
import { DeviceIphone } from "../devices/Devices";
import type { Ctl, SceneId } from "../landing/ObsScreens";
import { PhoneUI, type PhoneTab } from "../landing/RemoteScreens";
import { useLiveStats } from "../landing/useLiveStats";

// Téléphone de démonstration : la vraie interface du contrôle à distance (celle de l'accueil), sur l'onglet demandé.
// Les scènes, le micro et le direct restent cliquables ; les chiffres bougent comme en vrai.
export default function RemotePhone({ tab, className = "" }: { tab: PhoneTab; className?: string }) {
  const [scene, setScene] = useState<SceneId>("live");
  const [muted, setMuted] = useState(false);
  const [live, setLive] = useState(true);
  const { snap } = useLiveStats(true);
  const c: Ctl = {
    scene,
    muted,
    live,
    setScene,
    toggleMute: () => setMuted((m) => !m),
    toggleLive: () => setLive((l) => !l),
    seconds: snap.seconds,
    bitrate: snap.total,
    latency: snap.latency,
    loss: snap.loss,
    fps: snap.fps,
  };
  return (
    <DeviceIphone className={className}>
      <PhoneUI c={c} tab={tab} />
    </DeviceIphone>
  );
}
