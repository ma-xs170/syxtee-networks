"use client";

import type { Ctl } from "@/components/landing/ObsScreens";
import { MacUI, PhoneUI, type PhoneTab } from "@/components/landing/RemoteScreens";

// Écrans figés pour les captures du site (scripts/capture-remote-ui.mjs) : la vraie interface du contrôle à distance, un instant donné.
const C: Ctl = {
  scene: "live",
  muted: false,
  live: true,
  setScene: () => {},
  toggleMute: () => {},
  toggleLive: () => {},
  seconds: 14 * 60 + 5,
  bitrate: 9.1,
  latency: 38,
  loss: 0,
  fps: 30,
};

const PHONE_TABS: PhoneTab[] = ["scenes", "sources", "mixer", "controls"];

export default function Shots() {
  return (
    <div className="space-y-10 bg-black p-10">
      <div id="shot-bureau" className="h-[800px] w-[1280px] overflow-hidden"><MacUI c={C} /></div>
      {PHONE_TABS.map((t) => (
        <div key={t} id={`shot-mobile-${t}`} className="h-[844px] w-[390px] overflow-hidden"><PhoneUI c={C} tab={t} /></div>
      ))}
    </div>
  );
}
