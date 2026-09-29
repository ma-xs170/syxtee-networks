"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type ScannerType from "./Scanner";

// Scanner réseau : entièrement côté navigateur (GPS, mesures, carte). Cadre réservé pendant le chargement.
const Scanner = dynamic(() => import("./Scanner"), {
  ssr: false,
  loading: () => <div className="mx-auto min-h-[calc(100dvh-9rem)] w-full max-w-6xl px-4 pt-4 sm:px-6" aria-hidden="true" />,
});

export default function ScannerClient(props: ComponentProps<typeof ScannerType>) {
  return <Scanner {...props} />;
}
