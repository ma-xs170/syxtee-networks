"use client";

import RelayGlobe from "@/components/globe/RelayGlobe";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createRelayAction } from "@/app/(dashboard)/dashboard/relais/actions";
import type { RelayProtocol, RelayView } from "@/lib/core";
import { RELAY_SERVERS, distanceKm, estimateRtt, flag, latencyTone, type LatencyTone } from "@/lib/relay-servers";
import RelayUrls from "./RelayUrls";

// Assistant « Créer un relais » : modale plein écran en 4 étapes (protocole, appareil, serveur, récap), puis les URLs.

const STEPS = ["Protocole", "Appareil", "Serveur", "Récap"] as const;

const PROTOCOLS: { id: RelayProtocol; name: string; badge?: string; pros: string[]; cons: string[]; foot: string }[] = [
  {
    id: "srtla",
    name: "SRTLA",
    badge: "Recommandé",
    pros: ["Bonding : combine 4G, 5G, Wi-Fi et Starlink", "Le live continue quand un réseau lâche", "Idéal pour l'IRL en mouvement"],
    cons: [],
    foot: "Compatible : Moblin, IRL Pro, BELABOX",
  },
  {
    id: "rtmp",
    name: "RTMP",
    pros: ["Compatible avec presque tout : caméras DJI Osmo, GoPro, Insta360, OBS, logiciels", "Configuration simple"],
    cons: ["Une seule connexion : plus sensible aux coupures"],
    foot: "Idéal pour : caméra d'action, plan fixe, Wi-Fi stable",
  },
];

const SUGGESTIONS: Record<RelayProtocol, string[]> = {
  srtla: ["iPhone 16", "iPhone 15 Pro", "Galaxy S24", "Pixel 9", "BELABOX"],
  rtmp: ["Osmo Pocket 3", "Osmo Action 5 Pro", "Osmo 360", "GoPro HERO13", "Insta360 X4", "OBS"],
};

