"use client";

import { useEffect, useRef, useState } from "react";

// SYXTEE Cam : qualité du réseau là où tu es (carte communautaire /couverture).
// À l'ouverture : « Zone BONNE / MOYENNE / MAUVAISE » et le meilleur réseau ici, ou « Zone inconnue ».
// Pendant le live : toutes les 10 s, zone actuelle et zone ~300 m devant (direction et vitesse du GPS), alertes brèves.

type Zone = { h3: string; score: "bonne" | "moyenne" | "mauvaise" | "inconnue" | null; best: { operator: string; tech: string; median_kbps: number | null } | null };

const LABEL = { bonne: "BONNE", moyenne: "MOYENNE", mauvaise: "MAUVAISE", inconnue: "INCONNUE" } as const;
const nf = new Intl.NumberFormat("fr-FR");
const bestText = (b: Zone["best"]) => (b ? `${b.operator}${b.tech !== "inconnu" ? ` ${b.tech.toUpperCase()}` : ""}${b.median_kbps ? ` ~${nf.format(Math.round(b.median_kbps / 1000))} Mbit/s` : ""}` : null);

async function zoneAt(lat: number, lng: number): Promise<Zone | null> {
  const r = await fetch(`/api/coverage/at?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}`).catch(() => null);
  return r?.ok ? ((await r.json()) as Zone) : null;
}

/** Point à `m` mètres dans la direction `bearing` (degrés). */
function ahead(lat: number, lng: number, bearing: number, m: number) {
  const R = 6_371_000;
  const r = Math.PI / 180;
  const d = m / R;
  const b = bearing * r;
  const la1 = lat * r;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(b));
  const lo2 = lng * r + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  return [la2 / r, lo2 / r] as const;
}

function bearingOf(a: GeolocationCoordinates, b: GeolocationCoordinates) {
  const r = Math.PI / 180;
  const y = Math.sin((b.longitude - a.longitude) * r) * Math.cos(b.latitude * r);
  const x = Math.cos(a.latitude * r) * Math.sin(b.latitude * r) - Math.sin(a.latitude * r) * Math.cos(b.latitude * r) * Math.cos((b.longitude - a.longitude) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}

export default function ZoneStatus({ live, enabled }: { live: boolean; enabled: boolean }) {
  const [zone, setZone] = useState<Zone | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const pos = useRef<GeolocationPosition | null>(null);
  const prev = useRef<GeolocationPosition | null>(null);
  const warned = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        prev.current = pos.current;
        pos.current = p;
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    let stopped = false;
    let alertTimer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      const p = pos.current;
      if (!p || stopped) return;
      const here = await zoneAt(p.coords.latitude, p.coords.longitude);
      if (stopped || !here) return;
      setZone(here);
      if (!live) return;
      // Direction : cap du GPS, sinon calculée entre les deux dernières positions. Seulement en mouvement (> 1 m/s).
      const speed = p.coords.speed ?? 0;
      const q = prev.current;
      const heading = p.coords.heading ?? (q && q.coords !== p.coords ? bearingOf(q.coords, p.coords) : null);
      if (speed < 1 || heading === null || Number.isNaN(heading)) return;
      const [la, lo] = ahead(p.coords.latitude, p.coords.longitude, heading, 300);
      const next = await zoneAt(la, lo);
      if (stopped || !next || next.h3 === here.h3 || warned.current === next.h3) return;
      let msg: string | null = null;
      if (!next.score) msg = "Tu entres dans une zone non scannée.";
      else if (next.score === "mauvaise") {
        const alt = bestText(next.best);
        msg = `Zone faible dans ~300 m.${alt ? ` ${alt} y passe mieux.` : ""}`;
      }
      if (!msg) return;
      warned.current = next.h3;
      setAlert(msg);
      navigator.vibrate?.(120);
      clearTimeout(alertTimer);
      alertTimer = setTimeout(() => setAlert(null), 8000);
    };
    const first = setTimeout(check, 4000);
    const t = setInterval(check, live ? 10_000 : 60_000);
    return () => {
      stopped = true;
      navigator.geolocation.clearWatch(watch);
      clearTimeout(first);
      clearTimeout(alertTimer);
      clearInterval(t);
    };
  }, [enabled, live]);

  if (!enabled) return null;
  return (
    <div className="pointer-events-none absolute inset-x-3 top-16 z-10 flex flex-col items-center gap-2">
      {alert && (
        <p role="alert" className="pointer-events-auto rounded-xl border border-accent/40 bg-black/85 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md">
          {alert}
        </p>
      )}
      {zone && !live && !hidden && (
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label="Masquer le statut de la zone"
          className="pointer-events-auto max-w-sm rounded-xl border border-accent/25 bg-black/80 px-4 py-2.5 text-left text-xs text-white/80 backdrop-blur-md"
        >
          {zone.score ? (
            <>
              <span className="block font-mono tracking-[0.12em] text-white">ZONE {LABEL[zone.score]}</span>
              {bestText(zone.best) && <span className="block">Meilleur réseau ici : {bestText(zone.best)}</span>}
            </>
          ) : (
            <span>Zone inconnue : lance un scan et fais avancer la carte.</span>
          )}
        </button>
      )}
    </div>
  );
}
