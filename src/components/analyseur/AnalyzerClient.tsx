"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type AnalyzerType from "./Analyzer";

// Analyseur réseau : entièrement côté navigateur (mesures, GPS, historique local). Cadre réservé pendant le chargement.
const Analyzer = dynamic(() => import("./Analyzer"), {
  ssr: false,
  loading: () => <div className="min-h-[520px] rounded-2xl border border-line" aria-hidden="true" />,
});

export default function AnalyzerClient(props: ComponentProps<typeof AnalyzerType>) {
  return <Analyzer {...props} />;
}
