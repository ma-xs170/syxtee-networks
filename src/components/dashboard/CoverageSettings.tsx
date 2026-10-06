"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { addPrivateZone, deletePrivateZone, eraseCoverage, setCoverageConsent, type CoverageState } from "@/app/(dashboard)/dashboard/parametres/actions";
import { inputCls } from "@/components/auth/ProfileForm";

// Paramètres → Carte de couverture : consentement (décoché par défaut) et 1 à 3 zones privées.

export type PrivateZone = { id: string; label: string; lat: number; lng: number; radius_m: number };

export function ConsentToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={on}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setOn(next);
            start(async () => {
              const r = await setCoverageConsent(next);
              if (r.error) {
                setOn(!next);
                setError(r.error);
              } else setError(null);
            });
          }}
          className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
        />
        <span className="text-sm leading-relaxed text-foreground">Partager anonymement mes mesures de réseau pour la carte communautaire</span>
      </label>
      <p className="mt-2 pl-8 text-sm leading-relaxed text-muted">
        Position, débit, latence, opérateur et type de réseau (4G/5G ou Wi-Fi), sans ton nom ni ton compte. Jamais dans tes zones privées ; la position
        exacte des 60 premières secondes d&apos;une session n&apos;est jamais publiée. Gardé 90 jours.{" "}
        <Link href="/confidentialite#couverture" className="text-foreground underline underline-offset-4">
          En savoir plus
        </Link>
      </p>
      {error && (
        <p role="alert" className="mt-2 pl-8 text-sm text-red-400/90">
          {error}
        </p>
      )}
    </div>
  );
}

export function PrivateZones({ zones }: { zones: PrivateZone[] }) {
  const [state, action, pending] = useActionState<CoverageState, FormData>(addPrivateZone, {});
  const [pos, setPos] = useState<{ lat: string; lng: string }>({ lat: "", lng: "" });
  const [geoError, setGeoError] = useState<string | null>(null);
  const [removing, startRemove] = useTransition();

  const locate = () => {
    setGeoError(null);
    if (!navigator.geolocation) return setGeoError("Géolocalisation indisponible sur ce navigateur.");
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude.toFixed(5), lng: p.coords.longitude.toFixed(5) }),
      () => setGeoError("Position refusée ou introuvable."),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  return (
    <div>
      {zones.length > 0 && (
        <ul className="mb-5 divide-y divide-foreground/10 rounded-xl border border-line">
          {zones.map((z) => (
            <li key={z.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="min-w-0">
                <span className="block truncate text-sm text-foreground">{z.label}</span>
                <span data-sensitive className="block font-mono text-xs text-muted">
                  {z.lat.toFixed(3)}, {z.lng.toFixed(3)} · {z.radius_m} m
                </span>
              </span>
              <button
                type="button"
                disabled={removing}
                onClick={() => startRemove(async () => void (await deletePrivateZone(z.id)))}
                className="shrink-0 text-sm text-muted hover:text-foreground disabled:opacity-50"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
      {zones.length < 3 ? (
        <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <label htmlFor="zone-label" className="text-sm text-foreground">
              Nom
            </label>
            <input id="zone-label" name="label" required maxLength={40} placeholder="Domicile" className={inputCls} />
          </div>
          <div className="grid gap-2">
            <label htmlFor="zone-lat" className="text-sm text-foreground">
              Latitude
            </label>
            <input id="zone-lat" name="lat" required inputMode="decimal" value={pos.lat} onChange={(e) => setPos({ ...pos, lat: e.target.value })} className={inputCls} />
          </div>
          <div className="grid gap-2">
            <label htmlFor="zone-lng" className="text-sm text-foreground">
              Longitude
            </label>
            <input id="zone-lng" name="lng" required inputMode="decimal" value={pos.lng} onChange={(e) => setPos({ ...pos, lng: e.target.value })} className={inputCls} />
          </div>
          <div className="grid gap-2">
            <label htmlFor="zone-radius" className="text-sm text-foreground">
              Rayon
            </label>
            <select id="zone-radius" name="radius_m" defaultValue="300" className={inputCls}>
              {[100, 300, 500, 1000, 2000].map((r) => (
                <option key={r} value={r}>
                  {r < 1000 ? `${r} m` : `${r / 1000} km`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={locate} className="h-12 w-full rounded-xl border border-line px-4 text-sm text-muted transition-colors hover:bg-foreground/10 hover:text-foreground">
              Utiliser ma position
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <button type="submit" disabled={pending} className="h-11 rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60">
              {pending ? "Un instant…" : "Ajouter la zone"}
            </button>
            {(state.error || geoError) && (
              <p role="alert" className="text-sm text-red-400/90">
                {state.error ?? geoError}
              </p>
            )}
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted">3 zones au plus. Supprime-en une pour en ajouter une autre.</p>
      )}
    </div>
  );
}

/** Effacement de toutes mes mesures, avec confirmation. */
export function EraseCoverage() {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<CoverageState>({});
  if (msg.ok) return <p className="text-sm text-muted">Tes mesures ont été supprimées.</p>;
  return confirm ? (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setMsg(await eraseCoverage()))}
        className="h-11 rounded-full border border-red-400/40 px-5 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-60"
      >
        {pending ? "Un instant…" : "Confirmer la suppression"}
      </button>
      <button type="button" onClick={() => setConfirm(false)} className="h-11 px-4 text-sm text-muted hover:text-foreground">
        Annuler
      </button>
      {msg.error && (
        <p role="alert" className="text-sm text-red-400/90">
          {msg.error}
        </p>
      )}
    </div>
  ) : (
    <button type="button" onClick={() => setConfirm(true)} className="text-sm text-muted underline underline-offset-4 hover:text-foreground">
      Supprimer toutes mes mesures
    </button>
  );
}
