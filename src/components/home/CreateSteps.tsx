"use client";

import { useState, type ReactNode } from "react";
import { RELAY_SERVERS } from "@/lib/relay-servers";
import { Container, CreateRelayLink } from "../ui";

// « Crée ton relais en 3 étapes » : aperçu de l'assistant du dashboard (Protocole, Appareil, Serveur).
// Une étape à la fois, au clic. Même vocabulaire que l'assistant : pastilles de latence vert / orange / gris.

const STEPS: { id: string; title: string; text: string }[] = [
  { id: "protocole", title: "Protocole", text: "SRTLA pour le bonding en mouvement, RTMP pour une caméra." },
  { id: "appareil", title: "Appareil", text: "Tu choisis ton téléphone ou ta caméra : le guide s'adapte." },
  { id: "serveur", title: "Serveur", text: "Tu prends le plus proche. La latence est affichée par pastille." },
];

function Choice({ name, note, selected }: { name: string; note?: string; selected?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${selected ? "border-foreground/60 bg-foreground/[0.12]" : "border-line"}`}>
      <p className="flex items-center justify-between gap-3 text-sm font-medium">
        {name}
        {note && <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{note}</span>}
      </p>
    </div>
  );
}

const PANES: Record<string, ReactNode> = {
  protocole: (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-foreground/60 bg-foreground/[0.12] p-4">
        <p className="flex items-center justify-between gap-3 text-sm font-medium">
          SRTLA
          <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Recommandé</span>
        </p>
        <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted">
          <li>Combine 4G, 5G, Wi-Fi et Starlink</li>
          <li>Le live continue si un réseau lâche</li>
        </ul>
      </div>
      <div className="rounded-xl border border-line p-4">
        <p className="text-sm font-medium">RTMP</p>
        <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted">
          <li>DJI Osmo, GoPro, Insta360, OBS</li>
          <li>Configuration simple</li>
        </ul>
      </div>
    </div>
  ),
  appareil: (
    <div className="grid gap-3 sm:grid-cols-2">
      <Choice name="iPhone 16" selected />
      <Choice name="Galaxy S24" />
      <Choice name="Pixel 9" />
      <Choice name="BELABOX" />
    </div>
  ),
  serveur: (
    <div>
      <ul className="grid gap-2">
        {RELAY_SERVERS.slice(0, 5).map((s) => (
          <li key={s.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${s.available ? "border-foreground/60 bg-foreground/[0.12]" : "border-line text-muted"}`}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${s.available ? "bg-emerald-400" : "bg-muted"}`} aria-hidden="true" />
            <span className="font-medium text-foreground">{s.city}</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em]">{s.cc}</span>
            <span className="ml-auto text-xs">{s.available ? "Disponible" : "Bientôt"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted">Vert : latence basse. Orange : moyenne. Gris : serveur à venir.</p>
    </div>
  ),
};

export default function CreateSteps() {
  const [step, setStep] = useState(STEPS[0].id);
  const index = STEPS.findIndex((s) => s.id === step);

  return (
    <section id="creer" aria-labelledby="creer-titre" className="bg-field bg-field-bottom border-b border-line py-24">
      <Container>
        <h2 id="creer-titre" className="max-w-2xl h-section">
          Crée ton relais en 3 étapes.
        </h2>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={step === s.id}
                onClick={() => setStep(s.id)}
                className={`flex gap-4 rounded-2xl border p-5 text-left transition-colors ${step === s.id ? "border-foreground/50 bg-foreground/[0.08]" : "border-line hover:bg-foreground/[0.08]"}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-sm ${step === s.id ? "border-accent bg-accent text-on-accent" : "border-line text-muted"}`}>{i + 1}</span>
                <span>
                  <span className="block text-base font-semibold">{s.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">{s.text}</span>
                </span>
              </button>
            ))}
            <div className="mt-4">
              <CreateRelayLink />
            </div>
          </div>

          <div aria-live="polite" className="panel-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <p className="text-sm font-medium">Créer un relais</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                Étape {index + 1} sur {STEPS.length}
              </p>
            </div>
            <div className="min-h-[320px] p-6">
              <p className="mb-5 text-lg font-semibold">{STEPS[index].title}</p>
              {PANES[step]}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
