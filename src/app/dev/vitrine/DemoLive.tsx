"use client";

import type { ReactNode } from "react";
import { LiveContext, type LiveState } from "@/components/dashboard/LiveStatus";

// Statut « en direct » fixe pour les pages de démo des captures (le contexte vit côté client).
export default function DemoLive({ state, children }: { state: LiveState; children: ReactNode }) {
  return <LiveContext.Provider value={{ state, link: "ok", coreUrl: "" }}>{children}</LiveContext.Provider>;
}
