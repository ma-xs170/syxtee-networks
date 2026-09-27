"use client";

import dynamic from "next/dynamic";

// SYXTEE Cam : entièrement côté navigateur (caméra, WebRTC, stockage local).
const CamApp = dynamic(() => import("./CamApp"), { ssr: false });

export default function CamClient({ coreUrl }: { coreUrl: string }) {
  return <CamApp coreUrl={coreUrl} />;
}