const TONE: Record<LatencyTone, string> = {
  good: "bg-emerald-400",
  fair: "bg-amber-400",
  bad: "bg-red-400",
  none: "bg-muted",
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Latence vue du navigateur : médiane de 5 requêtes GET /ping du Core. null si le serveur ne répond pas. */
async function measure(coreUrl: string, signal: AbortSignal): Promise<number | null> {
  const times: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${coreUrl}/ping`, { cache: "no-store", signal });
      if (!res.ok) return null;
    } catch {
      return null;
    }
    times.push(performance.now() - t0);
  }
  return Math.round(median(times));
}

function Dot({ tone }: { tone: LatencyTone }) {
  return <span className={`h-2 w-2 shrink-0 rounded-full ${TONE[tone]}`} aria-hidden="true" />;
}

export default function CreateRelayWizard({
  open,
  onClose,
  coreUrl,
  geo,
}: {
  open: boolean;
  onClose: () => void;
  coreUrl: string;
  /** Position approximative du visiteur (IP), pour estimer la latence des serveurs à venir. */
  geo: { lat: number; lon: number } | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [protocol, setProtocol] = useState<RelayProtocol>("srtla");
  const [name, setName] = useState("");
  const [server, setServer] = useState("bhs1");
  const [latency, setLatency] = useState<Record<string, number | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<RelayView | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Étape Serveur : mesure en direct toutes les 5 s (seulement les serveurs disponibles ont un Core joignable).
  useEffect(() => {
    if (!open || step !== 2 || !coreUrl) return;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      const ms = await measure(coreUrl, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setLatency((l) => ({ ...l, bhs1: ms }));
      timer = setTimeout(run, 5000);
    };
    void run();
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [open, step, coreUrl]);

  const rows = RELAY_SERVERS.map((s) => {
    const measured = s.available ? latency[s.id] : undefined;
    const estimated = geo ? estimateRtt(distanceKm(geo, s)) : null;
    return { ...s, measured, estimated };
  });
  // Le plus rapide des serveurs disponibles (mesure réelle) : présélectionné une fois mesuré.
  const fastest = rows
    .filter((r) => r.available && r.measured != null)
    .sort((a, b) => (a.measured as number) - (b.measured as number))[0]?.id;
  const fastestRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (fastest && fastestRef.current !== fastest) {
      fastestRef.current = fastest;
      setServer(fastest);
    }
  }, [fastest]);

  function reset() {
    setStep(0);
    setProtocol("srtla");
    setName("");
    setServer("bhs1");
    setError(null);
    setCreated(null);
    fastestRef.current = undefined;
  }

  function close() {
    onClose();
    // Laisse la modale se fermer avant de repartir de zéro.
    setTimeout(reset, 200);
  }

  const canNext = step === 0 || (step === 1 && name.trim().length > 0 && name.trim().length <= 40) || (step === 2 && !!server);

  function submit() {
    setError(null);
    start(async () => {
      const r = await createRelayAction({ name, protocol, server });
      if (r.error) return setError(r.error);
      setCreated(r.relay ?? null);
      router.refresh();
    });
  }

  const srv = RELAY_SERVERS.find((s) => s.id === server);

  return (
    <dialog
      ref={ref}
      onClose={close}
      aria-labelledby="create-relay-title"
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-background p-0 text-foreground backdrop:bg-background"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-8 pt-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <h2 id="create-relay-title" className="text-xl font-semibold tracking-tight sm:text-2xl">
            {created ? (
              <>
                Relais créé.
              </>
            ) : (
              <>
                Créer un relais
              </>
            )}
          </h2>
          <button type="button" onClick={close} className="h-10 rounded-full px-4 text-sm text-muted transition-colors hover:bg-foreground/10 hover:text-foreground">
            Fermer
          </button>
        </div>

        {!created && (
          <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Étapes">
            {STEPS.map((label, i) => (
              <li key={label} aria-current={i === step ? "step" : undefined}>
                <span className={`block h-1 rounded-full transition-colors motion-reduce:transition-none ${i <= step ? "bg-accent" : "bg-foreground/20"}`} />
                <span className={`mt-2 block font-mono text-[11px] uppercase tracking-[0.12em] ${i === step ? "text-foreground" : "text-muted"}`}>
                  {i + 1} {label}
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-8 flex-1">
          {created ? (
            <Success relay={created} />
          ) : step === 0 ? (
            <fieldset>
              <legend className="text-base text-muted">Comment ton appareil va envoyer la vidéo ?</legend>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {PROTOCOLS.map((p) => (
                  <label
                    key={p.id}
                    className={`relative flex cursor-pointer flex-col rounded-2xl border p-5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground/60 ${
                      protocol === p.id ? "border-accent bg-foreground/[0.08]" : "border-line hover:bg-foreground/[0.08]"
                    }`}
                  >
                    <input type="radio" name="protocol" value={p.id} checked={protocol === p.id} onChange={() => setProtocol(p.id)} className="sr-only" />
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-mono text-lg tracking-[0.08em]">{p.name}</span>
                      {p.badge && <span className="rounded border border-foreground/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]">{p.badge}</span>}
                    </span>
                    <ul className="mt-4 space-y-2 text-sm">
                      {p.pros.map((t) => (
                        <li key={t} className="flex gap-3">
                          <span aria-hidden="true" className="text-muted">+</span>
                          {t}
                        </li>
                      ))}
                      {p.cons.map((t) => (
                        <li key={t} className="flex gap-3 text-muted">
                          <span aria-hidden="true">−</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                    <span className="mt-auto pt-5 text-xs text-muted">{p.foot}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : step === 1 ? (
            <div>
              <label htmlFor="relay-name" className="text-base text-muted">
                Nom de l&apos;appareil qui utilisera ce relais
              </label>
              <input
                id="relay-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoFocus
                autoComplete="off"
                placeholder={protocol === "rtmp" ? "Ex. Osmo Pocket 3" : "Ex. iPhone 16"}
                className="mt-3 h-12 w-full rounded-xl border border-line bg-background px-4 text-base text-foreground placeholder:text-muted focus:border-foreground/70 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && canNext && (e.preventDefault(), setStep(2))}
              />
              <p className="mt-2 text-xs text-muted">Tu le retrouveras dans ta liste de relais. 40 caractères au plus.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {SUGGESTIONS[protocol].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setName(s)}
                    className={`h-9 rounded-full border px-3 text-sm transition-colors ${name === s ? "border-accent bg-foreground/[0.12]" : "border-line text-muted hover:bg-foreground/10 hover:text-foreground"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : step === 2 ? (
            <fieldset>
              <legend className="text-base text-muted">Serveur de proximité : plus il est proche, plus la latence est basse.</legend>
              <RelayGlobe
                className="mx-auto mt-4 max-w-[340px]"
                servers={rows.map((r) => ({ id: r.id, city: r.city, lat: r.lat, lon: r.lon, available: r.available, ping: r.available ? (r.measured ?? null) : r.estimated, estimated: !r.available }))}
                selected={server}
                geo={geo}
                onSelect={(id) => rows.find((r) => r.id === id)?.available && setServer(id)}
              />
              <ul className="mt-4 divide-y divide-foreground/10 rounded-2xl border border-line">
                {rows.map((r) => {
                  const shown = r.available ? r.measured : r.estimated;
                  const tone = r.available ? (r.measured === undefined ? "none" : latencyTone(r.measured ?? null)) : "none";
                  return (
                    <li key={r.id}>
                      <label className={`flex items-center gap-4 px-4 py-3.5 sm:px-5 ${r.available ? "cursor-pointer hover:bg-foreground/[0.08]" : "cursor-not-allowed opacity-50"}`}>
                        <input
                          type="radio"
                          name="server"
                          value={r.id}
                          disabled={!r.available}
                          checked={server === r.id}
                          onChange={() => setServer(r.id)}
                          className="h-4 w-4 accent-accent"
                        />
                        <span className="text-lg" role="img" aria-label={r.country}>
                          {flag(r.cc)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{r.city}</span>
                          <span className="block text-xs text-muted">
                            {r.available ? (r.id === fastest ? "Le plus proche de toi" : r.country) : r.maintenance ? "En maintenance" : "Bientôt disponible"}
                          </span>
                        </span>
                        <span className="flex items-center gap-2 font-mono text-sm tabular-nums" aria-live={r.available ? "polite" : undefined}>
                          <Dot tone={tone} />
                          <span className={r.available && r.measured != null ? "text-foreground" : "text-muted"}>
                            {r.available
                              ? r.measured === undefined
                                ? "mesure…"
                                : r.measured === null
                                  ? "indisponible"
                                  : `${r.measured} ms`
                              : shown != null
                                ? `~${shown} ms`
                                : "inconnue"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-muted">Latence mesurée depuis ton navigateur toutes les 5 s. Les serveurs à venir sont estimés d&apos;après ta position approximative.</p>
            </fieldset>
          ) : (
            <div>
              <dl className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
                {[
                  ["Protocole", protocol.toUpperCase()],
                  ["Appareil", name.trim()],
                  ["Serveur", srv ? `${flag(srv.cc)} ${srv.city} (${srv.id})` : server],
                ].map(([k, v]) => (
                  <div key={k} className="bg-background p-5">
                    <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{k}</dt>
                    <dd className="mt-2 break-words text-base">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {protocol === "rtmp"
                  ? "Ta caméra envoie en RTMP, le relais convertit le flux en SRT : OBS le lit comme un relais SRTLA."
                  : "Ton téléphone envoie en SRTLA sur tous ses réseaux, le relais les recolle et OBS lit le flux en SRT."}
              </p>
              {error && (
                <p role="alert" className="mt-4 text-sm text-red-400">
                  {error}{" "}
                  {error.startsWith("Limite") && (
                    <a href="https://discord.gg/CD68F8yZuZ" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4">
                      Demander plus de relais
                    </a>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
          {created ? (
            <>
              <span />
              <button type="button" onClick={close} className="h-11 whitespace-nowrap rounded-full bg-accent px-6 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98]">
                Terminé
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => (step === 0 ? close() : setStep(step - 1))}
                className="h-11 whitespace-nowrap rounded-full border border-line px-5 text-sm transition-colors hover:bg-foreground/10"
              >
                {step === 0 ? "Annuler" : "Retour"}
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  disabled={!canNext}
                  onClick={() => setStep(step + 1)}
                  className="h-11 whitespace-nowrap rounded-full bg-accent px-6 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Suivant
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={submit}
                  className="h-11 whitespace-nowrap rounded-full bg-accent px-6 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
                >
                  {pending ? "Création…" : "Créer le relais"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

const GUIDES: Record<RelayProtocol, { title: string; steps: string; href: string; link: string }[]> = {
  srtla: [
    { title: "Moblin", steps: "Réglages → Streams → ton stream → URL : colle l'URL Moblin.", href: "/moblin", link: "Guide Moblin" },
    { title: "OBS", steps: "Source média → décocher « Fichier local » → colle l'URL OBS dans Entrée.", href: "/fonctionnement", link: "Le trajet d'un live" },
  ],
  rtmp: [
    { title: "DJI", steps: "DJI Mimo → Diffusion en direct → RTMP : colle le serveur et la clé.", href: "/docs", link: "Documentation" },
    { title: "OBS", steps: "Source média → décocher « Fichier local » → colle l'URL OBS dans Entrée.", href: "/fonctionnement", link: "Le trajet d'un live" },
  ],
};

function Success({ relay }: { relay: RelayView }) {
  return (
    <div className="space-y-8">
      <p className="text-base text-muted">
        <span className="text-foreground">{relay.name}</span> est prêt. Ces URLs contiennent ta clé : ne les montre pas en live.
      </p>
      <RelayUrls relay={relay} />
      <div>
        <h3 className="font-mono text-xs uppercase tracking-[0.15em]">Comment configurer</h3>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {GUIDES[relay.protocol].map((g) => (
            <li key={g.title} className="rounded-2xl border border-line p-5">
              <p className="text-sm font-medium">{g.title}</p>
              <p className="mt-1 text-sm text-muted">{g.steps}</p>
              <Link href={g.href} className="mt-3 inline-flex text-sm text-foreground underline-offset-4 hover:underline">
                {g.link}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
