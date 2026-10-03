"use client";

import { useId, useMemo, useState } from "react";
import { inputCls } from "@/components/auth/ProfileForm";
import { regionList, timezoneFor } from "@/lib/regions";

// Région : liste avec recherche (drapeaux emoji) + fuseau horaire quand le pays en couvre plusieurs.

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const zoneLabel = (tz: string) => tz.split("/").slice(1).join(" / ").replaceAll("_", " ") || tz;

export default function RegionPicker({ country, timezone, required }: { country: string; timezone: string; required?: boolean }) {
  const regions = useMemo(() => regionList(), []);
  const id = useId();
  const [code, setCode] = useState(country);
  const [zone, setZone] = useState(timezone);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const current = regions.find((r) => r.code === code);
  const shown = useMemo(() => {
    const q = norm(query.trim());
    return q ? regions.filter((r) => norm(r.name).includes(q) || r.code.toLowerCase() === q) : regions;
  }, [regions, query]);

  function pick(r: (typeof regions)[number]) {
    setCode(r.code);
    setZone(timezoneFor(r.code, zone) ?? "");
    setQuery("");
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && shown[active]) {
      e.preventDefault();
      pick(shown[active]);
    } else if (e.key === "Escape") setOpen(false);
  }

  const zones = current?.timezones ?? [];

  return (
    <div className="space-y-4">
      <input type="hidden" name="country" value={code} />
      <input type="hidden" name="timezone" value={zone} />
      <div className="space-y-2">
        <label htmlFor={`${id}-q`} className="block text-sm font-medium text-foreground/80">
          Région
        </label>
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl leading-none">
            {current ? current.flag : "🌍"}
          </span>
          <input
            id={`${id}-q`}
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-required={required}
            autoComplete="off"
            value={open ? query : (current?.name ?? "")}
            placeholder="Cherche ton pays"
            onFocus={() => {
              setQuery("");
              setActive(0);
              setOpen(true);
            }}
            onBlur={() => setOpen(false)}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={onKey}
            className={`${inputCls} pl-12`}
          />
          {open && (
            <ul id={`${id}-list`} role="listbox" className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-foreground/20 bg-surface p-1 shadow-lg">
              {shown.length === 0 && <li className="px-3 py-2 text-sm text-foreground/50">Aucun résultat.</li>}
              {shown.map((r, i) => (
                <li
                  key={r.code}
                  role="option"
                  aria-selected={r.code === code}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(r);
                  }}
                  onMouseEnter={() => setActive(i)}
                  ref={(el) => {
                    if (el && i === active) el.scrollIntoView({ block: "nearest" });
                  }}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground ${i === active ? "bg-foreground/[0.08]" : ""}`}
                >
                  <span aria-hidden="true" className="text-xl leading-none">
                    {r.flag}
                  </span>
                  {r.name}
                  {r.code === code && <span className="ml-auto text-xs text-foreground/50">Choisi</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-foreground/45">Sert à afficher l&apos;heure et ton Bonjour dans le dashboard. Modifiable à tout moment.</p>
      </div>

      {zones.length > 1 && (
        <div className="space-y-2">
          <label htmlFor={`${id}-tz`} className="block text-sm font-medium text-foreground/80">
            Fuseau horaire
          </label>
          <select id={`${id}-tz`} value={zone} onChange={(e) => setZone(e.target.value)} className={`${inputCls} appearance-none`}>
            {zones.map((tz) => (
              <option key={tz} value={tz}>
                {zoneLabel(tz)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
